const parser = require('@babel/parser');
const jestParser = require('../lib/frameworks/jest');
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

      expect(actualTests).to.include('base');
      expect(actualTests).to.include('history mode');
      expect(actualTests).to.include('file should exist');
      expect(actualTests).to.include('%i file should exist (it.each)');

      expect(skippedTests).to.include('skip: use with Babel (test)');
      expect(skippedTests).to.include('skip: use with Babel (it)');
      expect(skippedTests).to.include('skip: %i file should exist (it.each)');
      expect(skippedTests).to.include('skip: %i file should exist (test.each)');

      expect(actualTests).to.have.lengthOf(4);
      expect(skippedTests).to.have.lengthOf(4);
    });

    it('should include code', () => {
      const tests = jestParser(ast, '', source);
      expect(tests[0]).to.include.key('code');
      expect(tests[0].code).to.include("test('base'");
    });
  });

  context('exclusive tests', () => {
    before(() => {
      source = fs.readFileSync('./example/jest/vue.spec.only.js').toString();
      ast = parser.parse(source);
    });

    it('should throw an error if a file contains .only', () => {
      const parse = () => jestParser(ast);

      expect(parse).to.throw(
        'Exclusive tests detected. `.only` call found in ' + ':1\n' + 'Remove `.only` to restore test checks',
      );
    });
  });
});
