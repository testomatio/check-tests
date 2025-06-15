const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const Reporter = require('../src/reporter');

describe('Reporter', () => {
  let reporter;
  const mockApiKey = 'test-api-key';
  const mockFramework = 'manual';

  beforeEach(() => {
    reporter = new Reporter(mockApiKey, mockFramework);
  });

  describe('attachFiles', () => {
    it('should collect file contents for tests with file property', () => {
      const tests = [
        {
          name: 'Test 1',
          file: 'example/checkout.test.md',
          suites: ['Suite 1'],
        },
        {
          name: 'Test 2',
          file: 'example/test-specification.md',
          suites: ['Suite 2'],
        },
      ];

      reporter.addTests(tests);
      reporter.attachFiles();

      expect(reporter.files).to.have.property('example/checkout.test.md');
      expect(reporter.files).to.have.property('example/test-specification.md');
      expect(reporter.files['example/checkout.test.md']).to.be.a('string');
      expect(reporter.files['example/test-specification.md']).to.be.a('string');
      expect(reporter.files['example/checkout.test.md']).to.include('# Checkout Process');
      expect(reporter.files['example/test-specification.md']).to.include('# Test Specification Format');
    });

    it('should handle duplicate file paths', () => {
      const tests = [
        {
          name: 'Test 1',
          file: 'example/checkout.test.md',
          suites: ['Suite 1'],
        },
        {
          name: 'Test 2',
          file: 'example/checkout.test.md',
          suites: ['Suite 1'],
        },
      ];

      reporter.addTests(tests);
      reporter.attachFiles();

      expect(Object.keys(reporter.files)).to.have.length(1);
      expect(reporter.files).to.have.property('example/checkout.test.md');
    });

    it('should handle tests without file property', () => {
      const tests = [
        {
          name: 'Test 1',
          suites: ['Suite 1'],
        },
        {
          name: 'Test 2',
          file: 'example/checkout.test.md',
          suites: ['Suite 2'],
        },
      ];

      reporter.addTests(tests);
      reporter.attachFiles();

      expect(Object.keys(reporter.files)).to.have.length(1);
      expect(reporter.files).to.have.property('example/checkout.test.md');
    });

    it('should handle empty or null file properties', () => {
      const tests = [
        {
          name: 'Test 1',
          file: '',
          suites: ['Suite 1'],
        },
        {
          name: 'Test 2',
          file: null,
          suites: ['Suite 2'],
        },
        {
          name: 'Test 3',
          file: 'example/checkout.test.md',
          suites: ['Suite 3'],
        },
      ];

      reporter.addTests(tests);
      reporter.attachFiles();

      expect(Object.keys(reporter.files)).to.have.length(1);
      expect(reporter.files).to.have.property('example/checkout.test.md');
    });

    it('should handle non-existent files gracefully', () => {
      const tests = [
        {
          name: 'Test 1',
          file: 'non-existent-file.md',
          suites: ['Suite 1'],
        },
        {
          name: 'Test 2',
          file: 'example/checkout.test.md',
          suites: ['Suite 2'],
        },
      ];

      reporter.addTests(tests);
      reporter.attachFiles();

      expect(Object.keys(reporter.files)).to.have.length(1);
      expect(reporter.files).to.have.property('example/checkout.test.md');
      expect(reporter.files).to.not.have.property('non-existent-file.md');
    });

    it('should reset files on each call', () => {
      const tests1 = [
        {
          name: 'Test 1',
          file: 'example/checkout.test.md',
          suites: ['Suite 1'],
        },
      ];

      const tests2 = [
        {
          name: 'Test 2',
          file: 'example/test-specification.md',
          suites: ['Suite 2'],
        },
      ];

      reporter.addTests(tests1);
      reporter.attachFiles();
      expect(reporter.files).to.have.property('example/checkout.test.md');

      reporter.tests = []; // Clear tests
      reporter.addTests(tests2);
      reporter.attachFiles();

      expect(reporter.files).to.not.have.property('example/checkout.test.md');
      expect(reporter.files).to.have.property('example/test-specification.md');
    });

    it('should handle relative file paths correctly', () => {
      const tests = [
        {
          name: 'Test 1',
          file: './example/checkout.test.md',
          suites: ['Suite 1'],
        },
      ];

      reporter.addTests(tests);
      reporter.attachFiles();

      expect(reporter.files).to.have.property('./example/checkout.test.md');
      expect(reporter.files['./example/checkout.test.md']).to.be.a('string');
      expect(reporter.files['./example/checkout.test.md']).to.include('# Checkout Process');
    });
  });

  describe('send method integration', () => {
    it('should include files property in payload', done => {
      const tests = [
        {
          name: 'Test 1',
          file: 'example/checkout.test.md',
          suites: ['Suite 1'],
        },
      ];

      reporter.addTests(tests);

      // Mock the send method to check payload
      const originalSend = reporter.send;
      reporter.send = function (opts = {}) {
        this.attachFiles();
        const payload = { ...opts, tests: this.tests, framework: this.framework, files: this.files };

        expect(payload).to.have.property('files');
        expect(payload.files).to.have.property('example/checkout.test.md');
        expect(payload.files['example/checkout.test.md']).to.be.a('string');

        done();
        return Promise.resolve();
      };

      reporter.send();
    });
  });
});
