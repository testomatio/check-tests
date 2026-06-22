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

  context('single-line comments <!-- suite --> / <!-- test -->', () => {
    before(() => {
      source = fs.readFileSync('./example/single-line-comments.test.md').toString();
    });

    it('should extract all suite information for suites with single-line comments', () => {
      const tests = markdownParser(null, 'single-line-comments.test.md', source);

      expect(tests[0].suites).to.include('Suite A');
      expect(tests[1].suites).to.include('Suite B');
    });

    it('should extract all test information with single-line comments', () => {
      const tests = markdownParser(null, 'single-line-comments.test.md', source);

      expect(tests).to.have.length(2);
      expect(tests.map(t => t.name)).to.include('Test A1');
      expect(tests.map(t => t.name)).to.include('Test B1');
      tests.forEach(t => expect(t.manual).to.be.true);
    });
  });

  context('mixed single-line and multiline comments', () => {
    before(() => {
      source = fs.readFileSync('./example/mixed-comments.test.md').toString();
    });

    it('should parse file with mixed single-line and multiline comments', () => {
      const tests = markdownParser(null, 'mixed-comments.test.md', source);

      expect(tests).to.have.length(2);

      const testA1 = tests.find(t => t.name === 'Test A1');
      expect(testA1.suites).to.include('Suite A');
      expect(testA1.priority).to.equal('high');

      const testB1 = tests.find(t => t.name === 'Test B1');
      expect(testB1.suites).to.include('Suite B @S00000001');
    });
  });

  context('tags / labels comma-separated metadata (arrays)', () => {
    it('should split tags by comma, trim segments', () => {
      const md = `<!-- suite
id: @S1
-->
# Suite

<!-- test
id: @T1
tags:  smoke ,  critical
-->

## Case
`;
      const tests = markdownParser(null, 'tags.test.md', md);
      expect(tests).to.have.length(1);
      expect(tests[0].tags).to.deep.equal(['smoke', 'critical']);
    });

    it('should yield empty array when tags key has no values', () => {
      const md = `<!-- suite
id: @S1
-->
# S

<!-- test
tags:  
-->
## T
`;
      const tests = markdownParser(null, 'empty-tags.test.md', md);
      expect(tests[0].tags).to.deep.equal([]);
    });

    it('should parse single tag without comma', () => {
      const md = `<!-- suite
id: @S1
-->
# S

<!-- test
tags: smoke
-->
## T
`;
      const tests = markdownParser(null, 'single-tag.test.md', md);
      expect(tests[0].tags).to.deep.equal(['smoke']);
    });

    it('should parse labels like tags (comma split, trim)', () => {
      const md = `<!-- suite
id: @S1
-->
# S

<!-- test
labels: beta ,  qa-team
-->

## L
`;
      const tests = markdownParser(null, 'labels.test.md', md);
      expect(tests[0].labels).to.deep.equal(['beta', 'qa-team']);
    });

    it('should yield empty labels array when empty value', () => {
      const md = `<!-- suite
id: @S1
-->
# S

<!-- test
labels:
-->

## L
`;
      const tests = markdownParser(null, 'empty-labels.test.md', md);
      expect(tests[0].labels).to.deep.equal([]);
    });
  });
});
