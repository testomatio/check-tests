const parser = require('@babel/parser');
const jestParser = require('../lib/jest');
const fs = require('fs');
const { expect } = require('chai');

let source;
let ast;

describe('jest parser', () => {

  context('jest tests', () => {

    before(() => {
      source = fs.readFileSync('./example/jest/vue.spec.js').toString();
      ast = parser.parse(source);
    });
    
    it('should parse jest file', () => {
      const tests = jestParser(ast);
      
      const actualTests = tests.filter(t => !t.skipped).map(t => t.name);
      const skippedTests = tests.filter(t => t.skipped).map(t => t.name);


      expect(actualTests).to.include('history mode');
      expect(skippedTests).to.include('use with Babel');
      // assert.equal(tests.length, 3);
    });

  });

});