const parser = require('@babel/parser');
const fs = require('fs');
const { expect } = require('chai');
const jestParser = require('../src/lib/frameworks/jest');

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

  context('hooks tests - default opts', () => {
    before(() => {
      source = fs.readFileSync('./example/jest/hooks.spec.js').toString();
      ast = parser.parse(source);
    });

    it('should include beforeAll hook code', () => {
      const tests = jestParser(ast, '', source);
      // first test
      expect(tests[0].code).to.include("beforeAll(() => {\n");
      expect(tests[0].code).to.include("console.log('Ran beforeAll');\n");
      expect(tests[0].code).to.include("expect(foods[1]).toBeTruthy();\n");
      // second test
      expect(tests[1].code).to.include("beforeAll(() => {\n");
      expect(tests[1].code).to.include("console.log('Ran beforeAll');\n");
      expect(tests[1].code).to.include("expect(foods[1]).toBeTruthy();\n");
    });

    it('should include beforeEach hook code', () => {
      const tests = jestParser(ast, '', source);
      // first test
      expect(tests[0].code).to.include("beforeEach(() => {\n");
      expect(tests[0].code).to.include("console.log('Ran beforeEach');\n");
      expect(tests[0].code).to.include("expect(foods[2]).toBeTruthy();\n");
      // second test
      expect(tests[1].code).to.include("beforeEach(() => {\n");
      expect(tests[1].code).to.include("console.log('Ran beforeEach');\n");
      expect(tests[1].code).to.include("expect(foods[2]).toBeTruthy();\n");
    });

    it('should include afterAll hook code', () => {
      const tests = jestParser(ast, '', source);
      // first test
      expect(tests[0].code).to.include("afterAll(() => {\n");
      expect(tests[0].code).to.include("console.log('Ran afterAll');\n");
      expect(tests[0].code).to.include("expect(foods[0]).toBeTruthy();\n");
      // second test
      expect(tests[1].code).to.include("afterAll(() => {\n");
      expect(tests[1].code).to.include("console.log('Ran afterAll');\n");
      expect(tests[1].code).to.include("expect(foods[0]).toBeTruthy();\n");
    });
  });
});
