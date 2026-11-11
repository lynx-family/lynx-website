/**
 * Gate 2: actual Rspress/Rspack and TypeScript probes over the shared corpus.
 * Canonical spelling and import migration baselines deliberately belong to Gate 3.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  loadContracts,
  parseArguments,
  type ActiveContracts,
} from './check-registry.js';
import {
  aliasAllowsImporter,
  canonical,
  classifySource,
  discoverCorpus,
  matchingAlias,
  resolvedResource,
  resourcePath,
  type ImportRecord,
} from './corpus.js';
import { createExportReader } from './exports.js';
import { createRuntime, type Runtime, type RuntimeAliases } from './runtime.js';
import type { AliasContract, SourceArea } from './types.js';

const isDeclarationFile = (file: string) => /\.d\.[cm]?ts$/.test(file);

function keyErrors(
  bindings: RuntimeAliases,
  contracts: ActiveContracts,
  typescript = false,
): string[] {
  const errors: string[] = [];
  for (const [key, value] of Object.entries(bindings)) {
    const specifier = typescript
      ? key.replace(/\/\*$/, '')
      : key.replace(/\$$/, '');
    const alias = contracts.aliases.find(
      (alias) => alias.specifier === specifier,
    );
    const override = contracts.resolverOverrides.find(
      (override) => override.specifier === specifier,
    );
    if (!alias && !override) {
      errors.push(
        `unaccounted ${typescript ? 'TypeScript' : 'runtime'} resolver key '${key}'`,
      );
      continue;
    }
    if (override) {
      if (typescript || key !== `${specifier}$`)
        errors.push(`override '${key}' must be runtime-only and exact`);
      continue;
    }
    if (/\\|\s/.test(key) || (typescript ? /\$/.test(key) : /\*/.test(key)))
      errors.push(`malformed resolver key '${key}'`);
    if (
      alias!.kind === 'exact' &&
      (typescript ? key.endsWith('/*') : !key.endsWith('$'))
    )
      errors.push(`exact alias '${key}' must use exact matching`);
    if (alias!.kind === 'subpaths-only' && !typescript && key.endsWith('$'))
      errors.push(`subpaths-only alias '${key}' has a bare-only binding`);
    if (
      !alias!.allowMultipleResolverRoots &&
      Array.isArray(value) &&
      value.length > 1
    )
      errors.push(
        `alias '${key}' does not support ordered multiple resolver roots`,
      );
  }
  return errors;
}

function importErrors(
  alias: AliasContract,
  bare: boolean,
  importerOwner?: ImportRecord['owner'],
): string[] {
  const errors: string[] = [];
  if (importerOwner && !aliasAllowsImporter(alias, importerOwner))
    errors.push(`importer owner '${importerOwner}' is not allowed`);
  if (bare && alias.kind === 'subpaths-only')
    errors.push('unsupported bare import');
  if (!bare && alias.kind === 'exact')
    errors.push('unsupported direct subpath');
  return errors;
}

export function targetErrors(
  alias: AliasContract,
  bare: boolean | 'namespace',
  area: SourceArea | undefined,
): string[] {
  const errors: string[] = [];
  if (!area) return ['target has no declared source area'];
  const sources = alias.implementationSources;
  if (
    !sources.requiredAreas.includes(area.id) &&
    !sources.additionalOwners.some((owner) => owner === area.owner)
  )
    errors.push(`target source area '${area.id}' is not permitted`);
  const owners =
    bare === 'namespace'
      ? [
          ...(alias.bareTargetOwners ?? []),
          ...(alias.subpaths?.targetOwners ?? []),
        ]
      : bare
        ? alias.bareTargetOwners
        : alias.subpaths?.targetOwners;
  if (!owners?.some((owner) => owner === area.owner))
    errors.push(
      `target owner '${area.owner}' is not allowed for ${bare === 'namespace' ? 'namespace settings' : bare ? 'bare imports' : 'subpath imports'}`,
    );
  if (alias.visibility === 'owner-private' && area.owner !== alias.owner)
    errors.push(`private target must belong to '${alias.owner}'`);
  return errors;
}

