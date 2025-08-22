#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const Analyzer = require('../src/analyzer');
const Reporter = require('../src/reporter');
const chalk = require('chalk');
const document = require('../src/document');
const { cleanIds, updateIds } = require('../src/updateIds');
const apiKey = process.env['INPUT_TESTOMATIO-KEY'] || process.env['TESTOMATIO'];
const branch = process.env.TESTOMATIO_BRANCH;
const debug = require('debug')('testomatio:check');
const { version } = require('../package.json');
console.log(chalk.cyan.bold(` 🤩 Tests checker by Testomat.io v${version}`));

process.env.isTestomatioCli = true;

const program = require('commander');

// Main action function
async function mainAction(framework, files, opts) {
  framework = framework.toLowerCase();
  opts.testAlias = opts.testAlias ? opts.testAlias.split(',') : [];
  opts.framework = framework;
  opts.pattern = files;

  if (opts.force) {
    console.log(' ⚠️  Running with --force option');
  }
  const frameworkOpts = {};

  if (opts.lineNumbers) {
    frameworkOpts.lineNumbers = true;
  }

  if (!opts.hooks) {
    frameworkOpts.noHooks = !opts.hooks;
  }

  const workDir = opts.dir || process.cwd();
  const analyzer = new Analyzer(framework, workDir, { ...opts, ...frameworkOpts });
  try {
    if (opts.typescript) {
      try {
        require.resolve('typescript');
        require.resolve('@typescript-eslint/typescript-estree');
      } catch {
        console.log('Please install check-tests with TypeScript modules to proceed:');
        install(['typescript', '@typescript-eslint/typescript-estree']);
        process.exit(1);
      }
      analyzer.withTypeScript();
    }
    if (opts.plugins) {
      if (!Array.isArray(opts.plugins)) {
        opts.plugins = [opts.plugins];
      }
      opts.plugins.forEach(p => analyzer.addPlugin(p));
    }
    analyzer.analyze(files);
    if (opts.cleanIds || opts.unsafeCleanIds) {
      let idMap = {};
      if (apiKey) {
        const reporter = new Reporter(apiKey.trim(), framework);
        idMap = await reporter.getIds();
      } else if (opts.cleanIds) {
        console.log(' ✖️  API key not provided');
        return;
      }
      const files = cleanIds(analyzer.rawTests, idMap, opts.dir || process.cwd(), {
        ...opts,
        dangerous: opts.unsafeCleanIds,
      });
      console.log(`    ${files.length} files updated.`);
      return;
    }

    const decorator = analyzer.getDecorator();
    if (opts.url) {
      decorator.fileLink = opts.url;
    }
    const skipped = decorator.getSkippedTests();
    let list = analyzer.getDecorator().getTextList();
    list = list.map(l => (l === '-----' ? chalk.bold('_______________________\n') : l)).join('\n');
    console.log(chalk.bold.white(`\nSHOWING ${framework.toUpperCase()} TESTS FROM ${files}:`));
    console.log(list);
    if (skipped.length) {
      console.log(chalk.bold.yellow(`\nSKIPPED ${skipped.length} TESTS:\n`));
      skipped.forEach(t => console.log(`- ${chalk.bold(t.name)} ${chalk.grey(`${t.file}:${t.line}`)}`));
    }
    if (decorator.count()) {
      console.log(chalk.bold.green(`\n\nTOTAL ${decorator.count()} TESTS FOUND\n`));

      if (opts.generateFile) {
        console.log(opts.generateFile);
        document
          .createTestDoc(opts.generateFile, decorator)
          .then(() => console.log(`📝 Document saved to ${opts.generateFile}`))
          .catch(err => console.log('Error in creating test document', err));
      }
      if (apiKey) {
        const reporter = new Reporter(apiKey.trim(), framework);
        reporter.addTests(decorator.getTests());
        const resp = reporter.send({
          sync: opts.sync || opts.updateIds,
          create: opts.create || false,
          noempty: !opts.empty,
          branch,
          'no-detach': process.env.TESTOMATIO_NO_DETACHED || !opts.detached,
          structure: opts.keepStructure,
          force: opts.force || false,
        }); // async call

        if (opts.sync) {
          console.log('    Wait for Testomatio to synchronize tests...');
          await resp;
        }
        if (opts.updateIds) {
          if (branch) {
            console.log('To avoid conflicts, --update-ids is disabled in a branch. Skipping...');
            return;
          }
          await resp;
          console.log('    Updating test ids in the source code...');
          analyzer.rawTests = [];
          analyzer.analyze(files);
          if (apiKey) {
            const reporter = new Reporter(apiKey.trim(), framework);
            try {
              const idMap = await reporter.getIds();
              const files = updateIds(analyzer.rawTests, idMap, workDir, opts);
              console.log(`    ${files.length} files updated.`);
            } catch (err) {
              console.log(' ✖️  Error in updating test ids', err);
              debug(err.message);
            }
          } else {
            console.log(' ✖️  API key not provided');
          }
          return;
        }
      } else {
        console.log(' ✖️  API key not provided');
      }
    } else {
      console.log(` ✖️  Can't find any tests in this folder: ${workDir}\n`);
      console.log(
        'Change file pattern or directory to scan to find test files:\n\nUsage: npx check-tests < pattern > -d[directory]',
      );
    }

    if (!opts.skipped && skipped.length) {
      throw new Error('Skipped tests found, failing...');
    }
  } catch (err) {
    console.error(chalk.bold.red(err));
    console.error(err);

    if (!err.name == 'ValidationError') {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

program
  .arguments('<framework> <files>')
  .option('-d, --dir <dir>', 'test directory')
  .option('--no-skipped', 'throw error if skipped tests found')
  .option('--typescript', 'enable typescript support')
  .option('--sync', 'import tests to testomatio and wait for completion')
  .option('-g, --generate-file <fileName>', 'Export test details to a document')
  .option('-u, --url <url>', 'Github URL to get files (URL/tree/master)')
  .option('-p, --plugins [plugins...]', 'additional babel plugins')
  .option('--no-detached', 'Don\t mark all unmatched tests as detached')
  .option('--update-ids', 'Update test and suite with testomatio ids')
  .option('--create', 'Create tests and suites for missing IDs')
  .option('--keep-structure', 'Prefer structure of source code over structure in Testomat.io')
  .option('--no-empty', 'Remove empty suites after import')
  .option('--purge, --unsafe-clean-ids', 'Remove testomatio ids from test and suite without server verification')
  .option('--clean-ids', 'Remove testomatio ids from test and suite')
  .option('--no-hooks', 'Exclude test hooks code from the code on the client')
  .option('--line-numbers', 'Adding an extra line number to each block of code')
  .option('--test-alias <test-alias>', 'Specify custom alias for test/it etc (separated by commas if multiple)')
  .option('--exclude <pattern>', 'Glob pattern to exclude files from analysis')
  .action(mainAction);

// Pull command
program
  .command('pull')
  .option('-d, --dir <dir>', 'target directory', '.')
  .option('--dry-run', 'show what files would be created without actually creating them')
  .option('--force', 'skip git checks and force pull files')
  .description('Pull test files from Testomat.io')
  .action(async opts => {
    const Reporter = require('../src/reporter');
    const Pull = require('../src/pull');

    if (!apiKey) {
      console.error(' ✖️  API key not provided. Set TESTOMATIO environment variable.');
      process.exit(1);
    }

    try {
      const reporter = new Reporter(apiKey.trim(), 'manual');
      const pull = new Pull(reporter, opts.dir || process.cwd(), { dryRun: opts.dryRun, force: opts.force });
      const files = await pull.pullFiles();

      if (!opts.dryRun && files.length > 0) {
        console.log('\n✨ Pull completed successfully!');
      }
    } catch (error) {
      console.error(' ✖️  Failed to pull files:', error.message);
      process.exit(1);
    }
  });

// Push command (alias for check-tests manual **/**.md)
program
  .command('push')
  .option('-d, --dir <dir>', 'test directory')
  .option('--no-skipped', 'throw error if skipped tests found')
  .option('--typescript', 'enable typescript support')
  .option('--sync', 'import tests to testomatio and wait for completion')
  .option('-g, --generate-file <fileName>', 'Export test details to a document')
  .option('-u, --url <url>', 'Github URL to get files (URL/tree/master)')
  .option('-p, --plugins [plugins...]', 'additional babel plugins')
  .option('--no-detached', 'Don\t mark all unmatched tests as detached')
  .option('--update-ids', 'Update test and suite with testomatio ids')
  .option('--create', 'Create tests and suites for missing IDs')
  .option('--keep-structure', 'Prefer structure of source code over structure in Testomat.io')
  .option('--no-empty', 'Remove empty suites after import')
  .option('--purge, --unsafe-clean-ids', 'Remove testomatio ids from test and suite without server verification')
  .option('--clean-ids', 'Remove testomatio ids from test and suite')
  .option('--no-hooks', 'Exclude test hooks code from the code on the client')
  .option('--line-numbers', 'Adding an extra line number to each block of code')
  .option('--test-alias <test-alias>', 'Specify custom alias for test/it etc (separated by commas if multiple)')
  .option('--exclude <pattern>', 'Glob pattern to exclude files from analysis')
  .option('--force', 'skip git checks and force push files')
  .description('Push manual tests from markdown files (alias for check-tests manual **/**.md)')
  .action(async opts => {
    // Alias: call main action with 'manual' framework and '**/**.md' files
    await mainAction('manual', '**/**.md', opts);
  });

if (process.argv.length <= 2) {
  program.outputHelp();
}

program.parse(process.argv);

async function install(dependencies, verbose) {
  return new Promise((resolve, reject) => {
    let command;
    let args;

    dependencies.unshift('check-tests@latest');

    console.log('Install required packages locally:');

    if (fs.existsSync('yarn.lock')) {
      // use yarn
      command = 'yarnpkg';
      args = ['add', '-D', '--exact'];
      [].push.apply(args, dependencies);
    } else {
      command = 'npm';
      args = ['install', '--save-dev'].concat(dependencies);
    }

    console.log(chalk.green(`${command} ${args.join(' ')}`));
  });
}
