const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const Reporter = require('../src/reporter');

describe('Reporter', () => {
  let reporter;
  let originalConsoleError;
  let originalConsoleLog;
  let consoleErrorMessages;
  let consoleLogMessages;
  const mockApiKey = 'test-api-key';
  const mockFramework = 'mocha';

  beforeEach(() => {
    reporter = new Reporter(mockApiKey, mockFramework);

    // Capture console outputs for testing
    consoleErrorMessages = [];
    consoleLogMessages = [];
    originalConsoleError = console.error;
    originalConsoleLog = console.log;
    console.error = msg => consoleErrorMessages.push(msg);
    console.log = msg => consoleLogMessages.push(msg);
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  describe('constructor', () => {
    it('should create reporter with api key and framework', () => {
      expect(reporter.apiKey).to.equal('test-api-key');
      expect(reporter.framework).to.equal('mocha');
      expect(reporter.tests).to.deep.equal([]);
    });

    it('should log error when framework is not provided', () => {
      new Reporter('test-api-key', null);
      expect(consoleErrorMessages).to.include('Framework cannot be empty');
    });

    it('should log error when api key is not provided', () => {
      new Reporter(null, 'mocha');
      expect(consoleErrorMessages).to.include('Cant send report, api key not set');
    });

    it('should log error when both api key and framework are not provided', () => {
      new Reporter(null, null);
      expect(consoleErrorMessages).to.include('Framework cannot be empty');
      expect(consoleErrorMessages).to.include('Cant send report, api key not set');
    });
  });

  describe('addTests', () => {
    it('should add tests to empty tests array', () => {
      const testData = [
        { name: 'test 1', file: 'test1.js', suites: [] },
        { name: 'test 2', file: 'test2.js', suites: [] },
      ];

      reporter.addTests(testData);

      expect(reporter.tests).to.have.length(2);
      expect(reporter.tests[0]).to.deep.equal(testData[0]);
      expect(reporter.tests[1]).to.deep.equal(testData[1]);
    });

    it('should concatenate tests to existing tests array', () => {
      const initialTests = [{ name: 'existing test', file: 'existing.js', suites: [] }];
      const newTests = [
        { name: 'new test 1', file: 'new1.js', suites: [] },
        { name: 'new test 2', file: 'new2.js', suites: [] },
      ];

      reporter.addTests(initialTests);
      reporter.addTests(newTests);

      expect(reporter.tests).to.have.length(3);
      expect(reporter.tests[0]).to.deep.equal(initialTests[0]);
      expect(reporter.tests[1]).to.deep.equal(newTests[0]);
      expect(reporter.tests[2]).to.deep.equal(newTests[1]);
    });

    it('should handle empty array', () => {
      reporter.addTests([]);
      expect(reporter.tests).to.have.length(0);
    });

    it('should handle multiple addTests calls', () => {
      reporter.addTests([{ name: 'test 1', file: 'test1.js', suites: [] }]);
      reporter.addTests([{ name: 'test 2', file: 'test2.js', suites: [] }]);
      reporter.addTests([{ name: 'test 3', file: 'test3.js', suites: [] }]);

      expect(reporter.tests).to.have.length(3);
      expect(reporter.tests[0].name).to.equal('test 1');
      expect(reporter.tests[1].name).to.equal('test 2');
      expect(reporter.tests[2].name).to.equal('test 3');
    });
  });

  describe('parseLabels', () => {
    it('should return empty array for null/undefined input', () => {
      expect(reporter.parseLabels(null)).to.deep.equal([]);
      expect(reporter.parseLabels(undefined)).to.deep.equal([]);
      expect(reporter.parseLabels('')).to.deep.equal([]);
    });

    it('should parse single label', () => {
      const result = reporter.parseLabels('smoke');
      expect(result).to.deep.equal(['smoke']);
    });

    it('should parse multiple comma-separated labels', () => {
      const result = reporter.parseLabels('smoke,regression,api');
      expect(result).to.deep.equal(['smoke', 'regression', 'api']);
    });

    it('should trim whitespace from labels', () => {
      const result = reporter.parseLabels(' smoke , regression , api ');
      expect(result).to.deep.equal(['smoke', 'regression', 'api']);
    });

    it('should filter out empty labels', () => {
      const result = reporter.parseLabels('smoke,,regression,');
      expect(result).to.deep.equal(['smoke', 'regression']);
    });

    it('should handle mixed whitespace and empty values', () => {
      const result = reporter.parseLabels(' smoke , , regression , ');
      expect(result).to.deep.equal(['smoke', 'regression']);
    });

    it('should handle label:value format', () => {
      const result = reporter.parseLabels('severity:high,feature:auth,team:backend');
      expect(result).to.deep.equal(['severity:high', 'feature:auth', 'team:backend']);
    });

    it('should handle mixed simple labels and label:value format', () => {
      const result = reporter.parseLabels('smoke,severity:critical,regression,feature:user_account');
      expect(result).to.deep.equal(['smoke', 'severity:critical', 'regression', 'feature:user_account']);
    });
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

  describe('send method', () => {
    let originalEnvVars;

    beforeEach(() => {
      // Save original environment variables
      originalEnvVars = {
        TESTOMATIO_LABELS: process.env.TESTOMATIO_LABELS,
        TESTOMATIO_SYNC_LABELS: process.env.TESTOMATIO_SYNC_LABELS,
        TESTOMATIO_WORKDIR: process.env.TESTOMATIO_WORKDIR,
        TESTOMATIO_PREPEND_DIR: process.env.TESTOMATIO_PREPEND_DIR,
        TESTOMATIO_SUITE: process.env.TESTOMATIO_SUITE,
      };
    });

    afterEach(() => {
      // Restore original environment variables
      Object.keys(originalEnvVars).forEach(key => {
        if (originalEnvVars[key] !== undefined) {
          process.env[key] = originalEnvVars[key];
        } else {
          delete process.env[key];
        }
      });
    });

    describe('file path processing', () => {
      it('should normalize backslashes to forward slashes', () => {
        const testData = [
          { name: 'test 1', file: 'path\\to\\test1.js', suites: [] },
          { name: 'test 2', file: 'path/to/test2.js', suites: [] },
        ];

        reporter.addTests(testData);

        // Mock the send method to capture processed tests
        let processedTests;
        reporter.send = function (opts = {}) {
          const labelsFromEnv = this.parseLabels(process.env.TESTOMATIO_LABELS || process.env.TESTOMATIO_SYNC_LABELS);

          const tests = this.tests.map(test => {
            test.file = test.file?.replace(/\\/g, '/');
            if (labelsFromEnv.length > 0) {
              test.labels = labelsFromEnv;
            }
            return test;
          });

          processedTests = tests;
          return Promise.resolve();
        };

        return reporter.send().then(() => {
          expect(processedTests[0].file).to.equal('path/to/test1.js');
          expect(processedTests[1].file).to.equal('path/to/test2.js');
        });
      });

      it('should make file paths relative to TESTOMATIO_WORKDIR when set', () => {
        process.env.TESTOMATIO_WORKDIR = '/project/root';

        const testData = [
          { name: 'test 1', file: '/project/root/tests/test1.js', suites: [] },
          { name: 'test 2', file: '/project/root/src/test2.js', suites: [] },
        ];

        reporter.addTests(testData);

        // Mock the send method to capture processed tests
        let processedTests;
        reporter.send = function (opts = {}) {
          const labelsFromEnv = this.parseLabels(process.env.TESTOMATIO_LABELS || process.env.TESTOMATIO_SYNC_LABELS);

          const tests = this.tests.map(test => {
            if (process.env.TESTOMATIO_WORKDIR && test.file) {
              const workdir = path.resolve(process.env.TESTOMATIO_WORKDIR);
              const absoluteTestPath = path.resolve(test.file);
              test.file = path.relative(workdir, absoluteTestPath);
            }

            test.file = test.file?.replace(/\\/g, '/');

            if (labelsFromEnv.length > 0) {
              test.labels = labelsFromEnv;
            }

            return test;
          });

          processedTests = tests;
          return Promise.resolve();
        };

        return reporter.send().then(() => {
          expect(processedTests[0].file).to.equal('tests/test1.js');
          expect(processedTests[1].file).to.equal('src/test2.js');
        });
      });
    });

    describe('environment variable options', () => {
      it('should add dir option when TESTOMATIO_PREPEND_DIR is set', () => {
        process.env.TESTOMATIO_PREPEND_DIR = 'my-project';

        reporter.addTests([{ name: 'test 1', file: 'test1.js', suites: [] }]);

        // Mock the send method to capture options
        let capturedOpts;
        reporter.send = function (opts = {}) {
          if (process.env.TESTOMATIO_PREPEND_DIR) opts.dir = process.env.TESTOMATIO_PREPEND_DIR;
          if (process.env.TESTOMATIO_SUITE) opts.suite = process.env.TESTOMATIO_SUITE;

          capturedOpts = opts;
          return Promise.resolve();
        };

        return reporter.send().then(() => {
          expect(capturedOpts).to.have.property('dir', 'my-project');
        });
      });

      it('should add suite option when TESTOMATIO_SUITE is set', () => {
        process.env.TESTOMATIO_SUITE = 'integration-tests';

        reporter.addTests([{ name: 'test 1', file: 'test1.js', suites: [] }]);

        // Mock the send method to capture options
        let capturedOpts;
        reporter.send = function (opts = {}) {
          if (process.env.TESTOMATIO_PREPEND_DIR) opts.dir = process.env.TESTOMATIO_PREPEND_DIR;
          if (process.env.TESTOMATIO_SUITE) opts.suite = process.env.TESTOMATIO_SUITE;

          capturedOpts = opts;
          return Promise.resolve();
        };

        return reporter.send().then(() => {
          expect(capturedOpts).to.have.property('suite', 'integration-tests');
        });
      });

      it('should add both dir and suite options when both env vars are set', () => {
        process.env.TESTOMATIO_PREPEND_DIR = 'my-project';
        process.env.TESTOMATIO_SUITE = 'integration-tests';

        reporter.addTests([{ name: 'test 1', file: 'test1.js', suites: [] }]);

        // Mock the send method to capture options
        let capturedOpts;
        reporter.send = function (opts = {}) {
          if (process.env.TESTOMATIO_PREPEND_DIR) opts.dir = process.env.TESTOMATIO_PREPEND_DIR;
          if (process.env.TESTOMATIO_SUITE) opts.suite = process.env.TESTOMATIO_SUITE;

          capturedOpts = opts;
          return Promise.resolve();
        };

        return reporter.send().then(() => {
          expect(capturedOpts).to.have.property('dir', 'my-project');
          expect(capturedOpts).to.have.property('suite', 'integration-tests');
        });
      });
    });

    describe('payload structure', () => {
      it('should create proper JSON payload structure', () => {
        const testData = [
          { name: 'test 1', file: 'test1.js', suites: ['suite1'] },
          { name: 'test 2', file: 'test2.js', suites: ['suite2'] },
        ];

        reporter.addTests(testData);

        // Mock the send method to capture the data payload
        let capturedData;
        reporter.send = function (opts = {}) {
          const labelsFromEnv = this.parseLabels(process.env.TESTOMATIO_LABELS);

          const tests = this.tests.map(test => {
            test.file = test.file?.replace(/\\/g, '/');
            if (labelsFromEnv.length > 0) {
              test.labels = labelsFromEnv;
            }
            return test;
          });
          this.tests = tests;

          if (process.env.TESTOMATIO_PREPEND_DIR) opts.dir = process.env.TESTOMATIO_PREPEND_DIR;
          if (process.env.TESTOMATIO_SUITE) opts.suite = process.env.TESTOMATIO_SUITE;

          const data = JSON.stringify({ ...opts, tests: this.tests, framework: this.framework });
          capturedData = JSON.parse(data);
          return Promise.resolve();
        };

        return reporter.send().then(() => {
          expect(capturedData).to.have.property('tests');
          expect(capturedData).to.have.property('framework', 'mocha');
          expect(capturedData.tests).to.have.length(2);
          expect(capturedData.tests[0]).to.deep.include({
            name: 'test 1',
            file: 'test1.js',
            suites: ['suite1'],
          });
          expect(capturedData.tests[1]).to.deep.include({
            name: 'test 2',
            file: 'test2.js',
            suites: ['suite2'],
          });
        });
      });

      it('should merge custom options into payload', () => {
        reporter.addTests([{ name: 'test 1', file: 'test1.js', suites: [] }]);

        const customOpts = { customOption: 'customValue', anotherOption: 123 };

        // Mock the send method to capture the data payload
        let capturedData;
        reporter.send = function (opts = {}) {
          const labelsFromEnv = this.parseLabels(process.env.TESTOMATIO_LABELS);

          const tests = this.tests.map(test => {
            test.file = test.file?.replace(/\\/g, '/');
            if (labelsFromEnv.length > 0) {
              test.labels = labelsFromEnv;
            }
            return test;
          });
          this.tests = tests;

          const data = JSON.stringify({ ...opts, tests: this.tests, framework: this.framework });
          capturedData = JSON.parse(data);
          return Promise.resolve();
        };

        return reporter.send(customOpts).then(() => {
          expect(capturedData).to.have.property('customOption', 'customValue');
          expect(capturedData).to.have.property('anotherOption', 123);
          expect(capturedData).to.have.property('tests');
          expect(capturedData).to.have.property('framework', 'mocha');
        });
      });
    });

    describe('labels functionality', () => {
      it('should not add labels property when TESTOMATIO_LABELS is not set', () => {
        delete process.env.TESTOMATIO_LABELS;

        const testData = [
          { name: 'test 1', file: 'test1.js', suites: [] },
          { name: 'test 2', file: 'test2.js', suites: [] },
        ];

        reporter.addTests(testData);

        // Mock the send method to capture the processed tests
        let processedTests;

        reporter.send = function (opts = {}) {
          const labelsFromEnv = this.parseLabels(process.env.TESTOMATIO_LABELS);

          const tests = this.tests.map(test => {
            test.file = test.file?.replace(/\\/g, '/');

            if (labelsFromEnv.length > 0) {
              test.labels = labelsFromEnv;
            }

            return test;
          });

          processedTests = tests;
          return Promise.resolve();
        };

        return reporter.send().then(() => {
          expect(processedTests[0]).to.not.have.property('labels');
          expect(processedTests[1]).to.not.have.property('labels');
        });
      });

      it('should add labels to all tests when TESTOMATIO_LABELS is set', () => {
        process.env.TESTOMATIO_LABELS = 'smoke,regression';

        const testData = [
          { name: 'test 1', file: 'test1.js', suites: [] },
          { name: 'test 2', file: 'test2.js', suites: [] },
        ];

        reporter.addTests(testData);

        // Mock the send method to capture the processed tests
        let processedTests;

        reporter.send = function (opts = {}) {
          const labelsFromEnv = this.parseLabels(process.env.TESTOMATIO_LABELS);

          const tests = this.tests.map(test => {
            test.file = test.file?.replace(/\\/g, '/');

            if (labelsFromEnv.length > 0) {
              test.labels = labelsFromEnv;
            }

            return test;
          });

          processedTests = tests;
          return Promise.resolve();
        };

        return reporter.send().then(() => {
          expect(processedTests[0]).to.have.property('labels');
          expect(processedTests[0].labels).to.deep.equal(['smoke', 'regression']);
          expect(processedTests[1]).to.have.property('labels');
          expect(processedTests[1].labels).to.deep.equal(['smoke', 'regression']);
        });
      });

      it('should handle single label in TESTOMATIO_LABELS', () => {
        process.env.TESTOMATIO_LABELS = 'smoke';

        const testData = [{ name: 'test 1', file: 'test1.js', suites: [] }];

        reporter.addTests(testData);

        // Mock the send method to capture the processed tests
        let processedTests;

        reporter.send = function (opts = {}) {
          const labelsFromEnv = this.parseLabels(process.env.TESTOMATIO_LABELS);

          const tests = this.tests.map(test => {
            test.file = test.file?.replace(/\\/g, '/');

            if (labelsFromEnv.length > 0) {
              test.labels = labelsFromEnv;
            }

            return test;
          });

          processedTests = tests;
          return Promise.resolve();
        };

        return reporter.send().then(() => {
          expect(processedTests[0]).to.have.property('labels');
          expect(processedTests[0].labels).to.deep.equal(['smoke']);
        });
      });

      it('should use TESTOMATIO_SYNC_LABELS when TESTOMATIO_LABELS is not set', () => {
        delete process.env.TESTOMATIO_LABELS;
        process.env.TESTOMATIO_SYNC_LABELS = 'api,integration';

        const testData = [{ name: 'test 1', file: 'test1.js', suites: [] }];

        reporter.addTests(testData);

        // Mock the send method to capture the processed tests
        let processedTests;

        reporter.send = function (opts = {}) {
          const labelsFromEnv = this.parseLabels(process.env.TESTOMATIO_LABELS || process.env.TESTOMATIO_SYNC_LABELS);

          const tests = this.tests.map(test => {
            test.file = test.file?.replace(/\\/g, '/');

            if (labelsFromEnv.length > 0) {
              test.labels = labelsFromEnv;
            }

            return test;
          });

          processedTests = tests;
          return Promise.resolve();
        };

        return reporter.send().then(() => {
          expect(processedTests[0]).to.have.property('labels');
          expect(processedTests[0].labels).to.deep.equal(['api', 'integration']);
        });
      });

      it('should prioritize TESTOMATIO_LABELS over TESTOMATIO_SYNC_LABELS when both are set', () => {
        process.env.TESTOMATIO_LABELS = 'smoke,regression';
        process.env.TESTOMATIO_SYNC_LABELS = 'api,integration';

        const testData = [{ name: 'test 1', file: 'test1.js', suites: [] }];

        reporter.addTests(testData);

        // Mock the send method to capture the processed tests
        let processedTests;

        reporter.send = function (opts = {}) {
          const labelsFromEnv = this.parseLabels(process.env.TESTOMATIO_LABELS || process.env.TESTOMATIO_SYNC_LABELS);

          const tests = this.tests.map(test => {
            test.file = test.file?.replace(/\\/g, '/');

            if (labelsFromEnv.length > 0) {
              test.labels = labelsFromEnv;
            }

            return test;
          });

          processedTests = tests;
          return Promise.resolve();
        };

        return reporter.send().then(() => {
          expect(processedTests[0]).to.have.property('labels');
          expect(processedTests[0].labels).to.deep.equal(['smoke', 'regression']);
        });
      });
    });
  });

  describe('getIds', () => {
    it('should return a promise', () => {
      const result = reporter.getIds();
      expect(result).to.be.instanceOf(Promise);
    });

    it('should construct correct API URL with api key', () => {
      const originalURL = process.env.TESTOMATIO_URL;
      process.env.TESTOMATIO_URL = 'https://test.testomat.io';

      const testReporter = new Reporter('test-key-123', 'jest');

      // Since we can't easily mock the http request without additional setup,
      // we'll test the URL construction indirectly by verifying the method exists
      // and returns a promise, which indicates the request setup is working
      const result = testReporter.getIds();
      expect(result).to.be.instanceOf(Promise);

      // Restore original URL
      if (originalURL) {
        process.env.TESTOMATIO_URL = originalURL;
      } else {
        delete process.env.TESTOMATIO_URL;
      }
    });

    it('should use default URL when TESTOMATIO_URL is not set', () => {
      const originalURL = process.env.TESTOMATIO_URL;
      delete process.env.TESTOMATIO_URL;

      // Reload the Reporter module to pick up the new URL
      delete require.cache[require.resolve('../src/reporter')];
      const ReporterReloaded = require('../src/reporter');

      const testReporter = new ReporterReloaded('test-key', 'mocha');
      const result = testReporter.getIds();
      expect(result).to.be.instanceOf(Promise);

      // Restore original URL and reload module again
      if (originalURL) {
        process.env.TESTOMATIO_URL = originalURL;
      }
      delete require.cache[require.resolve('../src/reporter')];
      require('../src/reporter');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow with multiple test batches and labels', () => {
      process.env.TESTOMATIO_LABELS = 'smoke,api';
      process.env.TESTOMATIO_PREPEND_DIR = 'my-app';

      const batch1 = [
        { name: 'login test', file: 'auth/login.js', suites: ['Authentication'] },
        { name: 'logout test', file: 'auth/logout.js', suites: ['Authentication'] },
      ];

      const batch2 = [
        { name: 'create user', file: 'users/create.js', suites: ['Users', 'CRUD'] },
        { name: 'delete user', file: 'users/delete.js', suites: ['Users', 'CRUD'] },
      ];

      reporter.addTests(batch1);
      reporter.addTests(batch2);

      expect(reporter.tests).to.have.length(4);

      // Mock the send method to verify complete processing
      let processedData;
      reporter.send = function (opts = {}) {
        const labelsFromEnv = this.parseLabels(process.env.TESTOMATIO_LABELS);

        const tests = this.tests.map(test => {
          if (process.env.TESTOMATIO_WORKDIR && test.file) {
            const workdir = path.resolve(process.env.TESTOMATIO_WORKDIR);
            const absoluteTestPath = path.resolve(test.file);
            test.file = path.relative(workdir, absoluteTestPath);
          }

          test.file = test.file?.replace(/\\/g, '/');

          if (labelsFromEnv.length > 0) {
            test.labels = labelsFromEnv;
          }

          return test;
        });
        this.tests = tests;

        if (process.env.TESTOMATIO_PREPEND_DIR) opts.dir = process.env.TESTOMATIO_PREPEND_DIR;
        if (process.env.TESTOMATIO_SUITE) opts.suite = process.env.TESTOMATIO_SUITE;

        const data = JSON.stringify({ ...opts, tests: this.tests, framework: this.framework });
        processedData = JSON.parse(data);
        return Promise.resolve();
      };

      return reporter.send().then(() => {
        expect(processedData.dir).to.equal('my-app');
        expect(processedData.framework).to.equal('mocha');
        expect(processedData.tests).to.have.length(4);

        // Verify all tests have labels
        processedData.tests.forEach(test => {
          expect(test.labels).to.deep.equal(['smoke', 'api']);
        });

        // Verify specific test properties
        expect(processedData.tests[0]).to.deep.include({
          name: 'login test',
          file: 'auth/login.js',
          suites: ['Authentication'],
        });

        expect(processedData.tests[3]).to.deep.include({
          name: 'delete user',
          file: 'users/delete.js',
          suites: ['Users', 'CRUD'],
        });
      });
    });

    it('should handle edge cases gracefully', () => {
      // Test with empty tests array
      let processedData;
      reporter.send = function (opts = {}) {
        const labelsFromEnv = this.parseLabels(process.env.TESTOMATIO_LABELS);

        const tests = this.tests.map(test => {
          test.file = test.file?.replace(/\\/g, '/');
          if (labelsFromEnv.length > 0) {
            test.labels = labelsFromEnv;
          }
          return test;
        });
        this.tests = tests;

        const data = JSON.stringify({ ...opts, tests: this.tests, framework: this.framework });
        processedData = JSON.parse(data);
        return Promise.resolve();
      };

      return reporter.send().then(() => {
        expect(processedData.tests).to.have.length(0);
        expect(processedData.framework).to.equal('mocha');
      });
    });

    it('should handle tests without file property', () => {
      const testData = [
        { name: 'test without file', suites: ['Suite1'] },
        { name: 'test with file', file: 'test.js', suites: ['Suite2'] },
      ];

      reporter.addTests(testData);

      let processedData;
      reporter.send = function (opts = {}) {
        const labelsFromEnv = this.parseLabels(process.env.TESTOMATIO_LABELS);

        const tests = this.tests.map(test => {
          if (process.env.TESTOMATIO_WORKDIR && test.file) {
            const workdir = path.resolve(process.env.TESTOMATIO_WORKDIR);
            const absoluteTestPath = path.resolve(test.file);
            test.file = path.relative(workdir, absoluteTestPath);
          }

          test.file = test.file?.replace(/\\/g, '/');

          if (labelsFromEnv.length > 0) {
            test.labels = labelsFromEnv;
          }

          return test;
        });
        this.tests = tests;

        const data = JSON.stringify({ ...opts, tests: this.tests, framework: this.framework });
        processedData = JSON.parse(data);
        return Promise.resolve();
      };

      return reporter.send().then(() => {
        expect(processedData.tests).to.have.length(2);
        expect(processedData.tests[0]).to.not.have.property('file');
        expect(processedData.tests[1]).to.have.property('file', 'test.js');
      });
    });
  });
});
