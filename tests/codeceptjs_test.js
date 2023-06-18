const parser = require('@babel/parser');
const fs = require('fs');
const { expect } = require('chai');
const codeceptParser = require('../src/lib/frameworks/codeceptjs');

let source;
let ast;

describe('codeceptjs parser', () => {
  context('create todo tests', () => {
    before(() => {
      source = fs.readFileSync('./example/codeceptjs/create_todos_test.js').toString();
      ast = parser.parse(source);
    });

    it('should parse codecept file', () => {
      const tests = codeceptParser(ast, '', source);

      const actualTests = tests.filter(t => !t.skipped).map(t => t.name);
      const skippedTests = tests.filter(t => t.skipped).map(t => t.name);

      expect(actualTests).to.include('Create multiple todo items @Txxxxxxxx');
      expect(actualTests).to.include('Todos containing weird characters');
      expect(actualTests).to.include('Text input field should be cleared after each item');
      expect(skippedTests, 'xScenario').to.include('Create a new todo item');
      // assert.equal(tests.length, 3);
    });

    it('should include code', () => {
      const tests = codeceptParser(ast, '', source);
      expect(tests[0]).to.include.key('code');
      expect(tests[0].code).to.include('Scenario(');
      expect(tests[0].code).to.include('I.say(');
    });
  });

  context('Parse CodeceptJS tags', () => {
    before(() => {
      source = fs.readFileSync('./example/codeceptjs/tags_test.js').toString();
      ast = parser.parse(source);
    });

    it('should include tags', () => {
      const tests = codeceptParser(ast, '', source);
      const actualTests = tests.map(t => t.name);

      // expect(actualTests).to.include('Login');
      expect(tests[0].suites[0]).to.include('Auth');
      expect(tests[0].suites[0]).to.include('@user');
      expect(actualTests).to.include('Login @Important @Smoke @Other @T12321');
    });
  });

  context('Parse CodeceptJS tags & datatable', () => {
    before(() => {
      source = fs.readFileSync('./example/codeceptjs/data_table_tags_test.js').toString();
      ast = parser.parse(source);
    });

    it('should include data and tags', () => {
      const tests = codeceptParser(ast, '', source);
      const actualTests = tests.map(t => t.name);

      // expect(actualTests).to.include('Login');
      expect(tests[0].suites[0]).to.include('Search on Google');
      expect(actualTests).to.include('Search on Google @product-search @classic-test');
    });
  });

  context('Parse CodeceptJS hooks code', () => {
    let fileSource,
      fileAst = '';
    before(() => {
      fileSource = fs.readFileSync('./example/codeceptjs/test_hooks_description.js').toString();
      fileAst = parser.parse(fileSource);
    });

    it('should include AfterSuite hook code', () => {
      const tests = codeceptParser(fileAst, '', fileSource);

      expect(tests[0].code).to.include('AfterSuite(({ I }) => {\n');
      expect(tests[1].code).to.include('AfterSuite(({ I }) => {\n');
    });

    it('should include BeforeSuite hook code', () => {
      const tests = codeceptParser(fileAst, '', fileSource);

      expect(tests[0].code).to.include('BeforeSuite(({ I }) => {\n');
      expect(tests[1].code).to.include('BeforeSuite(({ I }) => {\n');
    });

    it('should include Before hook code', () => {
      const tests = codeceptParser(fileAst, '', fileSource);

      expect(tests[0].code).to.include('Before(async (I, TodosPage) => {\n');
      expect(tests[1].code).to.include('Before(async (I, TodosPage) => {\n');
    });
  });
});
