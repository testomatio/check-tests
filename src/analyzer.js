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
      case 'nightwatch':
        this.frameworkParser = require('./lib/frameworks/nightwatch');
        break;
      case 'manual':
        this.frameworkParser = require('./lib/frameworks/markdown');
        break;
      case 'gauge':
        this.frameworkParser = require('./lib/frameworks/gauge');
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

    // Fix: Don't convert to absolute path, use relative path from workDir
    const originalCwd = process.cwd();
    process.chdir(this.workDir);

    let files = glob.sync(pattern, { windowsPathsNoEscape: true });

    // Exclude files matching the exclude pattern if provided
    if (this.opts.exclude) {
      const excludedFiles = glob.sync(this.opts.exclude, { windowsPathsNoEscape: true });
      files = files.filter(file => !excludedFiles.includes(file));
      debug('Excluded files:', excludedFiles);
    }

    debug('Files:', files);

    for (const file of files) {
      // Fix: Since we already changed working directory, just resolve relative to current directory
      const fullPath = path.resolve(file);

      if (fs.lstatSync(fullPath).isDirectory()) {
        continue;
      }

      // skip node_modules. On Windows its \n + ode_modules
      if (file.includes('ode_modules')) {
        continue;
      }

      debug(`Analyzing ${file}`);

      let source = fs.readFileSync(fullPath, { encoding: 'utf8' }).toString();

      let ast;
      // no need to parse code for frameworks that don't use JavaScript/AST
      const noAstFrameworks = ['newman', 'manual', 'gauge'];
      if (!noAstFrameworks.includes(this.framework)) {
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
            // Try with typescript-estree first, fall back to babel parser with typescript plugin for ERM support
            try {
              const program = parser.parse(source, {
                sourceType: 'unambiguous',
                filePath: fullPath.replace(/\\/g, '/'),
                loc: true,
                range: true,
                tokens: true,
              });
              ast = {
                program,
                type: 'File',
              };
            } catch (tsErr) {
              // Fall back to babel parser for TypeScript with ERM support
              const babelParser = require('@babel/parser');
              ast = babelParser.parse(source, {
                sourceType: 'unambiguous',
                plugins: ['typescript', 'explicitResourceManagement', 'optionalChaining', 'nullishCoalescingOperator'],
              });
            }
          } else {
            ast = parser.parse(source, {
              sourceType: 'unambiguous',
              plugins: ['explicitResourceManagement', 'optionalChaining', 'nullishCoalescingOperator'],
            });
          }
        } catch (err) {
          console.error(`Error parsing ${file}:`);
          console.error(err.message);
          continue; // Skip this file if parsing fails
        }
      }

      // Fix: Use relative fileName based on workDir context
      // When workDir is 'example', file should be 'mocha/index_test.js'
      // When workDir is '.', file should be 'example/mocha/index_test.js'
      const fileName = file.replace(/\\/g, '/'); // Convert Windows paths to forward slashes

      const testsData = this.frameworkParser(ast, fileName, source, this.opts);

      this.rawTests.push(testsData);
      const tests = new Decorator(testsData, { framework: this.framework });
      this.stats.tests = this.stats.tests.concat(tests.getFullNames());
      this.stats.skipped = this.stats.skipped.concat(tests.getSkippedTestFullNames());
      this.stats.files.push(fullPath);

      this.decorator.append(testsData);
      tests.validate();
    }

    // Restore original working directory
    process.chdir(originalCwd);
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
