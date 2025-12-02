const { expect } = require('chai');
const Analyzer = require('../src/analyzer');
const fs = require('fs');
const path = require('path');

const TESTOMATIO_ID_REGEX = /@T[a-fA-F0-9]{1,}/;

describe('--require-ids functionality', () => {
  const tempDir = path.join(__dirname, 'temp-require-ids');
  const testFile = path.join(tempDir, 'test.js');

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
  });

  afterEach(() => {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }
  });

  it('should pass when all tests have Testomat.io IDs', () => {
    const testContent = `
      const assert = require('assert');

      describe('Test Suite', () => {
        it('should test case 1 @T1a2b3c4d', () => {
          assert.strictEqual(1 + 1, 2);
        });

        it('should test case 2 @T2b3c4d5e', () => {
          assert.strictEqual(2 + 2, 4);
        });
      });`;

    fs.writeFileSync(testFile, testContent);

    const analyzer = new Analyzer('mocha', tempDir);
    analyzer.analyze('**/*.js');

    const decorator = analyzer.getDecorator();

    const testsMissingIds = decorator
      .getTests()
      .filter(test => !test.skipped)
      .filter(test => !TESTOMATIO_ID_REGEX.test(test.name));

    expect(testsMissingIds.length).to.equal(0);
  });

  it('should detect tests missing Testomat.io IDs', () => {
    const testContent = `
      const assert = require('assert');

      describe('Test Suite', () => {
        it('should test case 1 @T1a2b3c4d', () => {
          assert.strictEqual(1 + 1, 2);
        });

        it('should test case 2 without ID', () => {
          assert.strictEqual(2 + 2, 4);
        });

        it('should also test case 3 without ID', () => {
          assert.strictEqual(3 + 3, 6);
        });
      });`;

    fs.writeFileSync(testFile, testContent);

    const analyzer = new Analyzer('mocha', tempDir);
    analyzer.analyze('**/*.js');

    const decorator = analyzer.getDecorator();

    const testsMissingIds = decorator
      .getTests()
      .filter(test => !test.skipped)
      .filter(test => !TESTOMATIO_ID_REGEX.test(test.name));

    expect(testsMissingIds.length).to.equal(2);
    expect(testsMissingIds[0].name).to.equal('should test case 2 without ID');
    expect(testsMissingIds[1].name).to.equal('should also test case 3 without ID');
  });

  it('should ignore skipped tests when checking for missing IDs', () => {
    const testContent = `
      const assert = require('assert');

      describe('Test Suite', () => {
        it('should test case 1 @T1a2b3c4d', () => {
          assert.strictEqual(1 + 1, 2);
        });

        it.skip('should be skipped and not require ID', () => {
          assert.strictEqual(2 + 2, 4);
        });

        it('should test case 3 without ID', () => {
          assert.strictEqual(3 + 3, 6);
        });
      });`;

    fs.writeFileSync(testFile, testContent);

    const analyzer = new Analyzer('mocha', tempDir);
    analyzer.analyze('**/*.js');

    const decorator = analyzer.getDecorator();

    const testsMissingIds = decorator
      .getTests()
      .filter(test => !test.skipped)
      .filter(test => !TESTOMATIO_ID_REGEX.test(test.name));

    expect(testsMissingIds.length).to.equal(1);
    expect(testsMissingIds[0].name).to.equal('should test case 3 without ID');
  });
});
