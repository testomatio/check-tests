#!/usr/bin/env node
const Analyzer = require('../analyzer');
const chalk = require('chalk');

const program = require('commander');
 
program
  .arguments('<framework> <files>')
  .option('-d, --dir <dir>', 'test directory')
  .option('--no-skipped', 'throw error if skipped tests found')
  .action((framework, files, opts) => {
    
    const analyzer = new Analyzer(framework, opts.dir || process.cwd());
    try {
      console.log(chalk.cyan.bold('\n[[ Tests checker by testomat.io ]]'));
      analyzer.analyze(files);
      const decorator = analyzer.getDecorator();
      const skipped = decorator.getSkippedTests();
      let list = analyzer.getDecorator().getTextList();
      list = list.map(l => l === '-----' ? chalk.bold('_______________________') : l).join('\n');
      console.log(chalk.bold.white(`\nSHOWING ${framework.toUpperCase()} TESTS FROM ${files}:`));
      console.log(list);
      console.log(chalk.bold.yellow(`\n\nSKIPPED ${skipped.length} TESTS:\n\n`));
      skipped.forEach(t => console.log(`- ${chalk.bold(t.name)} ${chalk.grey(`${t.file}:${t.line}`)}`));
      console.log(chalk.bold.green(`\n\nTOTAL ${decorator.count()} TESTS FOUND\n`));
      if (!opts.skipped && skipped.length) {
        throw new Error('Skipped tests found, failing...');
      }
    } catch (err) {
      console.error(chalk.red(err));
      process.exit(1);
    }
  });  
 
program.parse(process.argv);

