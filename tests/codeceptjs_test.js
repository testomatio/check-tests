const parser = require('@babel/parser');
const codeceptParser = require('../lib/frameworks/codeceptjs');
const fs = require('fs');
const { expect } = require('chai');
const { features } = require('process');

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

      expect(actualTests).to.include('Create multiple todo items');
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

});