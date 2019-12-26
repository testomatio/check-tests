#!/usr/bin/env node
const Analyzer = require('../analyzer');
const chalk = require('chalk');

console.log(chalk.cyan.bold('[[ Tests checker by testomat.io ]]'));

const program = require('commander');
 
program
  .arguments('<framework> <files>')
  .option('-d, --dir <dir>', 'test directory')
  .option('--no-skipped', 'throw error if skipped tests found')
  .option('--typescript', 'enable typescript support')
  .action((framework, files, opts) => {
    
    const analyzer = new Analyzer(framework, opts.dir || process.cwd());
    try {
      if (opts.typescript) analyzer.withTypeScript();
      analyzer.analyze(files);
      const decorator = analyzer.getDecorator();
      const skipped = decorator.getSkippedTests();
      let list = analyzer.getDecorator().getTextList();
      list = list.map(l => l === '-----' ? chalk.bold('_______________________') : l).join('\n');
      console.log(chalk.bold.white(`\nSHOWING ${framework.toUpperCase()} TESTS FROM ${files}:`));
      console.log(list);
      if (skipped.length) {
        console.log(chalk.bold.yellow(`\nSKIPPED ${skipped.length} TESTS:\n`));
        skipped.forEach(t => console.log(`- ${chalk.bold(t.name)} ${chalk.grey(`${t.file}:${t.line}`)}`));
      }
      console.log(chalk.bold.green(`\n\nTOTAL ${decorator.count()} TESTS FOUND\n`));
      if (!opts.skipped && skipped.length) {
        throw new Error('Skipped tests found, failing...');
      }
    } catch (err) {
      console.error(chalk.red(err));
      process.exit(1);
    }
  });  
 
  
  program.on('command:*', (cmd) => {
    console.log(`\nUnknown command ${cmd}\n`);
  program.outputHelp();
});


if (process.argv.length <= 2) {
  program.outputHelp();
}

program.parse(process.argv);

