const fs = require('fs');
const { expect } = require('chai');
const gaugeParser = require('../src/lib/frameworks/gauge');

describe('gauge parser', () => {
  context('basic gauge specs', () => {
    let source;

    before(() => {
      source = fs.readFileSync('./example/gauge/example.spec').toString();
    });

    it('should parse specification title as suite', () => {
      const tests = gaugeParser(null, '', source);
      expect(tests.length).to.be.greaterThan(0);
      expect(tests[0].suites).to.include('Getting Started with Gauge');
    });

    it('should parse scenarios as tests', () => {
      const tests = gaugeParser(null, '', source);
      const testNames = tests.map(t => t.name);
      expect(testNames).to.include('Logo');
      expect(testNames).to.include('Get Started');
      expect(testNames).to.include('Documentation');
      expect(testNames).to.include('Plugins');
      expect(testNames).to.include('IDE Plugins');
      expect(testNames).to.include('Documentation Search');
    });

    it('should extract steps as test code', () => {
      const tests = gaugeParser(null, '', source);
      const logoTest = tests.find(t => t.name === 'Logo');
      expect(logoTest.code).to.include('* Display the Gauge logo');

      const getStartedTest = tests.find(t => t.name === 'Get Started');
      expect(getStartedTest.code).to.include('* Go to Gauge get started page');
      expect(getStartedTest.code).to.include('* Click on Quick Install');
      expect(getStartedTest.code).to.include('* Check "npm install -g @getgauge/cli" exists');
    });

    it('should handle line numbers correctly', () => {
      const tests = gaugeParser(null, '', source);
      const logoTest = tests.find(t => t.name === 'Logo');
      expect(logoTest.line).to.equal(12); // Line 12 is "Logo"
    });
  });

  context('gauge specs with tags', () => {
    let source;

    before(() => {
      source = fs.readFileSync('./example/gauge/selectors.spec').toString();
    });

    it('should handle tags correctly', () => {
      const tests = gaugeParser(null, '', source);
      const idTest = tests.find(t => t.name === 'Id');
      expect(idTest.tags).to.include('knownIssue');
    });

    it('should parse multiple scenarios with tags', () => {
      const tests = gaugeParser(null, '', source);
      expect(tests.length).to.equal(2);
      expect(tests[0].name).to.equal('Contains');
      expect(tests[1].name).to.equal('Id');
    });

    it('should include tables in test code', () => {
      const tests = gaugeParser(null, '', source);
      const containsTest = tests.find(t => t.name === 'Contains');
      expect(containsTest.code).to.include('|Type      |Selector       |');
      expect(containsTest.code).to.include('|inputField|{"id":"search"}|');
    });
  });

  context('gauge specs with alternative format', () => {
    let source;

    before(() => {
      source = fs.readFileSync('./example/gauge/HTMLElementsAPI.spec').toString();
    });

    it('should parse underlined specification title', () => {
      const tests = gaugeParser(null, '', source);
      expect(tests.length).to.be.greaterThan(0);
      expect(tests[0].suites).to.include('API');
    });

    it('should handle scenario tags', () => {
      const tests = gaugeParser(null, '', source);
      const radioTest = tests.find(t => t.name === 'Radio Button without for');
      expect(radioTest.tags).to.include('knownIssue');
    });
  });

  context('edge cases', () => {
    it('should handle empty file', () => {
      const tests = gaugeParser(null, '', '');
      expect(tests).to.be.an('array');
      expect(tests.length).to.equal(0);
    });

    it('should handle file with only specification', () => {
      const source = '# Only Specification\n\nNo scenarios here.';
      const tests = gaugeParser(null, '', source);
      expect(tests.length).to.equal(0);
    });

    it('should handle file with no tags', () => {
      const source = '# Test Spec\n\n## Test Scenario\n* Step 1\n* Step 2';
      const tests = gaugeParser(null, '', source);
      expect(tests[0].tags).to.be.an('array');
      expect(tests[0].tags.length).to.equal(0);
    });
  });

  context('with options', () => {
    let source;

    before(() => {
      source = fs.readFileSync('./example/gauge/example.spec').toString();
    });

    it('should respect noHooks option', () => {
      const tests = gaugeParser(null, '', source, { noHooks: true });
      expect(tests.length).to.be.greaterThan(0);
    });

    it('should respect lineNumbers option', () => {
      const tests = gaugeParser(null, '', source, { lineNumbers: true });
      expect(tests.length).to.be.greaterThan(0);
    });
  });
});
