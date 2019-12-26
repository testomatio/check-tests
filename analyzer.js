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

    switch (framework) {
      case 'jasmine':
      case 'protractor':
        this.frameworkParser = require('./lib/jasmine');
        break;        
      case 'jest':
      case 'jestio':
        this.frameworkParser = require('./lib/jest');
        break;   
      case 'codecept':
      case 'codeceptjs':
        this.frameworkParser = require('./lib/codeceptjs');
      break;
      case 'mocha':
      case 'cypress':
      case 'cypress.io': 
      case 'cypressio': 
      default:
        this.frameworkParser = require('./lib/mocha');
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

    pattern = path.join(this.workDir, pattern);
    this.stats = this.getEmptyStats();

    const files = glob.sync(pattern);


    for (const file of files) {
      let source = fs.readFileSync(file, { encoding: 'utf8' }).toString();
      
      if (this.plugins) {
        source = require("@babel/core").transform(source, {
          plugins: ["@babel/plugin-transform-runtime", ...this.plugins],
        }).code;   
      }
      const ast = parser.parse(source, { sourceType: 'unambiguous' });
      // append file name to each test
      const fileName = file.replace(this.workDir + path.sep, '');
      const testsData = this.frameworkParser(ast, fileName);
      
      const tests = new Decorator(testsData);
      this.stats.tests = this.stats.tests.concat(tests.getFullNames());
      this.stats.skipped = this.stats.skipped.concat(tests.getSkippedTestFullNames());
      this.stats.files.push(file);
   
      this.decorator.append(testsData);
    }
  }

  getDecorator() {
    return this.decorator;
  }
  
  getStats() {
    return this.stats;
  }

  getEmptyStats() {
    return  {
      tests: [],
      suites: [],
      files: [],
      skipped: [],
    };

  }


}

function compileTypeScript(source) {
  const ts = require("typescript");
  console.log(ts);

  return ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS }});
}

module.exports = Analyzer;
