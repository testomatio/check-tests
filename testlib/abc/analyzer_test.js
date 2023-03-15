const { expect } = require('chai');
const path = require('path');
const Analyzer = require('../src/analyzer');

let analyzer;

describe('analyzer', () => {

  it('should read ` char', () => {
    analyzer = new Analyzer('mocha', path.join(__dirname, '..'));
    analyzer.analyze('./example/dummy/string_spec.js');

    const stats = analyzer.getStats();
    const actualTests = stats.tests;
    const skippedTests = stats.skipped;
    const decorator = analyzer.getDecorator();

    const skippedTestsLineNumbers = decorator.tests.filter(t => t.skipped).map(t => t.line);
    expect(decorator.getSuiteNames()).to.include('Feature');

    expect(actualTests).to.include('Feature: should test');
    expect(skippedTests).to.include('Feature: should skip');
  });

});
