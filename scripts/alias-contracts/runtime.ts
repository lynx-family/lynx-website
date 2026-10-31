/** Use the active host's Rspress build pipeline, including plugin modifications. */
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export type RuntimeAliases = Record<
  string,
  string | false | (string | false)[]
>;
export interface RuntimeEnvironment {
  name: string;
  aliases: RuntimeAliases;
  resolve(importer: string, request: string): Promise<string | undefined>;
}
export interface Runtime {
  explicitAliases: RuntimeAliases;
  environments: RuntimeEnvironment[];
  close(): Promise<void>;
}

export async function createRuntime(
  cwd: string,
  suppliedConfig?: any,
): Promise<Runtime> {
  const require = createRequire(path.join(cwd, 'package.json'));
  const load = (specifier: string) =>
    import(pathToFileURL(require.resolve(specifier)).href);
  const [{ loadConfigFile }, { PluginDriver, RouteService }, { initRsbuild }] =
    await Promise.all([
      load('@rspress/core/dist/config/loadConfigFile.js'),
      load('@rspress/core/dist/index.js'),
      load('@rspress/core/dist/node/initRsbuild.js'),
    ]);
  const { config, configFilePath } = suppliedConfig
    ? {
        config: suppliedConfig,
        configFilePath: path.join(cwd, 'rspress.config.ts'),
      }
    : await loadConfigFile(path.join(cwd, 'rspress.config.ts'));
  const driver = await PluginDriver.create(config, configFilePath, true);
  const modified = await driver.modifyConfig();
  modified.root = path.resolve(cwd, modified.root);
  modified.themeDir = path.resolve(cwd, modified.themeDir);
  const explicitAliases: RuntimeAliases = {
    ...modified.builderConfig?.resolve?.alias,
  };
  // Rspack-level and environment-local user keys also require accounting.
  Object.assign(
    explicitAliases,
    modified.builderConfig?.tools?.rspack?.resolve?.alias,
  );
  for (const plugin of driver.getPlugins()) {
    Object.assign(explicitAliases, plugin.builderConfig?.resolve?.alias);
  }
  for (const environment of Object.values(
    modified.builderConfig?.environments ?? {},
  ) as any[]) {
    Object.assign(
      explicitAliases,
      environment.resolve?.alias,
      environment.tools?.rspack?.resolve?.alias,
    );
  }
  const rsbuild = await initRsbuild(
    modified.root,
    modified,
    driver,
    await RouteService.createSimple(),
    true,
    {
      extraRsbuildConfig: {
        mode: modified.builderConfig?.mode ?? 'production',
        source: { tsconfigPath: path.join(cwd, 'tsconfig.json') },
      },
    },
  );
  // Derive framework keys through the same pipeline without site plugins or
  // builder overrides. This also catches aliases injected by tools callbacks.
  const frameworkConfig = {
    ...modified,
    plugins: [],
    builderConfig: undefined,
  };
  const frameworkDriver = await PluginDriver.create(
    frameworkConfig,
    configFilePath,
    true,
  );
  const frameworkBuild = await initRsbuild(
    modified.root,
    frameworkConfig,
    frameworkDriver,
    await RouteService.createSimple(),
    true,
    {
      extraRsbuildConfig: {
        mode: modified.builderConfig?.mode ?? 'production',
        source: { tsconfigPath: path.join(cwd, 'tsconfig.json') },
      },
    },
  );
  const frameworkCompiler = await frameworkBuild.createCompiler();
  const injected = new Map(
    (frameworkCompiler.compilers ?? [frameworkCompiler]).map((entry: any) => [
      entry.options.name,
      entry.options.resolve.alias ?? {},
    ]),
  );
  await new Promise<void>((resolve, reject) =>
    frameworkCompiler.close((error: any) =>
      error ? reject(error) : resolve(),
    ),
  );
  const compiler = await rsbuild.createCompiler();
  const compilers = compiler.compilers ?? [compiler];
  const environments = compilers.map((child: any): RuntimeEnvironment => {
    const frameworkAliases =
      (injected.get(child.options.name) as RuntimeAliases) ?? {};
    for (const [key, value] of Object.entries(
      child.options.resolve.alias ?? {},
    )) {
      if (
        !(key in frameworkAliases) ||
        JSON.stringify(value) !== JSON.stringify(frameworkAliases[key])
      )
        explicitAliases[key] = value as RuntimeAliases[string];
    }
    return {
      name: child.options.name ?? 'web',
      aliases: child.options.resolve.alias ?? {},
      resolve: (importer, request) =>
        new Promise((resolve, reject) => {
          const resolver = child.resolverFactory.get('normal', {
            dependencyType: 'esm',
          });
          resolver.resolve(
            {},
            path.dirname(path.resolve(cwd, importer)),
            request,
            {},
            (error: any, result: any) => {
              if (
                error &&
                !/Can't resolve|NotFound|not found|cannot resolve|PackagePathNotExported|Package path .* is not exported/i.test(
                  error.message ?? String(error),
                )
              )
                reject(error);
              else resolve(typeof result === 'string' ? result : undefined);
            },
          );
        }),
    };
  });
  return {
    explicitAliases,
    environments,
    close: () =>
      new Promise((resolve, reject) =>
        compiler.close((error: any) => (error ? reject(error) : resolve())),
      ),
  };
}
