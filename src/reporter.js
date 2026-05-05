const URL = process.env.TESTOMATIO_URL || 'https://app.testomat.io';
const isHttps = URL.startsWith('https');
const debug = require('debug')('testomatio:ids');
const { request } = isHttps ? require('https') : require('http');
const path = require('path');
const fs = require('fs');

class Reporter {
  constructor(apiKey, framework, workDir) {
    if (!framework) {
      console.error('Framework cannot be empty');
    }
    if (!apiKey) {
      console.error('Cant send report, api key not set');
    }
    this.apiKey = apiKey;
    this.framework = framework;
    this.workDir = workDir || process.cwd();
    this.tests = [];
    this.files = {};
    this.maxChunkBytes = 1 * 1024 * 1024;
    this.maxChunkFiles = 100;
    this.maxChunkTests = 500;
  }

  addTests(tests) {
    this.tests = this.tests.concat(tests);
  }

  attachFiles() {
    this.files = {};

    const uniqueFiles = [...new Set(this.tests.map(test => test.file).filter(f => !!f))];

    for (const fileName of uniqueFiles) {
      try {
        this.files[fileName] = fs.readFileSync(path.resolve(this.workDir, fileName), 'utf8');
      } catch (err) {
        debug(`Error reading file ${fileName}: ${err.message}`);
      }
    }
  }

  getFilesFromServer(exportAutomated) {
    return new Promise((res, rej) => {
      debug('Getting files from Testomat.io...');
      const req = request(
        `${URL.trim()}/api/test_data?with_files=true&api_key=${this.apiKey}&export_automated=${exportAutomated}`,
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

  async send(opts = {}) {
    console.log('\n 🚀 Sending data to testomat.io\n');

    this.tests = this.prepareTests();
    const payloadOpts = this.buildUploadOptions(opts);
    this.attachFiles();

    const chunks = this.createUploadChunks(payloadOpts);
    if (chunks.length > 1) {
      await this.sendInChunks(payloadOpts, chunks);
      return;
    }

    const data = this.buildPayload(payloadOpts, this.tests, this.files);
    await this.sendRequest(data);
  }

  prepareTests() {
    const labelsFromEnv = this.parseLabels(process.env.TESTOMATIO_LABELS || process.env.TESTOMATIO_SYNC_LABELS);

    return this.tests.map(test => {
      const nextTest = { ...test };

      if (process.env.TESTOMATIO_WORKDIR && nextTest.file) {
        const workdir = path.resolve(process.env.TESTOMATIO_WORKDIR);
        const absoluteTestPath = path.resolve(nextTest.file);
        nextTest.file = path.relative(workdir, absoluteTestPath);
      }

      nextTest.file = nextTest.file?.replace(/\\/g, '/');

      if (labelsFromEnv.length > 0) {
        nextTest.labels = labelsFromEnv;
      }

      return nextTest;
    });
  }

  buildUploadOptions(opts = {}) {
    const nextOpts = { ...opts };

    if (process.env.TESTOMATIO_PREPEND_DIR) nextOpts.dir = process.env.TESTOMATIO_PREPEND_DIR;
    if (process.env.TESTOMATIO_SUITE) nextOpts.suite = process.env.TESTOMATIO_SUITE;

    return nextOpts;
  }

  buildPayload(opts = {}, tests = this.tests, files = this.files, extra = {}) {
    return JSON.stringify({ ...opts, ...extra, tests, framework: this.framework, files });
  }

  createUploadChunks(opts = {}) {
    if (this.tests.length === 0) {
      return [{ tests: this.tests, files: this.files }];
    }

    const groups = this.groupTestsByFile();
    const chunks = [];
    let currentChunk = { tests: [], files: {} };

    for (const group of groups) {
      const groupChunks = this.splitOversizedGroup(group, opts);

      for (const groupChunk of groupChunks) {
        const nextChunk = {
          tests: currentChunk.tests.concat(groupChunk.tests),
          files: { ...currentChunk.files, ...groupChunk.files },
        };
        const nextChunkFilesCount = Object.keys(nextChunk.files).length;
        const nextChunkTestsCount = nextChunk.tests.length;

        if (
          currentChunk.tests.length > 0 &&
          (this.getPayloadSize(opts, nextChunk.tests, nextChunk.files) > this.maxChunkBytes ||
            nextChunkFilesCount > this.maxChunkFiles ||
            nextChunkTestsCount > this.maxChunkTests)
        ) {
          chunks.push(currentChunk);
          currentChunk = groupChunk;
          continue;
        }

        currentChunk = nextChunk;
      }
    }

    if (currentChunk.tests.length > 0 || Object.keys(currentChunk.files).length > 0 || chunks.length === 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  groupTestsByFile() {
    const groups = [];
    const fileGroups = new Map();

    this.tests.forEach((test, index) => {
      const key = test.file || `__no_file__${index}`;

      if (!fileGroups.has(key)) {
        const group = {
          tests: [],
          files: test.file && this.files[test.file] !== undefined ? { [test.file]: this.files[test.file] } : {},
        };
        fileGroups.set(key, group);
        groups.push(group);
      }

      fileGroups.get(key).tests.push(test);
    });

    return groups;
  }

  splitOversizedGroup(group, opts = {}) {
    if (
      (this.getPayloadSize(opts, group.tests, group.files) <= this.maxChunkBytes &&
        group.tests.length <= this.maxChunkTests) ||
      group.tests.length <= 1
    ) {
      return [group];
    }

    const splitGroups = [];
    let currentGroup = { tests: [], files: group.files };

    for (const test of group.tests) {
      const nextGroup = {
        tests: currentGroup.tests.concat(test),
        files: group.files,
      };

      if (
        currentGroup.tests.length > 0 &&
        (this.getPayloadSize(opts, nextGroup.tests, nextGroup.files) > this.maxChunkBytes ||
          nextGroup.tests.length > this.maxChunkTests)
      ) {
        splitGroups.push(currentGroup);
        currentGroup = {
          tests: [test],
          files: group.files,
        };
        continue;
      }

      currentGroup = nextGroup;
    }

    if (currentGroup.tests.length > 0) {
      splitGroups.push(currentGroup);
    }

    return splitGroups;
  }

  getPayloadSize(opts = {}, tests = this.tests, files = this.files, extra = {}) {
    return Buffer.byteLength(this.buildPayload(opts, tests, files, extra));
  }

  async sendInChunks(opts, chunks) {
    let importId;

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      const extra = {
        chunk_upload: true,
        finish: index === chunks.length - 1,
      };

      if (importId) extra.import_id = importId;

      const response = await this.sendRequest(this.buildPayload(opts, chunk.tests, chunk.files, extra));

      if (response.statusCode >= 400) {
        throw new Error(response.body || `Chunk upload failed (${response.statusCode}: ${response.statusMessage})`);
      }

      if (index === 0) {
        importId = this.extractImportId(response.body);
        if (!importId && chunks.length > 1) {
          throw new Error('Chunk upload failed: import_id was not returned after the first chunk');
        }
      }
    }
  }

  extractImportId(message) {
    if (!message) return null;

    try {
      const parsed = JSON.parse(message);
      return parsed.import_id || null;
    } catch (err) {
      return null;
    }
  }

  sendRequest(data) {
    debug('Sending test data to Testomat.io', data);

    return new Promise((resolve, reject) => {
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

            resolve({
              statusCode: resp.statusCode,
              statusMessage: resp.statusMessage,
              body: message,
            });
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
