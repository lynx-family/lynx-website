/**
 * CLI driver for tool-typedoc.
 *
 * TODO: this could be re-written with a real CLI framework e.g. `commander`.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { runTypeDoc } from './run-typedoc.js';

export interface CliOptions {
  packages?: string[];
  cwd: string;
  help?: boolean;
}

const HELP_TEXT = `
Usage: typedoc [options]

Options:
  --package, -P <pkg1> [pkg2] ...  Generate docs for specific packages
  --help, -h                       Show this help message
`;

async function validateWorkingDirectory(cwd: string): Promise<void> {
  try {
    const pkgContent = await fs.readFile(
      path.join(cwd, 'package.json'),
      'utf-8',
    );
    const pkg = JSON.parse(pkgContent);

    if (pkg.name !== '@lynx-js/lynx-doc') {
      throw new Error(
        `This script must be run from the root of the @lynx-js/lynx-doc repository.\n` +
          `Current package: ${pkg.name}\n` +
          `Current directory: ${cwd}`,
      );
    }
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Invalid package.json in ${cwd}: ${err.message}`);
    }
    if ('code' in err && err.code === 'ENOENT') {
      throw new Error(
        `Could not find package.json in ${cwd}.\n` +
          `This script must be run from the root of the @lynx-js/lynx-doc repository.`,
      );
    }
    throw err;
  }
}

function parsePackages(
  argv: string[],
  startIndex: number,
): { packages: string[]; endIndex: number } {
  const packages = [];
  let i = startIndex;

  while (i < argv.length && !argv[i].startsWith('-')) {
    packages.push(argv[i]);
    i++;
  }

  if (packages.length === 0) {
    throw new Error(
      'The --package/-P flag requires at least one package name.\nUsage: --package/-P <pkg1> [pkg2] [pkg3] ...',
    );
  }
  if (packages.some((pkg) => pkg.startsWith('-'))) {
    throw new Error(
      `Invalid package name provided. Package names cannot start with -.\nReceived: ${packages.join(', ')}`,
    );
  }

  return { packages, endIndex: i - 1 };
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    cwd: process.cwd(),
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--package' || arg === '-P') {
      const { packages, endIndex } = parsePackages(argv, i + 1);
      options.packages = packages;
      i = endIndex;
    }
  }

  return options;
}

export async function main() {
  try {
    const options = parseCliOptions(process.argv.slice(2));

    if (options.help) {
      console.log(HELP_TEXT);
      process.exit(0);
    }

    await validateWorkingDirectory(options.cwd);

    if (!options.packages) {
      console.warn(
        '\x1b[33mWarning: No packages specified. This will run typedoc for all packages and may be slow.',
      );
      console.warn(
        'Consider using --package/-P to generate docs for specific packages:',
      );
      console.warn('  pnpm run typedoc --package <pkg1> [pkg2] ...\x1b[0m\n');
    }

    // Run TypeDoc generation commands.
    await runTypeDoc(options);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
