#!/usr/bin/env node
const fs = require('fs');
const Analyzer = require('../analyzer');
const Reporter = require('../reporter');
const chalk = require('chalk');
const util = require('../lib/utils');
const document = require('../document');
const { spawn } = require('child_process');
const apiKey = process.env['INPUT_TESTOMATIO-KEY'] || process.env['TESTOMATIO'];

const { version } = require('../package.json');
console.log(chalk.cyan.bold(` 🤩 Tests checker by Testomat.io v${version}`));

const program = require('commander');

program
  .arguments('<framework> <files>')
  .option('-d, --dir <dir>', 'test directory')
  .option('--no-skipped', 'throw error if skipped tests found')
  .option('--typescript', 'enable typescript support')
  .option('--sync', 'import tests to testomatio and wait for completion')
  .option('-g, --generate-file <fileName>', 'Export test details to a document')
  .option('-u, --url <url>', 'Github URL to get files (URL/tree/master)')
  .option('--no-detach', 'Don\t mark all unmatched tests as detached')
  .option('--update-ids', 'Update test and suite with testomatio ids')
  .action(async (framework, files, opts) => {
    const analyzer = new Analyzer(framework, opts.dir || process.cwd());
    try {
      if (opts.typescript) {
        try {
          require.resolve('@babel/plugin-transform-typescript');
          require.resolve('@babel/core')
        } catch {
          console.log("Installing TypeScript modules...");
          await install(['@babel/core', '@babel/plugin-transform-typescript'])
        }
        analyzer.withTypeScript();
      }
      analyzer.analyze(files);
      const decorator = analyzer.getDecorator();
      if (opts.url) {
        decorator.fileLink = opts.url;
      }
      const skipped = decorator.getSkippedTests();
      let list = analyzer.getDecorator().getTextList();
      list = list.map(l => l === '-----' ? chalk.bold('_______________________\n') : l).join('\n');
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
          document.createTestDoc(opts.generateFile, decorator)
          .then(() => console.log(`📝 Document saved to ${opts.generateFile}`))
          .catch(err => console.log('Error in creating test document', err));
        }
        if (apiKey) {
          const reporter = new Reporter(apiKey.trim(), framework);
          reporter.addTests(decorator.getTests());
          const resp = reporter.send({ sync: opts.sync || opts.updateIds }); // async call
          if (opts.sync) {
            console.log('    Wait for Testomatio to synchronize tests...');
            await resp;
          }
          if (opts.updateIds) {
            await resp;
            console.log('    Updating test ids in the source code...');
            analyzer.analyze(files);
            if (apiKey) {
              const reporter = new Reporter(apiKey.trim(), framework);
              await reporter.getIds().then(idMap => {
                const files = util.updateFiles(analyzer.rawTests, idMap, opts.dir || process.cwd())
                console.log(`    ${files.length} files updated.`);
              });
            } else {
              console.log(' ✖️  API key not provided');
            }
            return;
          }
        } else {
          console.log(' ✖️  API key not provided');
        }
      } else {
        console.log(' ✖️  Can\'t find any tests in this folder\n');
        console.log('Change file pattern or directory to scan to find test files:\n\nUsage: npx check-tests < pattern > -d[directory]');
      }

      if (!opts.skipped && skipped.length) {
        throw new Error('Skipped tests found, failing...');
      }
    } catch (err) {
      console.error(chalk.red(err));
      console.error(err.stack);
      process.exit(1);
    }
  });


if (process.argv.length <= 2) {
  program.outputHelp();
}

program.parse(process.argv);


async function install(dependencies, verbose) {
  return new Promise((resolve, reject) => {
    let command;
    let args;

    console.log('Installing extra packages: ', chalk.green(dependencies.join(', ')));

    if (fs.existsSync('yarn.lock')) { // use yarn
      command = 'yarnpkg';
      args = ['add','-D', '--exact'];
      [].push.apply(args, dependencies);

    } else {
      command = 'npm';
      args = [
          'install',
          '--save-dev',
          '--loglevel',
          'error',
      ].concat(dependencies);
    }

    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('close', code => {
      if (code !== 0) {
        reject({
          command: `${command} ${args.join(' ')}`,
        });
        return;
      }
      resolve();
    });
  });
}