export function readTsConfig(cwd: string) {
  const file = path.join(cwd, 'tsconfig.json');
  const config = ts.readConfigFile(file, ts.sys.readFile);
  if (config.error)
    throw new Error(
      ts.flattenDiagnosticMessageText(config.error.messageText, '\n'),
    );
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, cwd);
  // Empty synthetic include is permitted; invalid compiler options are not.
  const errors = parsed.errors.filter((error) => error.code !== 18003);
  if (errors.length)
    throw new Error(
      ts.flattenDiagnosticMessageText(errors[0]!.messageText, '\n'),
    );
  return parsed;
}

/**
 * Apply one validated contract set to the shared corpus. Runtime probes use
 * each active Rspress environment; neighboring virtual TypeScript modules
 * preserve importer mode, attributes, and value/type/namespace capabilities.
 */
export async function checkResolution(
  cwd: string,
  contracts: ActiveContracts,
  corpus: readonly ImportRecord[],
  runtime: Runtime,
): Promise<{ errors: string[]; probes: number }> {
  const errors = keyErrors(runtime.explicitAliases, contracts);
  for (const environment of runtime.environments) {
    const governed = Object.fromEntries(
      Object.entries(environment.aliases).filter(([key]) =>
        contracts.aliases.some(
          (alias) => alias.specifier === key.replace(/\$$/, ''),
        ),
      ),
    );
    errors.push(
      ...keyErrors(governed, contracts).map(
        (error) => `[${environment.name}]: ${error}`,
      ),
    );
  }
  const config = readTsConfig(cwd);
  errors.push(
    ...keyErrors(
      (config.options.paths as RuntimeAliases) ?? {},
      contracts,
      true,
    ),
  );
  const report = (record: ImportRecord, environment: string, message: string) =>
    errors.push(
      `${record.importer}:${record.line} ${record.specifier} [${environment}]: ${message}`,
    );
  const records = corpus.filter(
    (record) =>
      record.kind !== 'configuration' &&
      matchingAlias(record.specifier, contracts.aliases),
  );
  const resolutions: {
    record: ImportRecord;
    environment: Runtime['environments'][number];
    target?: string;
  }[] = [];
  for (const record of records) {
    const request = record.specifier;
    const alias = matchingAlias(request, contracts.aliases)!;
    for (const error of importErrors(
      alias,
      resourcePath(request) === alias.specifier,
      record.owner,
    ))
      report(record, 'contract', error);
    if (record.kind === 'require') {
      report(
        record,
        'contract',
        'unsupported alias-bearing CommonJS request; use ESM imports',
      );
      continue;
    }
    if (
      record.bindings.length &&
      record.bindings.every((binding) => binding.typeOnly)
    )
      continue;
    for (const environment of runtime.environments) {
      const resolved = await environment.resolve(record.importer, request);
      const target = resolved ? resolvedResource(request, resolved) : undefined;
      resolutions.push({
        record,
        environment,
        ...(target ? { target } : {}),
      });
      if (!target) {
        report(record, environment.name, 'runtime resolution failed');
        continue;
      }
      if (isDeclarationFile(target))
        report(
          record,
          environment.name,
          'runtime target is a declaration file',
        );
      const area = classifySource(target, cwd, contracts.sourceAreas);
      for (const error of targetErrors(
        alias,
        resourcePath(request) === alias.specifier,
        area,
      ))
        report(record, environment.name, error);
    }
  }

  // Virtual modules remain next to their importer, retaining real TS resolution
  // context. The compiler sees ambient declarations and resolved implementations.
  const virtual = new Map<string, string>();
  const probeFiles = new Map<ImportRecord, string>();
  records
    .filter((record) => record.kind !== 'require')
    .forEach((record, index) => {
      const file = path.resolve(
        cwd,
        path.dirname(record.importer),
        `.__alias_probe_${index}${
          /\.[cm][jt]s$/.test(record.importer)
            ? /\.[m][jt]s$/.test(record.importer)
              ? '.mts'
              : '.cts'
            : '.ts'
        }`,
      );
      virtual.set(
        file,
        record.kind === 'dynamic'
          ? `const probe = import(${JSON.stringify(record.specifier)}); export {};`
          : record.kind === 'export-star'
            ? `export ${record.bindings.every((binding) => binding.typeOnly) ? 'type ' : ''}* from ${JSON.stringify(record.specifier)} ${record.attributes ?? ''};`
            : record.bindings.length
              ? record.bindings
                  .map(
                    (binding, index) =>
                      `import ${binding.typeOnly ? 'type ' : ''}${
                        binding.name === '*'
                          ? `* as probe${index}`
                          : binding.name === 'default'
                            ? `probe${index}`
                            : `{ ${JSON.stringify(binding.name)} as probe${index} }`
                      } from ${JSON.stringify(record.specifier)} ${record.attributes ?? ''};`,
                  )
                  .join('\n')
              : `${record.kind === 'export' ? 'export {} from' : 'import'} ${JSON.stringify(record.specifier)} ${record.attributes ?? ''};`,
      );
      probeFiles.set(record, file);
    });
  const options = {
    ...config.options,
    allowJs: true,
    noEmit: true,
    noUnusedLocals: false,
  };
  const host = ts.createCompilerHost(options);
  const originalRead = host.readFile.bind(host);
  const originalExists = host.fileExists.bind(host);
  host.readFile = (file) => virtual.get(file) ?? originalRead(file);
  host.fileExists = (file) => virtual.has(file) || originalExists(file);
  const bareImporter = path.join(cwd, 'rspress.config.ts');
  const resolveBare = (request: string) =>
    ts.resolveModuleName(
      request,
      bareImporter,
      options,
      host,
      undefined,
      undefined,
      ts.getImpliedNodeFormatForFile(bareImporter, undefined, host, options),
    ).resolvedModule?.resolvedFileName;
  const bareEntries = contracts.aliases
    .filter(
      (alias) =>
        'mayExtendBare' in alias.downstream && alias.downstream.mayExtendBare,
    )
    .map((alias) => ({
      alias,
      target: resolveBare(alias.specifier),
      originals: alias.implementationSources.requiredAreas
        .map((id) => contracts.sourceAreas.find((area) => area.id === id)!)
        .filter((area) => area.owner === alias.owner)
        .map((area) => resolveBare(path.resolve(cwd, area.root))),
    }));
  const program = ts.createProgram(
    [
      // Preserve the caller's ambient declarations. Unrelated implementation
      // files are not probe roots; TS follows imports needed by each probe.
      ...config.fileNames.filter(isDeclarationFile),
      ...virtual.keys(),
      ...bareEntries
        .flatMap((entry) => [entry.target, ...entry.originals])
        .filter((file): file is string => !!file),
      ...resolutions
        .map((result) => result.target)
        .filter(
          (file): file is string => !!file && /\.[cm]?[jt]sx?$/.test(file),
        ),
    ],
    options,
    host,
  );
  const checker = program.getTypeChecker();
  const symbolFlags = (entry: ts.Symbol) =>
    (entry.flags & ts.SymbolFlags.Alias
      ? checker.getAliasedSymbol(entry)
      : entry
    ).flags;
  const exportsAt = (node: ts.Node | undefined) => {
    const symbol = node && checker.getSymbolAtLocation(node);
    return new Map(
      symbol
        ? checker.getExportsOfModule(symbol).map((entry) => [entry.name, entry])
        : [],
    );
  };
  const moduleSpecifiers = new Map<ImportRecord, ts.StringLiteralLike>();
  for (const [record, probe] of probeFiles) {
    const tree = program.getSourceFile(probe)!;
    const moduleSpecifier =
      record.kind === 'dynamic'
        ? ((
            (tree.statements[0] as ts.VariableStatement).declarationList
              .declarations[0]!.initializer as ts.CallExpression
          ).arguments[0] as ts.StringLiteralLike)
        : ((tree.statements[0] as ts.ImportDeclaration | ts.ExportDeclaration)
            .moduleSpecifier as ts.StringLiteralLike);
    moduleSpecifiers.set(record, moduleSpecifier);
  }
  // Aliased symbol flags alone discard `export type` / `import type` edges.
  // Verbatim imports ask the compiler which exports require `import type`,
  // on both sides of the contract, without changing the caller's diagnostics.
  const valueProbes = new Map<
    string | ImportRecord,
    { file: string; names: string[] }
  >();
  const addValueProbe = (
    key: string | ImportRecord,
    file: string,
    request: string,
    exports: Map<string, ts.Symbol>,
    attributes = '',
  ) => {
    const names = [...exports.values()]
      .filter((symbol) => symbolFlags(symbol) & ts.SymbolFlags.Value)
      .map((symbol) => symbol.name);
    virtual.set(
      file,
      names
        .map(
          (name, index) =>
            `import { ${JSON.stringify(name)} as value${index} } from ${JSON.stringify(request)} ${attributes};`,
        )
        .join('\n'),
    );
    valueProbes.set(key, { file, names });
  };
  for (const entry of bareEntries) {
    for (const file of [entry.target, ...entry.originals]) {
      if (!file || valueProbes.has(file)) continue;
      addValueProbe(
        file,
        `${file}.__alias_values.mts`,
        file,
        exportsAt(program.getSourceFile(file)),
      );
    }
  }
  for (const [record, moduleSpecifier] of moduleSpecifiers) {
    if (
      !record.bindings.some(
        (binding) => binding.name === '*' && !binding.typeOnly,
      )
    )
      continue;
    // Keep importer-relative and conditional resolution. Dynamic import always
    // uses ESM mode, even when the original importer is CommonJS.
    const probe = probeFiles.get(record)!;
    const extension = record.kind === 'dynamic' ? '.mts' : path.extname(probe);
    addValueProbe(
      record,
      `${probe}.__alias_values${extension}`,
      record.specifier,
      exportsAt(moduleSpecifier),
      record.attributes,
    );
  }
  const valueProgram = ts.createProgram(
    [...program.getRootFileNames(), ...virtual.keys()],
    {
      ...options,
      allowImportingTsExtensions: true,
      verbatimModuleSyntax: true,
    },
    host,
    program,
  );
  const valuesAt = new Map<string | ImportRecord, Set<string>>();
  for (const [file, probe] of valueProbes) {
    const tree = valueProgram.getSourceFile(probe.file)!;
    const diagnostics = valueProgram.getSemanticDiagnostics(tree);
    valuesAt.set(
      file,
      new Set(
        probe.names.filter((_, index) => {
          const binding = (tree.statements[index] as ts.ImportDeclaration)
            .importClause!;
          return !diagnostics.some(
            (diagnostic) =>
              // Other diagnostics (e.g. CJS/verbatim syntax) do not mean
              // that a declared runtime value was erased by a type-only edge.
              (diagnostic.code === 1484 || diagnostic.code === 1485) &&
              diagnostic.start !== undefined &&
              diagnostic.start >= binding.getStart(tree) &&
              diagnostic.start < binding.end,
          );
        }),
      ),
    );
  }
  for (const { alias, target, originals } of bareEntries) {
    if (!target) {
      errors.push(
        `${alias.specifier} [typescript]: bare entry does not resolve`,
      );
      continue;
    }
    for (const error of targetErrors(
      alias,
      true,
      classifySource(target, cwd, contracts.sourceAreas),
    ))
      errors.push(`${alias.specifier} [typescript]: ${error}`);
    const actual = exportsAt(program.getSourceFile(target));
    for (const original of originals) {
      if (!original) {
        errors.push(
          `${alias.specifier} [typescript]: OSS bare entry does not resolve`,
        );
        continue;
      }
      for (const [name, expected] of exportsAt(
        program.getSourceFile(original),
      )) {
        const replacement = actual.get(name);
        // Preserve each export's capabilities, not its declaration syntax.
        if (
          !replacement ||
          (valuesAt.get(original)?.has(name) &&
            !valuesAt.get(target)?.has(name)) ||
          [ts.SymbolFlags.Type, ts.SymbolFlags.Namespace].some(
            (capability) =>
              !!(symbolFlags(expected) & capability) &&
              !(symbolFlags(replacement) & capability),
          )
        )
          errors.push(
            `${alias.specifier}: TypeScript bare entry must preserve OSS export '${name}'`,
          );
      }
    }
  }
  for (const record of records) {
    const probe = probeFiles.get(record);
    if (!probe) continue;
    const tree = program.getSourceFile(probe)!;
    const moduleSpecifier = moduleSpecifiers.get(record)!;
    for (const diagnostic of program.getSemanticDiagnostics(tree))
      report(
        record,
        'typescript',
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      );
    const resolvedModule = ts.resolveModuleName(
      record.specifier,
      probe,
      options,
      host,
      undefined,
      undefined,
      ts.getModeForUsageLocation(tree, moduleSpecifier, options),
    ).resolvedModule;
    if (
      resolvedModule &&
      (!isDeclarationFile(resolvedModule.resolvedFileName) ||
        (record.bindings.length > 0 &&
          record.bindings.every((binding) => binding.typeOnly)))
    ) {
      const area = classifySource(
        resolvedModule.resolvedFileName,
        cwd,
        contracts.sourceAreas,
      );
      const alias = matchingAlias(record.specifier, contracts.aliases)!;
      for (const error of targetErrors(
        alias,
        resourcePath(record.specifier) === alias.specifier,
        area,
      ))
        report(record, 'typescript', error);
    }
    const symbol = checker.getSymbolAtLocation(moduleSpecifier);
    if (!symbol) {
      if (!resolvedModule)
        report(record, 'typescript', 'no module or ambient declaration');
      continue;
    }
    const exports = exportsAt(moduleSpecifier);
    for (const binding of record.bindings) {
      // Synthetic defaults (JSON/CJS) are validated by the actual import above.
      if (binding.name === '*' || binding.name === 'default') continue;
      const entry = exports.get(binding.name);
      if (!entry) {
        report(record, 'typescript', `missing export '${binding.name}'`);
        continue;
      }
      if (!binding.typeOnly && !(symbolFlags(entry) & ts.SymbolFlags.Value))
        report(record, 'typescript', `export '${binding.name}' has no value`);
    }
  }

  for (const environment of runtime.environments) {
    const readExports = createExportReader(environment, options, host);
    for (const result of resolutions.filter(
      (result) => result.environment === environment,
    )) {
      const { record, target } = result;
      if (!target || record.bindings.every((binding) => binding.typeOnly))
        continue;
      const surface = await readExports(target);
      for (const error of surface.errors)
        report(record, environment.name, error);
      const implementationTree = program.getSourceFile(target);
      const implementationExports = exportsAt(implementationTree);
      const probeTree = program.getSourceFile(probeFiles.get(record) ?? '');
      const declarationExports = exportsAt(moduleSpecifiers.get(record));
      const valueBindings = record.bindings.flatMap((binding) =>
        binding.name === '*' && !binding.typeOnly
          ? [...declarationExports.values()]
              .filter((entry) => {
                if (record.kind === 'export-star' && entry.name === 'default')
                  return false;
                return valuesAt.get(record)?.has(entry.name);
              })
              .map((entry) => ({ name: entry.name, typeOnly: false }))
          : [binding],
      );
      for (const binding of valueBindings) {
        if (binding.typeOnly) continue;
        if (!surface.names.get(binding.name)?.value)
          report(
            record,
            environment.name,
            `missing runtime value '${binding.name}'`,
          );
        const implementation = implementationExports.get(binding.name);
        const declaration = declarationExports.get(binding.name);
        if (
          implementation &&
          declaration &&
          implementationTree &&
          probeTree &&
          !checker.isTypeAssignableTo(
            checker.getTypeOfSymbolAtLocation(
              implementation,
              implementationTree,
            ),
            checker.getTypeOfSymbolAtLocation(declaration, probeTree),
          )
        )
          report(
            record,
            environment.name,
            `runtime export '${binding.name}' is incompatible with its TypeScript declaration`,
          );
      }
    }
    // Check bare wrappers even when only direct subpaths appear in the corpus.
    for (const alias of contracts.aliases) {
      if (alias.kind === 'subpaths-only') continue;
      const importer = path.join(cwd, 'rspress.config.ts');
      const target = await environment.resolve(importer, alias.specifier);
      if (!target) {
        if (alias.downstream.implementation === 'required')
          errors.push(
            `${alias.specifier} [${environment.name}]: required bare entry does not resolve`,
          );
        continue;
      }
      if (isDeclarationFile(target))
        errors.push(
          `${alias.specifier} [${environment.name}]: runtime target is a declaration file`,
        );
      const area = classifySource(target, cwd, contracts.sourceAreas);
      for (const error of targetErrors(alias, true, area))
        errors.push(`${alias.specifier} [${environment.name}]: ${error}`);
      if (
        area?.owner !== 'consumer' ||
        !('mayExtendBare' in alias.downstream) ||
        !alias.downstream.mayExtendBare
      )
        continue;
      const actual = await readExports(target);
      errors.push(...actual.errors);
      for (const id of alias.implementationSources.requiredAreas) {
        const source = contracts.sourceAreas.find((area) => area.id === id)!;
        if (source.owner !== alias.owner) continue;
        const original = await environment.resolve(
          importer,
          path.resolve(cwd, source.root),
        );
        if (!original) {
          errors.push(
            `${alias.specifier}: OSS bare entry '${id}' does not resolve`,
          );
          continue;
        }
        const expected = await readExports(original);
        errors.push(...expected.errors);
        for (const [name, entry] of expected.names) {
          const replacement = actual.names.get(name);
          if (
            !replacement ||
            replacement.identity !== entry.identity ||
            replacement.value !== entry.value
          )
            errors.push(
              `${alias.specifier}: wrapper must preserve OSS export '${name}'`,
            );
        }
      }
    }
    // Shape checks use generated requests and actual resolver behavior. Inspect
    // keys as well: a missing generated file cannot prove an exact binding.
    for (const alias of contracts.aliases) {
      const importer = path.join(cwd, 'rspress.config.ts');
      const negatives = [`${alias.specifier}__alias_sibling__`];
      if (alias.kind === 'exact')
        negatives.push(`${alias.specifier}/__alias_descendant__`);
      if (alias.kind === 'subpaths-only') negatives.push(alias.specifier);
      for (const initial of negatives) {
        let request = initial;
        // Exact namespaces may have independently registered descendants.
        // Generated negatives must not collide with another valid contract.
        while (
          contracts.aliases.some(
            (other) =>
              other !== alias &&
              (request === other.specifier ||
                (other.kind !== 'exact' &&
                  request.startsWith(`${other.specifier}/`))),
          )
        )
          request += '_';
        if (await environment.resolve(importer, request))
          errors.push(
            `${request} [${environment.name}]: unsupported shape resolves`,
          );
      }
    }
  }
  return {
    errors: [...new Set(errors)].sort(),
    probes: resolutions.length + probeFiles.size,
  };
}

