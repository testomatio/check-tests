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
});
