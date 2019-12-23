const parser = require('@babel/parser');
const mochaParser = require('../lib/mocha');
const fs = require('fs');
const { expect } = require('chai');

let source;
let ast;

describe('mocha parser', () => {

  context('mocha tests', () => {

    before(() => {
      source = fs.readFileSync('./example/mocha/index_test.js').toString();
      ast = parser.parse(source);
    });

    it('should parse mocha file', () => {
      const tests = mochaParser(ast);

      const actualTests = tests.filter(t => !t.skipped).map(t => t.name);
      const skippedTests = tests.filter(t => t.skipped).map(t => t.name);

      expect(actualTests).to.include('should test if 3*3 = 9');
      expect(actualTests, 'commented').to.not.include('should test (3-4)*8 SHOULD EQUAL -8');
      expect(skippedTests, 'commented').to.not.include('should test (3-4)*8 SHOULD EQUAL -8');
      expect(skippedTests, 'xit').to.include('should be clone');
      expect(skippedTests, 'it.skip').to.include('should be second clone');
      expect(skippedTests, 'describe.skip').to.include('should be disabled');
      // assert.equal(tests.length, 3);
    });

  });

  context('cypress tests', () => {

    before(() => {
      source = fs.readFileSync('./example/mocha/cypress_spec.js').toString();
      ast = parser.parse(source);
    });

    it('should parse cypress file', () => {
      const tests = mochaParser(ast);

      const actualTests = tests.filter(t => !t.skipped).map(t => t.name);

      expect(actualTests).to.include('.check() - check a checkbox or radio element');
      // assert.equal(tests.length, 3);
    });
  });


  context('graphql tests', () => {

    before(() => {
      source = fs.readFileSync('./example/mocha/graphql_test.js').toString();
      ast = parser.parse(source);
    });

    it('should parse codeceptjs internal test', () => {
      const tests = mochaParser(ast);

      expect(tests[0].name).to.eql('should send a query: read');
      expect(tests[0].suites).to.eql(['GraphQL', 'basic queries']);
      expect(tests[1].suites).to.eql(['GraphQL', 'basic mutations']);
      // assert.equal(tests.length, 3);
    });
  });

});