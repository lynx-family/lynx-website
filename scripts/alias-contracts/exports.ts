/** Static ESM export identities, including re-export chains and star collisions. */
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { canonical, parseScript } from './corpus.js';
import type { RuntimeEnvironment } from './runtime.js';

export interface StaticExport {
  identity: string;
  value: boolean;
}
export interface ExportSurface {
  names: Map<string, StaticExport>;
  errors: string[];
}

export function createExportReader(
  runtime: RuntimeEnvironment,
  options: ts.CompilerOptions = {},
  host: ts.ModuleResolutionHost = ts.sys,
) {
  const cache = new Map<string, ExportSurface>();
  let previous = new Map<string, ExportSurface>();
  let cyclic = false;
  const read = async (
    file: string,
    ancestors = new Set<string>(),
  ): Promise<ExportSurface> => {
    file = canonical(file.split('?')[0]!);
    if (ancestors.has(file)) {
      cyclic = true;
      return { names: previous.get(file)?.names ?? new Map(), errors: [] };
    }
    const cached = cache.get(file);
    if (cached) return cached;
    const surface: ExportSurface = { names: new Map(), errors: [] };
    // Assets and MDX have loader-provided default exports.
    if (!/\.[cm]?[jt]sx?$/.test(file)) {
      surface.names.set('default', { identity: file, value: true });
      return surface;
    }
    const content = readFileSync(file, 'utf8');
    parseScript(file, content);
    const tree = ts.createSourceFile(
      file,
      content,
      ts.ScriptTarget.Latest,
      true,
    );
    tree.impliedNodeFormat = ts.getImpliedNodeFormatForFile(
      file,
      undefined,
      host,
      options,
    );
    let namespaceChecker: ts.TypeChecker | undefined;
    const namespaceValue = (node: ts.ModuleDeclaration) => {
      // The binder distinguishes erased and instantiated namespaces, including
      // nested and merged declarations. No dependency traversal is needed.
      namespaceChecker ??= ts
        .createProgram(
          [file],
          { ...options, noResolve: true, noLib: true },
          {
            ...ts.createCompilerHost(options),
            getSourceFile: (name) => (name === file ? tree : undefined),
          },
        )
        .getTypeChecker();
      return !!(
        (namespaceChecker.getSymbolAtLocation(node.name)?.flags ?? 0) &
        ts.SymbolFlags.Value
      );
    };
    const runtimeValue = (node: ts.Node): boolean =>
      !tree.isDeclarationFile &&
      !ts.isInterfaceDeclaration(node) &&
      !ts.isTypeAliasDeclaration(node) &&
      !(ts.isFunctionDeclaration(node) && !node.body) &&
      !(
        ts.canHaveModifiers(node) &&
        ts
          .getModifiers(node)
          ?.some((modifier) => modifier.kind === ts.SyntaxKind.DeclareKeyword)
      ) &&
      (!ts.isModuleDeclaration(node) || namespaceValue(node));
    const stack = new Set([...ancestors, file]);
    const imports = new Map<string, StaticExport | undefined>();
    const locals = new Map<string, StaticExport>();
    const bindingNames = (name: ts.BindingName): string[] =>
      ts.isIdentifier(name)
        ? [name.text]
        : name.elements.flatMap((element) =>
            ts.isBindingElement(element) ? bindingNames(element.name) : [],
          );
    for (const node of tree.statements) {
      const name = (node as ts.DeclarationStatement).name;
      const names = ts.isVariableStatement(node)
        ? node.declarationList.declarations.flatMap((entry) =>
            bindingNames(entry.name),
          )
        : name && ts.isIdentifier(name)
          ? [name.text]
          : [];
      for (const name of names) {
        const old = locals.get(name);
        locals.set(name, {
          identity: `${file}#${name}`,
          value: !!old?.value || runtimeValue(node),
        });
      }
    }
    const forwardedNames = new Set(
      tree.statements.flatMap((node) =>
        ts.isExportAssignment(node) && ts.isIdentifier(node.expression)
          ? [node.expression.text]
          : ts.isExportDeclaration(node) &&
              !node.moduleSpecifier &&
              node.exportClause &&
              ts.isNamedExports(node.exportClause)
            ? node.exportClause.elements.map(
                (entry) => (entry.propertyName ?? entry.name).text,
              )
            : [],
      ),
    );
    const explicitNames = new Set(
      tree.statements.flatMap((node) => {
        if (ts.isExportDeclaration(node) && node.exportClause)
          return ts.isNamedExports(node.exportClause)
            ? node.exportClause.elements.map((entry) => entry.name.text)
            : [node.exportClause.name.text];
        if (ts.isExportAssignment(node)) return ['default'];
        const modifiers = ts.canHaveModifiers(node)
          ? ts.getModifiers(node)
          : undefined;
        if (
          !modifiers?.some(
            (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
          )
        )
          return [];
        if (
          modifiers.some(
            (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword,
          )
        )
          return ['default'];
        if (ts.isVariableStatement(node))
          return node.declarationList.declarations.flatMap((entry) =>
            bindingNames(entry.name),
          );
        const name = (node as ts.DeclarationStatement).name;
        return name && ts.isIdentifier(name) ? [name.text] : [];
      }),
    );
    const merge = (name: string, entry: StaticExport) => {
      const old = surface.names.get(name);
      if (old && old.identity !== entry.identity)
        surface.errors.push(`${file}: export collision '${name}'`);
      else
        surface.names.set(name, {
          ...entry,
          value: !!old?.value || entry.value,
        });
    };
    const target = async (literal: ts.StringLiteralLike, typeOnly = false) => {
      const request = literal.text;
      const resolved =
        typeOnly || tree.isDeclarationFile
          ? ts.resolveModuleName(
              request,
              file,
              options,
              host,
              undefined,
              undefined,
              ts.getModeForUsageLocation(tree, literal, options),
            ).resolvedModule?.resolvedFileName
          : await runtime.resolve(file, request);
      if (!resolved) {
        surface.errors.push(`${file}: unresolved re-export '${request}'`);
        return undefined;
      }
      const exports = await read(resolved, stack);
      surface.errors.push(...exports.errors);
      return { ...exports, file: canonical(resolved.split('?')[0]!) };
    };
    for (const node of tree.statements) {
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteralLike(node.moduleSpecifier) &&
        node.importClause
      ) {
        const clause = node.importClause;
        // Only imports forwarded by the barrel need traversal.
        const forwarded =
          (clause.name && forwardedNames.has(clause.name.text)) ||
          (clause.namedBindings &&
            (ts.isNamespaceImport(clause.namedBindings)
              ? forwardedNames.has(clause.namedBindings.name.text)
              : clause.namedBindings.elements.some((entry) =>
                  forwardedNames.has(entry.name.text),
                )));
        if (!forwarded) continue;
        const literal = node.moduleSpecifier;
        const targets = new Map<boolean, Awaited<ReturnType<typeof target>>>();
        const imported = async (typeOnly: boolean) => {
          if (!targets.has(typeOnly))
            targets.set(typeOnly, await target(literal, typeOnly));
          return targets.get(typeOnly);
        };
        const bind = async (local: string, name: string, typeOnly: boolean) => {
          const exports = await imported(typeOnly);
          const original = exports?.names.get(name);
          if (exports && !original)
            surface.errors.push(`${file}: missing forwarded export '${name}'`);
          imports.set(
            local,
            original && { ...original, value: original.value && !typeOnly },
          );
        };
        if (clause.name && forwardedNames.has(clause.name.text))
          await bind(clause.name.text, 'default', clause.isTypeOnly);
        if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
          for (const entry of clause.namedBindings.elements) {
            if (!forwardedNames.has(entry.name.text)) continue;
            await bind(
              entry.name.text,
              (entry.propertyName ?? entry.name).text,
              clause.isTypeOnly || entry.isTypeOnly,
            );
          }
        } else if (
          clause.namedBindings &&
          ts.isNamespaceImport(clause.namedBindings)
        ) {
          const exports = await imported(clause.isTypeOnly);
          imports.set(
            clause.namedBindings.name.text,
            exports && {
              identity: `${exports.file}#namespace`,
              value: !clause.isTypeOnly,
            },
          );
        }
      }
    }
    for (const node of tree.statements) {
      if (ts.isExportDeclaration(node)) {
        const literal =
          node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)
            ? node.moduleSpecifier
            : undefined;
        if (!node.exportClause) {
          const exports = literal
            ? await target(literal, node.isTypeOnly)
            : undefined;
          for (const [name, entry] of exports?.names ?? [])
            if (name !== 'default' && !explicitNames.has(name))
              merge(name, { ...entry, value: entry.value && !node.isTypeOnly });
        } else if (ts.isNamedExports(node.exportClause)) {
          for (const entry of node.exportClause.elements) {
            const local = (entry.propertyName ?? entry.name).text;
            const original = literal
              ? (
                  await target(literal, node.isTypeOnly || entry.isTypeOnly)
                )?.names.get(local)
              : (imports.get(local) ?? locals.get(local));
            if (!original)
              surface.errors.push(`${file}: missing re-export '${local}'`);
            else
              merge(entry.name.text, {
                ...original,
                value: original.value && !node.isTypeOnly && !entry.isTypeOnly,
              });
          }
        } else {
          const exports = literal
            ? await target(literal, node.isTypeOnly)
            : undefined;
          if (exports)
            merge(node.exportClause.name.text, {
              identity: `${exports.file}#namespace`,
              value: !node.isTypeOnly,
            });
        }
      } else if (ts.isExportAssignment(node)) {
        if (node.isExportEquals)
          surface.errors.push(`${file}: unsupported CommonJS export surface`);
        else {
          const fallback = { identity: `${file}#default`, value: true };
          const original = ts.isIdentifier(node.expression)
            ? imports.has(node.expression.text)
              ? imports.get(node.expression.text)
              : (locals.get(node.expression.text) ?? fallback)
            : fallback;
          if (original) merge('default', original);
        }
      } else {
        const modifiers = ts.canHaveModifiers(node)
          ? ts.getModifiers(node)
          : undefined;
        if (
          !modifiers?.some(
            (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
          )
        )
          continue;
        const isDefault = modifiers.some(
          (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword,
        );
        if (ts.isVariableStatement(node)) {
          for (const declaration of node.declarationList.declarations)
            for (const name of bindingNames(declaration.name))
              merge(name, locals.get(name)!);
        } else {
          const name = (node as ts.DeclarationStatement).name;
          if (isDefault || (name && ts.isIdentifier(name))) {
            const local = name && ts.isIdentifier(name) ? name.text : 'default';
            merge(isDefault ? 'default' : local, {
              identity: `${file}#${local}`,
              value: runtimeValue(node),
            });
          }
        }
      }
    }
    surface.errors = [...new Set(surface.errors)].sort();
    cache.set(file, surface);
    return surface;
  };
  const signature = (surfaces: Map<string, ExportSurface>) =>
    JSON.stringify(
      [...surfaces]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([file, surface]) => [
          file,
          [...surface.names].sort(([a], [b]) => a.localeCompare(b)),
          surface.errors,
        ]),
    );
  return async (file: string): Promise<ExportSurface> => {
    cyclic = false;
    let result = await read(file);
    if (!cyclic) return result;
    // Revisit cyclic graphs until every reachable barrel has a complete surface.
    // Partial ancestor results are never exposed to wrapper comparisons.
    let before: string;
    do {
      previous = new Map(cache);
      before = signature(previous);
      cache.clear();
      result = await read(file);
    } while (signature(cache) !== before);
    previous.clear();
    return result;
  };
}