/** Run Gate 2 from an OSS or consumer repository root and close all compilers. */
export async function runResolutionCli(
  args: readonly string[] = process.argv.slice(2),
  cwd = process.cwd(),
  defaults?: Parameters<typeof loadContracts>[2],
): Promise<number> {
  let runtime: Runtime | undefined;
  try {
    const options = parseArguments(args);
    if (options.help) {
      console.log(
        'Usage: node --import tsx scripts/alias-contracts/check-resolution.ts --source-map <module> [--resolver-overrides <module>] [--alias-extensions <module>] [--documentation-corpus <module>]',
      );
      return 0;
    }
    if (!options.sourceMap && !defaults)
      throw new Error(
        'Use oss.ts resolution for OSS checks, or provide --source-map.',
      );
    const contracts = await loadContracts(options, cwd, defaults);
    const corpus = discoverCorpus(cwd, contracts);
    runtime = await createRuntime(cwd);
    const { errors, probes } = await checkResolution(
      cwd,
      contracts,
      corpus,
      runtime,
    );
    if (errors.length) {
      console.error(
        `Alias resolution failed (${probes} probes):\n${errors.map((error) => `  - ${error}`).join('\n')}`,
      );
      return 1;
    }
    console.log(
      `Alias resolution passed (${corpus.length} imports, ${probes} probes${contracts.documentationCorpus ? `, ${contracts.documentationCorpus.files.length} prepared files` : ''}; ${runtime.environments.map((environment) => environment.name).join(', ')}).`,
    );
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  } finally {
    await runtime?.close();
  }
}

if (
  process.argv[1] &&
  canonical(process.argv[1]) === canonical(fileURLToPath(import.meta.url))
) {
  process.exitCode = await runResolutionCli();
}
