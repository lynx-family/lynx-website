/**
 * Gate 3 applies import policy to Gate 2's raw corpus. Baselines count exact
 * source occurrences; they cannot waive resolution, source or target policy.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { relativeBoundaryTarget } from './boundary.js';
import {
  loadContracts,
  parseArguments,
  type ActiveContracts,
} from './check-registry.js';
import { readTsConfig, targetErrors } from './check-resolution.js';
import {
  canonical,
  classifySource,
  discoverCorpus,
  documentationRoots,
  aliasAllowsImporter,
  matchingAlias,
  resolvedResource,
  resourcePath,
  type ImportRecord,
} from './corpus.js';
import {
  createRuntime,
  type Runtime,
  type RuntimeEnvironment,
} from './runtime.js';
import type { SourceArea } from './types.js';

const debtRules = new Set([
  'migration-alias',
  'migration-subpath',
  'document-private',
  'cross-owner-private',
  'canonical-spelling',
  'version-data',
]);

const isRetiredAssetAlias = (specifier: string) => {
  const request = resourcePath(specifier);
  return request === '@assets' || request.startsWith('@assets/');
};

export interface PolicyViolation {
  rule: string;
  file: string;
  specifier: string;
  line: number;
  importerOwner: ImportRecord['owner'];
  targetOwner: SourceArea['owner'] | null;
  replacement: string;
  message: string;
  baselinable: boolean;
}

export interface BaselineEntry {
  rule: string;
  file: string;
  specifier: string;
  count: number;
}

const entryKey = (entry: Pick<BaselineEntry, 'rule' | 'file' | 'specifier'>) =>
  JSON.stringify([entry.rule, entry.file, entry.specifier]);

/** Strict data only: no wildcards, glob entries, inferred files or spare keys. */
export function parseBaseline(data: unknown): BaselineEntry[] {
  if (!Array.isArray(data)) throw new Error('Import baseline must be an array');
  const seen = new Set<string>();
  for (const entry of data) {
    if (
      !entry ||
      Object.keys(entry).sort().join(',') !== 'count,file,rule,specifier' ||
      !debtRules.has(entry.rule) ||
      typeof entry.file !== 'string' ||
      !entry.file ||
      path.isAbsolute(entry.file) ||
      /[\\*?\0]/.test(entry.file) ||
      entry.file
        .split('/')
        .some((part: string) => !part || part === '.' || part === '..') ||
      typeof entry.specifier !== 'string' ||
      !entry.specifier ||
      /[*\0]/.test(entry.specifier) ||
      !Number.isSafeInteger(entry.count) ||
      entry.count < 1
    )
      throw new Error(
        `Invalid import baseline entry: ${JSON.stringify(entry)}`,
      );
    const key = entryKey(entry);
    if (seen.has(key))
      throw new Error(`Duplicate import baseline entry: ${key}`);
    seen.add(key);
  }
  return data as BaselineEntry[];
}

/** One entry per syntax occurrence/rule, independent of resolver environments. */
export function baselineInventory(
  violations: readonly PolicyViolation[],
): BaselineEntry[] {
  const inventory = new Map<string, BaselineEntry>();
  for (const violation of violations.filter((entry) => entry.baselinable)) {
    const key = entryKey(violation);
    const entry = inventory.get(key) ?? {
      rule: violation.rule,
      file: violation.file,
      specifier: violation.specifier,
      count: 0,
    };
    entry.count++;
    inventory.set(key, entry);
  }
  return [...inventory.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'en'))
    .map(([, entry]) => entry);
}

export function compareBaseline(
  violations: readonly PolicyViolation[],
  baseline: readonly BaselineEntry[],
): string[] {
  // Validate here too: callers cannot bypass duplicate/schema checks.
  parseBaseline(baseline);
  const actual = new Map(
    baselineInventory(violations).map((entry) => [
      entryKey(entry),
      entry.count,
    ]),
  );
  const allowed = new Map(
    baseline.map((entry) => [entryKey(entry), entry.count]),
  );
  const errors: string[] = [];
  for (const key of [
    ...new Set([...actual.keys(), ...allowed.keys()]),
  ].sort()) {
    const observed = actual.get(key) ?? 0;
    const expected = allowed.get(key) ?? 0;
    if (observed !== expected)
      errors.push(
        `${key}: baseline count ${expected}, observed ${observed}${observed < expected ? ' (stale; shrink the baseline)' : ' (new or increased debt)'}`,
      );
  }
  return errors;
}

/**
 * Generator namespaces can name a directory with no barrel. Try the real
 * resolver first, then only for configuration use its effective ordered alias
 * roots to find the first existing namespace directory.
 */
