const URL = process.env.TESTOMATIO_URL || 'https://app.testomat.io';
const isHttps = URL.startsWith('https');
const debug = require('debug')('testomatio:ids');
const { request } = isHttps ? require('https') : require('http');
const path = require('path');
const fs = require('fs');

class Reporter {
  constructor(apiKey, framework) {
    if (!framework) {
      console.error('Framework cannot be empty');
    }
    if (!apiKey) {
      console.error('Cant send report, api key not set');
    }
    this.apiKey = apiKey;
    this.framework = framework;
    this.tests = [];
    this.files = {};
  }

  addTests(tests) {
    this.tests = this.tests.concat(tests);
  }

  attachFiles() {
    this.files = {};

    const uniqueFiles = [...new Set(this.tests.map(test => test.file).filter(f => !!f))];

    for (const fileName of uniqueFiles) {
      try {
        this.files[fileName] = fs.readFileSync(path.resolve(fileName), 'utf8');
      } catch (err) {
        debug(`Error reading file ${fileName}: ${err.message}`);
      }
    }
  }

  getFilesFromServer() {
    return new Promise((res, rej) => {
      debug('Getting files from Testomat.io...');
      const req = request(
        `${URL.trim()}/api/test_data?with_files=true&api_key=${this.apiKey}`,
        { method: 'GET' },
        resp => {
          // The whole response has been received. Print out the result.
          let message = '';

          resp.on('end', () => {
            debug('Files fetched from Testomat.io', message);
            if (resp.statusCode !== 200) {
              debug('Files fetch failed', resp.statusCode, resp.statusMessage, message);
              rej(message);
            } else {
              res(JSON.parse(message));
            }
          });

          resp.on('data', chunk => {
            message += chunk.toString();
          });

          resp.on('aborted', () => {
            console.log(' ✖️ Files were not fetched from Testomat.io');
          });
        },
      );

      req.on('error', err => {
        console.log(`Error: ${err.message}`);
        rej(err);
      });

      req.end();
    });
  }

  parseLabels(labelsString) {
    if (!labelsString) return [];

    // Handle comma-separated values like "label1,label2,label3"
    return labelsString
      .split(',')
      .map(label => label.trim())
      .filter(label => label.length > 0);
  }

  getIds() {
    return new Promise((res, rej) => {
      debug('Getting ids from Testomat.io...');
      const req = request(`${URL.trim()}/api/test_data?api_key=${this.apiKey}`, { method: 'GET' }, resp => {
        // The whole response has been received. Print out the result.
        let message = '';

        resp.on('end', () => {
          debug('Data fetched from Testomat.io', message);
          if (resp.statusCode !== 200) {
            debug('Data fetch failed', resp.statusCode, resp.statusMessage, message);
            rej(message);
          } else {
            res(JSON.parse(message));
          }
        });

        resp.on('data', chunk => {
          message += chunk.toString();
        });

        resp.on('aborted', () => {
          console.log(' ✖️ Data was not sent to Testomat.io');
        });
      });

      req.on('error', err => {
        console.log(`Error: ${err.message}`);
        rej(err);
      });

      req.end();
    });
  }

  send(opts = {}) {
    return new Promise((resolve, reject) => {
      console.log('\n 🚀 Sending data to testomat.io\n');

      // Parse labels from environment variable (supports both TESTOMATIO_LABELS and TESTOMATIO_SYNC_LABELS)
      const labelsFromEnv = this.parseLabels(process.env.TESTOMATIO_LABELS || process.env.TESTOMATIO_SYNC_LABELS);

      const tests = this.tests.map(test => {
        // make file path relative to TESTOMATIO_WORKDIR if provided
        if (process.env.TESTOMATIO_WORKDIR && test.file) {
          const workdir = path.resolve(process.env.TESTOMATIO_WORKDIR);
          const absoluteTestPath = path.resolve(test.file);
          test.file = path.relative(workdir, absoluteTestPath);
        }

        // unify path to use slashes (prevent backslashes on windows)
        test.file = test.file?.replace(/\\/g, '/');

        // Apply labels to each test
        if (labelsFromEnv.length > 0) {
          test.labels = labelsFromEnv;
        }

        return test;
      });
      this.tests = tests;

      if (process.env.TESTOMATIO_PREPEND_DIR) opts.dir = process.env.TESTOMATIO_PREPEND_DIR;
      if (process.env.TESTOMATIO_SUITE) opts.suite = process.env.TESTOMATIO_SUITE;

      this.attachFiles();

      const data = JSON.stringify({ ...opts, tests: this.tests, framework: this.framework, files: this.files });

      debug('Sending test data to Testomat.io', data);
      const req = request(
        `${URL.trim()}/api/load?api_key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
          },
        },
        resp => {
          // The whole response has been received. Print out the result.
          let message = '';

          resp.on('end', () => {
            if (resp.statusCode >= 400) {
              console.log(' ✖️ ', message, `(${resp.statusCode}: ${resp.statusMessage})`);
            } else {
              console.log(' 🎉 Data received at Testomat.io');
            }
            resolve();
          });

          resp.on('data', chunk => {
            message += chunk.toString();
          });

          resp.on('aborted', () => {
            console.log(' ✖️ Data was not sent to Testomat.io');
            // eslint-disable-next-line prefer-promise-reject-errors
            reject('aborted');
          });
        },
      );

      req.on('error', err => {
        console.log(`Error: ${err.message}`);
        reject(err);
      });

      req.write(data);
      req.end();
    });
  }
}

module.exports = Reporter;
