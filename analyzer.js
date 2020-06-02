const parser = require('@babel/parser');
const fs = require('fs');
const glob = require("glob");
const path = require('path');
const Decorator = require('./decorator');

class Analyzer {

  constructor(framework, workDir = '.') {
    this.workDir = workDir;
    this.typeScript = false;
    this.plugins = [];

    switch (framework.toLowerCase()) {
      case 'jasmine':
      case 'protractor':
        this.frameworkParser = require('./lib/frameworks/jasmine');
        break;
      case 'jest':
      case 'jestio':
        this.frameworkParser = require('./lib/frameworks/jest');
        break;
      case 'codecept':
      case 'codeceptjs':
        this.frameworkParser = require('./lib/frameworks/codeceptjs');
        break;
      case 'testcafe':
        this.frameworkParser = require('./lib/frameworks/testcafe');
        break;
      case 'mocha':
      case 'cypress':
      case 'cypress.io':
      case 'cypressio':
      default:
        this.frameworkParser = require('./lib/frameworks/mocha');
        break;
    }
  }

  addPlugin(plugin) {
    this.plugins.push(plugin);
  }

  withTypeScript() {
    this.addPlugin("@babel/plugin-transform-typescript")
  }

  analyze(pattern) {

    if (!this.frameworkParser) throw new Error('No test framework specified. Can\'t analyze');

    this.decorator = new Decorator([]);
    this.stats = this.getEmptyStats();

    pattern = path.join(path.resolve(this.workDir), pattern);
    const files = glob.sync(pattern);

    for (const file of files) {
      if (fs.lstatSync(file).isDirectory()) continue;
      const dirs = file.split(path.sep);

      // skip node_modules
      if (dirs.includes('node_modules')) continue;

      let source = fs.readFileSync(file, { encoding: 'utf8' }).toString();

      if (this.plugins.length > 0) {
        source = require("@babel/core").transform(source, {
          plugins: [...this.plugins],
        }).code;
      }
      let ast;
      try {
        ast = parser.parse(source, { sourceType: 'unambiguous' });
      } catch (err) {
        console.error(`Error parsing ${file}: ${err}`);
      }
      // append file name to each test
      const fileName = path.relative(process.cwd(), file);
      if (!fileName.includes('node_modules')) {
        const testsData = this.frameworkParser(ast, fileName, source);

        const tests = new Decorator(testsData);
        this.stats.tests = this.stats.tests.concat(tests.getFullNames());
        this.stats.skipped = this.stats.skipped.concat(tests.getSkippedTestFullNames());
        this.stats.files.push(file);

        this.decorator.append(testsData);
      }
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
