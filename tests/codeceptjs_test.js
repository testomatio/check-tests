const parser = require('@babel/parser');
const codeceptParser = require('../lib/frameworks/codeceptjs');
const fs = require('fs');
const { expect } = require('chai');

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


});