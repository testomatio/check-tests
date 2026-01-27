const fs = require('fs');
const { expect } = require('chai');
const markdownParser = require('../src/lib/frameworks/markdown');

let source;

describe('manual (markdown) parser', () => {
  context('markdown manual tests', () => {
    before(() => {
      source = fs.readFileSync('./example/checkout.test.md').toString();
    });

    it('should parse markdown file', () => {
      const tests = markdownParser(null, 'checkout.test.md', source);

      expect(tests).to.have.length.greaterThan(0);

      const testNames = tests.map(t => t.name);
      expect(testNames).to.include('Successful Checkout with Valid Payment');
      expect(testNames).to.include('Checkout with Invalid Credit Card');
    });

    it('should extract suite information', () => {
      const tests = markdownParser(null, 'checkout.test.md', source);

      const firstTest = tests[0];
      expect(firstTest.suites).to.include('Checkout Process');
    });

    it('should mark tests as manual', () => {
      const tests = markdownParser(null, 'checkout.test.md', source);

      tests.forEach(test => {
        expect(test.manual).to.be.true;
      });
    });

    it('should include test metadata', () => {
      const tests = markdownParser(null, 'checkout.test.md', source);

      const highPriorityTest = tests.find(t => t.name === 'Successful Checkout with Valid Payment');
      expect(highPriorityTest.priority).to.equal('high');
    });

    it('should not include test content in code property', () => {
      const tests = markdownParser(null, 'checkout.test.md', source);

      const firstTest = tests[0];
      expect(firstTest).to.not.have.property('code');
    });

    it('should set correct line numbers', () => {
      const tests = markdownParser(null, 'checkout.test.md', source);

      tests.forEach(test => {
        expect(test.line).to.be.a('number');
        expect(test.line).to.be.greaterThan(0);
      });
    });
  });

  context('markdown multiple-suites', () => {
    before(() => {
      source = fs.readFileSync('./example/multi-suites.test.md').toString();
    });

    it('should parse markdown file with multiple suites', () => {
      const tests = markdownParser(null, 'multi-suites.test.md', source);

      expect(tests).to.have.length.greaterThan(0);

      const testNames = tests.map(t => t.name);
      expect(testNames).to.include('Test1');
      expect(testNames).to.include('Test2');
      expect(testNames).to.include('Test3');
    });

    it('should extract all suites information', () => {
      const tests = markdownParser(null, 'multi-suites.test.md', source);

      // Suite with suite id in meta
      const firstTest = tests[0];
      expect(firstTest.suites).to.include('Suite1 @Sf5ee38dj');

      // Nested suite names should be parsed correctly
      const secondTest = tests[1];
      expect(secondTest.suites).to.include('Suite1 > Suite2 @Sf5ee34dj');

      // Suite without suite id in meta
      const thirdTest = tests[2];
      expect(thirdTest.suites).to.include('Suite3');
    });
  });
});
