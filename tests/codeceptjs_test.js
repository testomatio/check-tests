const parser = require('@babel/parser');
const mochaParser = require('../lib/codeceptjs');
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

    it('should parse mocha file', () => {
      const tests = mochaParser(ast);

      const actualTests = tests.filter(t => !t.skipped).map(t => t.name);
      const skippedTests = tests.filter(t => t.skipped).map(t => t.name);

      expect(actualTests).to.include('Create multiple todo items');
      expect(skippedTests, 'xScenario').to.include('Create a new todo item');
      // assert.equal(tests.length, 3);
    });

  });


});