async function resolveSetting(
  cwd: string,
  record: ImportRecord,
  environment: RuntimeEnvironment,
): Promise<string | undefined> {
  const resolved = await environment.resolve(record.importer, record.specifier);
  if (resolved) return resolvedResource(record.specifier, resolved);
  if (record.kind !== 'configuration') return undefined;
  const request = resourcePath(record.specifier);
  for (const [key, value] of Object.entries(environment.aliases)) {
    const exact = key.endsWith('$');
    const prefix = key.replace(/\$$/, '');
    if (request !== prefix && (exact || !request.startsWith(`${prefix}/`)))
      continue;
    for (const root of Array.isArray(value) ? value : [value]) {
      if (!root) return undefined;
      const candidate = path.resolve(
        cwd,
        root,
        request.slice(prefix.length).replace(/^\//, ''),
      );
      if (existsSync(candidate) && statSync(candidate).isDirectory())
        return candidate;
    }
    return undefined;
  }
  return undefined;
}

export async function checkImportPolicy(
  cwd: string,
  contracts: ActiveContracts,
  corpus: readonly ImportRecord[],
  runtime: Runtime,
): Promise<PolicyViolation[]> {
  const violations: PolicyViolation[] = [];
  const options = readTsConfig(cwd).options;
  const tsHost = ts.createCompilerHost(options);
  const roots = documentationRoots(contracts);
  for (const record of corpus) {
    const seen = new Set<string>();
    const request = resourcePath(record.specifier);
    const documentation =
      record.documentation || record.boundary === 'documentation';
    const alias = matchingAlias(record.specifier, contracts.aliases);
    const relative = record.specifier.startsWith('.');
    const retiredAssetAlias = isRetiredAssetAlias(record.specifier);
    const override = contracts.resolverOverrides.find(
      (entry) => entry.specifier === request,
    );
    if (!alias && !relative && !override && !retiredAssetAlias) continue;
    const bare = request === alias?.specifier;
    const configuration = record.kind === 'configuration';
    const targets: { environment: string; file?: string; area?: SourceArea }[] =
      [];
    if (!override) {
      if (
        record.bindings.length &&
        record.bindings.every((binding) => binding.typeOnly)
      ) {
        // Erased imports still obey policy. Preserve the importer's TS mode.
        const importer = path.resolve(cwd, record.importer);
        const file = ts.resolveModuleName(
          record.specifier,
          importer,
          options,
          tsHost,
          undefined,
          undefined,
          ts.getImpliedNodeFormatForFile(importer, undefined, tsHost, options),
        ).resolvedModule?.resolvedFileName;
        targets.push({ environment: 'typescript', file });
      } else {
        for (const environment of runtime.environments)
          targets.push({
            environment: environment.name,
            file: await resolveSetting(cwd, record, environment),
          });
      }
      for (const target of targets)
        if (target.file)
          target.area = classifySource(target.file, cwd, contracts.sourceAreas);
    }
    const add = (
      rule: string,
      replacement: string,
      message: string,
      debt = false,
      targetOwner = targets[0]?.area?.owner ?? null,
    ) => {
      // Keep separate syntax occurrences (including identical imports on one
      // line), but combine one occurrence's environment diagnostics.
      const key = JSON.stringify([rule, targetOwner, message]);
      if (seen.has(key)) return;
      seen.add(key);
      violations.push({
        rule,
        file: record.importer,
        specifier: record.specifier,
        line: record.line,
        importerOwner: record.owner,
        targetOwner,
        replacement,
        message,
        baselinable: debt && record.role !== 'generated',
      });
    };
    if (retiredAssetAlias) {
      add(
        documentation ? 'document-assets' : 'retired-alias',
        documentation ? 'documentation-cdn-url' : 'source-owned-asset',
        documentation
          ? 'documentation must not import public assets as modules'
          : 'the retired public asset alias must not be imported',
      );
      continue;
    }
    if (override) {
      add(
        'resolver-override',
        'normal-package-import',
        'project source must not import a registered resolver override directly',
      );
      continue;
    }
    if (alias) {
      if (
        !configuration &&
        ((bare && alias.kind === 'subpaths-only') ||
          (!bare && alias.kind === 'exact'))
      )
        add(
          'alias-shape',
          'supported-alias-form',
          'unsupported alias import form',
        );
      if (!aliasAllowsImporter(alias, record.owner)) {
        const legacy =
          alias.id === 'oss-private-source' && record.owner === 'consumer';
        add(
          legacy ? 'cross-owner-private' : 'importer-owner',
          'owning-public-entry',
          `importer owner must satisfy '${alias.id}'`,
          legacy,
        );
      }
      if (record.kind === 'require')
        add(
          'commonjs-alias',
          'esm-import',
          'alias-bearing CommonJS requests are unsupported',
        );
      for (const target of targets) {
        if (!target.file) {
          add(
            'unresolved-target',
            'resolvable-import',
            `[${target.environment}] target does not resolve`,
          );
          continue;
        }
        for (const message of targetErrors(
          alias,
          configuration ? 'namespace' : bare,
          target.area,
        ))
          add(
            'target-policy',
            'owning-public-entry',
            `[${target.environment}] ${message}`,
            false,
            target.area?.owner ?? null,
          );
      }
      if (!configuration && alias.lifecycle.state === 'migration')
        add(
          'migration-alias',
          'reviewed-host-adapter',
          'legacy alias namespace',
          true,
        );
      else if (
        !configuration &&
        !bare &&
        alias.subpaths?.lifecycle.state === 'migration'
      )
        add(
          'migration-subpath',
          `bare-entry:${alias.specifier}`,
          'legacy direct component path',
          true,
        );
      if (
        documentation &&
        alias.id === 'oss-private-source' &&
        record.owner === alias.owner
      )
        add(
          'document-private',
          'owning-public-entry',
          'portable documentation imports an OSS-private module',
          true,
        );
      // Resource modifiers do not change the path's canonical spelling.
      // Keep the original request for resolution, diagnostics and baseline keys.
      const modifier = record.specifier.slice(request.length);
      const spelling = request.replace(/\.(?:[cm]?[jt]sx?)$/, '');
      if (
        !configuration &&
        alias.visibility === 'public' &&
        ((alias.canonical.omitSourceExtensions && spelling !== request) ||
          (alias.canonical.omitIndex && spelling.endsWith('/index')))
      )
        add(
          'canonical-spelling',
          `canonical-alias:${spelling.replace(/\/index$/, '')}${modifier}`,
          'public imports must omit source extensions and trailing /index',
          true,
        );
    }
    if (relative) {
      if (
        relativeBoundaryTarget(
          cwd,
          contracts.sourceAreas,
          record,
          targets.flatMap((target) => (target.file ? [target.file] : [])),
          roots,
        ) !== undefined
      )
        add(
          'relative-boundary',
          'owning-public-entry',
          'relative import crosses the documentation/runtime boundary',
        );
      if (
        record.boundary === 'runtime' &&
        targets.some((target) => target.area?.id === 'oss-version-data')
      )
        add(
          'version-data',
          'reviewed-version-adapter',
          'runtime source depends on the host version-data layout',
          true,
        );
    }
  }
  return violations;
}

export function formatViolation(entry: PolicyViolation): string {
  return `${entry.rule} ${entry.file}:${entry.line} ${entry.specifier} importer=${entry.importerOwner} target=${entry.targetOwner ?? 'unknown'} replacement=${entry.replacement}: ${entry.message}`;
}

export async function runImportPolicyCli(
  args: readonly string[] = process.argv.slice(2),
  cwd = process.cwd(),
  defaults?: Parameters<typeof loadContracts>[2],
): Promise<number> {
  let runtime: Runtime | undefined;
  try {
    const sharedArgs: string[] = [];
    let baselineFile: string | undefined;
    let report = false;
    for (let index = 0; index < args.length; index++) {
      const argument = args[index]!;
      if (argument === '--report') {
        if (report) throw new Error('Duplicate --report option');
        report = true;
      } else if (argument === '--baseline') {
        if (
          baselineFile ||
          !args[index + 1] ||
          args[index + 1]!.startsWith('--')
        )
          throw new Error('--baseline requires one JSON path');
        baselineFile = args[++index];
      } else sharedArgs.push(argument);
    }
    const options = parseArguments(sharedArgs);
    if (options.help) {
      console.log(
        'Usage: node --import tsx scripts/alias-contracts/check-import-policy.ts --source-map <module> --baseline <json> [--resolver-overrides <module>] [--alias-extensions <module>] [--documentation-corpus <module>] [--report]',
      );
      return 0;
    }
    if (!options.sourceMap && !defaults)
      throw new Error(
        'Use oss.ts imports for OSS checks, or provide --source-map.',
      );
    if (options.sourceMap && !baselineFile)
      throw new Error('Consumer import policy requires --baseline <json>');
    const contracts = await loadContracts(options, cwd, defaults);
    const baseline = parseBaseline(
      JSON.parse(
        readFileSync(
          baselineFile
            ? path.resolve(cwd, baselineFile)
            : fileURLToPath(
                new URL('./import-policy-baseline.json', import.meta.url),
              ),
          'utf8',
        ),
      ),
    );
    const corpus = discoverCorpus(cwd, contracts);
    runtime = await createRuntime(cwd);
    const violations = await checkImportPolicy(cwd, contracts, corpus, runtime);
    const errors = [
      ...violations.filter((entry) => !entry.baselinable).map(formatViolation),
      ...compareBaseline(violations, baseline),
    ];
    if (report)
      console.log(
        JSON.stringify(
          {
            imports: corpus.length,
            ...(contracts.documentationCorpus
              ? { preparedFiles: contracts.documentationCorpus.files.length }
              : {}),
            violations,
            inventory: baselineInventory(violations),
            errors,
          },
          null,
          2,
        ),
      );
    else if (errors.length) {
      const debt = violations.filter(
        (entry) =>
          entry.baselinable &&
          errors.some((error) => error.startsWith(entryKey(entry))),
      );
      console.error(
        `Import policy failed:\n${[...errors, ...debt.map(formatViolation)].map((error) => `  - ${error}`).join('\n')}`,
      );
    } else
      console.log(
        `Import policy passed (${corpus.length} imports; ${baseline.length} exact baseline entries, ${baseline.reduce((sum, entry) => sum + entry.count, 0)} occurrences).`,
      );
    return errors.length ? 1 : 0;
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
)
  process.exitCode = await runImportPolicyCli();
