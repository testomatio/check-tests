const fs = require('fs');
const glob = require('glob');
const path = require('path');
const debug = require('debug')('testomatio:analyze');
const Decorator = require('./decorator');

let parser;

/**
 * @typedef {import('../types').Analyzer} Analyzer
 * @typedef {import('../types').Test} TestData
 */

class Analyzer {
  constructor(framework, workDir = '.', opts) {
    this.framework = framework;
    this.workDir = workDir;
    this.typeScript = false;
    this.plugins = [];
    this.presets = [];
    this.rawTests = [];
    this.opts = opts || {};

    parser = require('@babel/parser');

    switch (framework.toLowerCase()) {
      case 'jasmine':
      case 'protractor':
        this.frameworkParser = require('./lib/frameworks/jasmine');
        break;
      case 'jest':
      case 'jestio':
      case 'vitest':
        this.frameworkParser = require('./lib/frameworks/jest');
        break;
      case 'newman':
        this.frameworkParser = require('./lib/frameworks/newman');
        break;
      case 'playwright':
        this.frameworkParser = require('./lib/frameworks/playwright');
        break;
      case 'codecept':
      case 'codeceptjs':
        this.frameworkParser = require('./lib/frameworks/codeceptjs');
        break;
      case 'testcafe':
        this.frameworkParser = require('./lib/frameworks/testcafe');
        break;
      case 'qunit':
        this.frameworkParser = require('./lib/frameworks/qunit');
        break;
      case 'mocha':
      case 'cypress':
      case 'cypress.io':
      case 'cypressio':
      case 'webdriverio-mocha':
      default:
        this.frameworkParser = require('./lib/frameworks/mocha');
        break;
    }
  }

  addPlugin(plugin) {
    this.plugins.push(plugin);
  }

  addPreset(preset) {
    this.presets.push(preset);
  }

  withTypeScript() {
    this.typeScript = true;
    parser = require('@typescript-eslint/typescript-estree');
    // this.addPlugin('@babel/plugin-transform-typescript');
  }

  analyze(pattern) {
    if (!this.frameworkParser) throw new Error("No test framework specified. Can't analyze");

    this.decorator = new Decorator([], { framework: this.framework });
    this.stats = this.getEmptyStats();

    pattern = path.join(path.resolve(this.workDir), pattern);
    const files = glob.sync(pattern);
    debug('Files:', files);

    for (const file of files) {
      if (fs.lstatSync(file).isDirectory()) continue;

      // skip node_modules. On Windows its \n + ode_modules
      if (file.includes('ode_modules')) continue;

      debug(`Analyzing ${file}`);

      let source = fs.readFileSync(file, { encoding: 'utf8' }).toString();

      let ast;
      // no need to parse code for newman tests
      if (this.framework !== 'newman') {
        if (this.plugins.length > 0 || this.presets.length) {
          try {
            const opts = {};
            opts.plugins = this.plugins;
            opts.presets = this.presets;
            source = require('@babel/core').transform(source, opts).code;
          } catch (err) {
            console.error(`Error parsing ${file}`);
            console.error(err.message);
            if (err.message.includes('@babel/')) {
              console.log('\nProbably, required babel plugins are not installed.');
              console.log('Try to install them manually using npm:');
              console.log('\nnpm i @babel/core @babel/plugin-transform-typescript --save-dev');
            }
            if (process.env.isTestomatioCli) process.exit(1);
          }
        }
        try {
          if (this.typeScript) {
            // const program = parser.createProgram(path.join(__dirname, '../tsconfig.json'))
            const program = parser.parse(source, {
              sourceType: 'unambiguous',
              filePath: file.replace(/\\/g, '/'),
              loc: true,
              range: true,
              tokens: true,
            });
            ast = {
              program,
              type: 'File',
            };
          } else {
            ast = parser.parse(source, { sourceType: 'unambiguous' });
          }
        } catch (err) {
          console.error(`Error parsing ${file}:`);
          console.error(err.message);
        }
      }

      // append file name to each test
      const fileName = path.relative(this.workDir, file);
      // prepend dir should not affect the actual file path, it is used only on Testomatio side
      // if (process.env.TESTOMATIO_PREPEND_DIR) {
      //   fileName = path.join(process.env.TESTOMATIO_PREPEND_DIR, fileName);
      // }

      /**
       * Assigns the array of TestData objects to the `tests` variable.
       * @type {TestData[]}
       */
      const testsData = this.frameworkParser(ast, fileName, source, this.opts);
      this.rawTests.push(testsData);
      const tests = new Decorator(testsData, { framework: this.framework });
      this.stats.tests = this.stats.tests.concat(tests.getFullNames());
      this.stats.skipped = this.stats.skipped.concat(tests.getSkippedTestFullNames());
      this.stats.files.push(file);

      this.decorator.append(testsData);
      tests.validate();
    }
  }

  getDecorator() {
    return this.decorator;
  }

  getStats() {
    return this.stats;
  }

  getEmptyStats() {
    return {
      tests: [],
      suites: [],
      files: [],
      skipped: [],
    };
  }
}

module.exports = Analyzer;
