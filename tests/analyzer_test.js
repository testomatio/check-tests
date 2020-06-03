const Analyzer = require('../analyzer');
const { expect } = require('chai');
const path = require('path');

let analyzer;

describe('analyzer', () => {

  it('should parse all mocha files', () => {
    analyzer = new Analyzer('mocha', path.join(__dirname, '..'));
    analyzer.analyze('./example/mocha/**_test.js');

    const stats = analyzer.getStats();
    const actualTests = stats.tests;
    const skippedTests = stats.skipped;
    const decorator = analyzer.getDecorator();

    const skippedTestsLineNumbers = decorator.tests.filter(t => t.skipped).map(t => t.line);
    expect(decorator.getSuiteNames()).to.include('Math');

    expect(actualTests).to.include('Math: should test if 3*3 = 9');
    expect(actualTests, 'commented').to.not.include('Math: should test (3-4)*8 SHOULD EQUAL -8');
    expect(skippedTests, 'commented').to.not.include('Math: should test (3-4)*8 SHOULD EQUAL -8');
    expect(skippedTests, 'xit').to.include('Math: should be clone');
    expect(skippedTests, 'it.skip').to.include('Math: should be second clone');
    expect(skippedTests, 'describe.skip').to.include('Math: NoMath: should be disabled');
    expect(skippedTestsLineNumbers).to.include(14);
    expect(skippedTestsLineNumbers).to.include(19);
    expect(skippedTestsLineNumbers).to.include(25);
    // assert.equal(tests.length, 3);
  });

  it('should parse all typescript files', () => {
    analyzer = new Analyzer('mocha', path.join(__dirname, '..'));
    analyzer.withTypeScript();
    analyzer.analyze('./example/protractor/**.ts');
    const decorator = analyzer.getDecorator();
    expect(decorator.getSuiteNames()).to.include('Login - Global Header: Institutional Sign In Modal');
  });

  it('should exclude dir in file name if dir specified', () => {
    analyzer = new Analyzer('mocha', 'example');
    analyzer.analyze('mocha/**_test.js');

    const tests = analyzer.getDecorator().getTests()
    expect(tests.length).to.be.above(0);
    expect(tests[0].file.startsWith('mocha/')).to.be.true
  });

  it('should include full dir in file name', () => {
    analyzer = new Analyzer('mocha');
    analyzer.analyze('example/mocha/**_test.js');

    const tests = analyzer.getDecorator().getTests()
    expect(tests.length).to.be.above(0);
    expect(tests[0].file.startsWith('example')).to.be.true
  });

  it('should avoid node_modules', () => {
    analyzer = new Analyzer('mocha', path.join(__dirname, '..'));
    analyzer.analyze('./example/dummy/**_test.js');

    const stats = analyzer.getStats();
    const actualTests = stats.tests;
    const skippedTests = stats.skipped;
    const decorator = analyzer.getDecorator();

    const skippedTestsLineNumbers = decorator.tests.filter(t => t.skipped).map(t => t.line);
    expect(decorator.getSuiteNames()).to.include('Math');
    expect(decorator.getSuiteNames()).to.not.include('Empty');

    expect(actualTests).to.include('Math: should test');
    expect(actualTests).to.not.include('Empty: should test');
  });



  it('should not load dirs as files', () => {
    analyzer = new Analyzer('mocha', path.join(__dirname, '..'));
    analyzer.analyze('./example/dummy/**.js');

    const stats = analyzer.getStats();
    const actualTests = stats.tests;
    const skippedTests = stats.skipped;
    const decorator = analyzer.getDecorator();

    const skippedTestsLineNumbers = decorator.tests.filter(t => t.skipped).map(t => t.line);
    expect(decorator.getSuiteNames()).to.include('Math');
  });



});