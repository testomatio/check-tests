const URL = process.env.TESTOMATIO_URL || 'https://app.testomat.io';
const isHttps = URL.startsWith('https');
const debug = require('debug')('testomatio:ids');
const { request } = isHttps ? require('https') : require('http');
const path = require('path');
const fs = require('fs');
const { formatErrorMessage } = require('./lib/utils');
const { TEST_ID_REGEX } = require('./updateIds/constants');

const ALLOWED_ATTACHMENT_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;

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
    this.attachments = {};
    this.attachmentKeysByTestFile = {};
    this.maxChunkBytes = 1 * 1024 * 1024;
    this.maxChunkFiles = 100;
    this.maxChunkTests = 100;
  }

  addTests(tests) {
    this.tests = this.tests.concat(tests);
  }

  attachFiles(tests = this.tests) {
    const files = {};
    const uniqueFiles = [...new Set(tests.map(test => test.file).filter(f => !!f))];

    for (const fileName of uniqueFiles) {
      try {
        files[fileName] = fs.readFileSync(path.resolve(this.workDir, fileName), 'utf8');
      } catch (err) {
        debug(`Error reading file ${fileName}: ${err.message}`);
      }
    }

    this.files = files;
    return files;
  }

  getFilesFromServer(exportAutomated, suiteIds) {
    return new Promise((res, rej) => {
      debug('Getting files from Testomat.io...');
      const suiteIdsParam = suiteIds ? `&suite_ids=${encodeURIComponent(suiteIds)}` : '';
      const req = request(
        `${URL.trim()}/api/test_data?with_files=true&api_key=${
          this.apiKey
        }&export_automated=${exportAutomated}${suiteIdsParam}`,
        { method: 'GET' },
        resp => {
          // The whole response has been received. Print out the result.
          let message = '';

          resp.on('end', () => {
            debug('Files fetched from Testomat.io', message);
            if (resp.statusCode !== 200) {
              debug('Files fetch failed', resp.statusCode, resp.statusMessage, message);
              const error = new Error(
                formatErrorMessage({
                  statusCode: resp.statusCode,
                  statusMessage: resp.statusMessage,
                  body: message,
                }),
              );
              error.statusCode = resp.statusCode;
              error.statusMessage = resp.statusMessage;
              error.body = message;
              rej(error);
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
    const { newTests, existingTests } = this.splitTestsById(this.tests);

    if (this.framework !== 'manual' && newTests.length > 0 && existingTests.length > 0) {
      await this.sendInPhases(payloadOpts, newTests, existingTests);
      return;
    }

    this.attachFiles();

    const chunks = this.createUploadChunks(payloadOpts);
    if (chunks.length > 1) {
      this.logChunkedUploadStart(chunks.length);
      await this.sendInChunks(payloadOpts, chunks);
      return;
    }

    const data = this.buildPayload(payloadOpts, this.tests, this.files);
    await this.sendRequest(data);
  }

  prepareTests() {
    const labelsFromEnv = this.parseLabels(process.env.TESTOMATIO_LABELS || process.env.TESTOMATIO_SYNC_LABELS);
    this.attachments = {};
    this.attachmentKeysByTestFile = {};

    return this.tests.map(test => {
      const nextTest = { ...test };
      const attachmentPaths = nextTest.attachments;
      delete nextTest.attachments;

      if (process.env.TESTOMATIO_WORKDIR && nextTest.file) {
        const workdir = path.resolve(process.env.TESTOMATIO_WORKDIR);
        const absoluteTestPath = path.resolve(nextTest.file);
        nextTest.file = path.relative(workdir, absoluteTestPath);
      }

      nextTest.file = nextTest.file?.replace(/\\/g, '/');

      if (attachmentPaths && attachmentPaths.length) {
        const encoded = this.readAttachments(attachmentPaths, test.file);
        Object.assign(this.attachments, encoded);

        if (nextTest.file) {
          this.attachmentKeysByTestFile[nextTest.file] = (this.attachmentKeysByTestFile[nextTest.file] || []).concat(
            Object.keys(encoded),
          );
        }
      }

      if (labelsFromEnv.length > 0) {
        nextTest.labels = labelsFromEnv;
      }

      return nextTest;
    });
  }

  /**
   * Resolve attachment paths (relative to the test's own file) from disk,
   * base64-encode their contents, and key them by path relative to workDir.
   */
  readAttachments(attachmentPaths, testFile) {
    const encoded = {};
    const baseDir = testFile ? path.dirname(path.resolve(this.workDir, testFile)) : this.workDir;

    for (const attachmentPath of attachmentPaths) {
      if (!attachmentPath) continue;

      const absolutePath = path.resolve(baseDir, attachmentPath);
      const extension = path.extname(absolutePath).toLowerCase();

      if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(extension)) {
        console.log(
          ` ⚠️  Skipping attachment "${attachmentPath}": unsupported file type (allowed: ${[
            ...ALLOWED_ATTACHMENT_EXTENSIONS,
          ].join(', ')})`,
        );
        continue;
      }

      try {
        const { size } = fs.statSync(absolutePath);

        if (size > MAX_ATTACHMENT_SIZE_BYTES) {
          console.log(
            ` ⚠️  Skipping attachment "${attachmentPath}": file is ${this.formatChunkBytes(
              size,
            )}, exceeds the ${this.formatChunkBytes(MAX_ATTACHMENT_SIZE_BYTES)} limit`,
          );
          continue;
        }

        const content = fs.readFileSync(absolutePath);
        const key = path.relative(this.workDir, absolutePath).replace(/\\/g, '/');
        encoded[key] = content.toString('base64');
      } catch (err) {
        debug(`Error reading attachment ${attachmentPath}: ${err.message}`);
      }
    }

    return encoded;
  }

  buildUploadOptions(opts = {}) {
    const nextOpts = { ...opts };

    if (process.env.TESTOMATIO_PREPEND_DIR) nextOpts.dir = process.env.TESTOMATIO_PREPEND_DIR;
    if (process.env.TESTOMATIO_SUITE) nextOpts.suite = process.env.TESTOMATIO_SUITE;

    return nextOpts;
  }

  buildPayload(opts = {}, tests = this.tests, files = this.files, extra = {}, attachments = this.attachments) {
    return JSON.stringify({ ...opts, ...extra, tests, framework: this.framework, files, attachments });
  }

  splitTestsById(tests = this.tests) {
    return tests.reduce(
      (groups, test) => {
        if (this.hasTestId(test)) {
          groups.existingTests.push(test);
        } else {
          groups.newTests.push(test);
        }

        return groups;
      },
      { newTests: [], existingTests: [] },
    );
  }

  hasTestId(test) {
    if (typeof test.id === 'string' && test.id.trim()) return true;
    if (typeof test.name === 'string' && TEST_ID_REGEX.test(test.name)) return true;
    return false;
  }

  createUploadChunks(opts = {}, tests = this.tests, files = this.files, attachments = this.attachments) {
    if (tests.length === 0) {
      return [{ tests, files, attachments }];
    }

    const groups = this.groupTestsByFile(tests, files, attachments);
    const chunks = [];
    let currentChunk = { tests: [], files: {}, attachments: {} };

    for (const group of groups) {
      const groupChunks = this.splitOversizedGroup(group, opts);

      for (const groupChunk of groupChunks) {
        const nextChunk = {
          tests: currentChunk.tests.concat(groupChunk.tests),
          files: { ...currentChunk.files, ...groupChunk.files },
          attachments: { ...currentChunk.attachments, ...groupChunk.attachments },
        };
        const nextChunkFilesCount = Object.keys(nextChunk.files).length;
        const nextChunkTestsCount = nextChunk.tests.length;

        if (
          currentChunk.tests.length > 0 &&
          (this.getPayloadSize(opts, nextChunk.tests, nextChunk.files, {}, nextChunk.attachments) >
            this.maxChunkBytes ||
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

  groupTestsByFile(tests = this.tests, files = this.files, attachments = this.attachments) {
    const groups = [];
    const fileGroups = new Map();

    tests.forEach((test, index) => {
      const key = test.file || `__no_file__${index}`;

      if (!fileGroups.has(key)) {
        const group = {
          tests: [],
          files: test.file && files[test.file] !== undefined ? { [test.file]: files[test.file] } : {},
          attachments: {},
        };

        const attachmentKeys = test.file ? this.attachmentKeysByTestFile[test.file] : null;
        if (attachmentKeys) {
          for (const attachmentKey of attachmentKeys) {
            if (attachments[attachmentKey] !== undefined) group.attachments[attachmentKey] = attachments[attachmentKey];
          }
        }

        fileGroups.set(key, group);
        groups.push(group);
      }

      fileGroups.get(key).tests.push(test);
    });

    return groups;
  }

  splitOversizedGroup(group, opts = {}) {
    if (
      (this.getPayloadSize(opts, group.tests, group.files, {}, group.attachments) <= this.maxChunkBytes &&
        group.tests.length <= this.maxChunkTests) ||
      group.tests.length <= 1
    ) {
      return [group];
    }

    const splitGroups = [];
    let currentGroup = { tests: [], files: group.files, attachments: group.attachments };

    for (const test of group.tests) {
      const nextGroup = {
        tests: currentGroup.tests.concat(test),
        files: group.files,
        attachments: group.attachments,
      };

      if (
        currentGroup.tests.length > 0 &&
        (this.getPayloadSize(opts, nextGroup.tests, nextGroup.files, {}, nextGroup.attachments) > this.maxChunkBytes ||
          nextGroup.tests.length > this.maxChunkTests)
      ) {
        splitGroups.push(currentGroup);
        currentGroup = {
          tests: [test],
          files: group.files,
          attachments: group.attachments,
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

  getPayloadSize(opts = {}, tests = this.tests, files = this.files, extra = {}, attachments = this.attachments) {
    return Buffer.byteLength(this.buildPayload(opts, tests, files, extra, attachments));
  }

  logChunkedUploadStart(totalChunks) {
    console.log(`Chunked upload enabled: ${totalChunks} chunks`);
    console.log(
      `Chunk limits: ${this.formatChunkBytes(this.maxChunkBytes)}, ${this.maxChunkFiles} files, ${
        this.maxChunkTests
      } tests per chunk`,
    );
  }

  logChunkedUploadProgress(index, totalChunks) {
    console.log(`Uploading chunk ${index}/${totalChunks}...`);
  }

  logChunkedUploadComplete(totalChunks) {
    console.log(`🎉 Chunked upload completed: ${totalChunks}/${totalChunks} chunks sent`);
  }

  formatChunkBytes(bytes) {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    if (bytes % (1024 * 1024) === 0) {
      return `${bytes / (1024 * 1024)}.0 MB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async sendInPhases(opts, newTests, existingTests) {
    console.log(`Two-phase import enabled: ${newTests.length} new tests, ${existingTests.length} existing tests`);

    const newFiles = this.attachFiles(newTests);
    const newChunks = this.createUploadChunks(opts, newTests, newFiles);
    console.log('Phase 1/2: uploading new tests without ids');
    this.logChunkedUploadStart(newChunks.length);
    const importId = await this.sendInChunks(opts, newChunks, {
      finishLast: false,
      requireImportId: true,
    });

    const existingFiles = this.attachFiles(existingTests);
    const existingChunks = [{ tests: existingTests, files: existingFiles }];
    console.log('Phase 2/2: uploading existing tests with ids');
    this.logChunkedUploadStart(existingChunks.length);
    await this.sendInChunks(opts, existingChunks, {
      startImportId: importId,
      finishLast: true,
      requireImportId: false,
    });
  }

  async sendInChunks(opts, chunks, sendOpts = {}) {
    const { startImportId = null, finishLast = true, requireImportId = chunks.length > 1 } = sendOpts;
    let importId = startImportId;

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      this.logChunkedUploadProgress(index + 1, chunks.length);
      const extra = {
        chunk_upload: true,
        finish: finishLast && index === chunks.length - 1,
      };

      if (importId) extra.import_id = importId;

      const response = await this.sendRequest(
        this.buildPayload(opts, chunk.tests, chunk.files, extra, chunk.attachments || {}),
        {
          quietSuccessLog: true,
        },
      );

      if (response.statusCode >= 400) {
        throw new Error(response.body || `Chunk upload failed (${response.statusCode}: ${response.statusMessage})`);
      }

      if (!importId) {
        importId = this.extractImportId(response.body);
        if (!importId && requireImportId) {
          throw new Error('Chunk upload failed: import_id was not returned after the first chunk');
        }
      }
    }

    this.logChunkedUploadComplete(chunks.length);
    return importId;
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

  sendRequest(data, requestOpts = {}) {
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
              process.exitCode = 1;
            } else if (!requestOpts.quietSuccessLog) {
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
