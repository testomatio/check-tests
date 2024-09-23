const debug = require('debug')('check-tests:decorator');
const hash = require('object-hash');
const ValidateError = require('./errors/validation.error');

class Decorator {
  /**
   * @typedef {import('../types').Test} Test
   * @param {Test[]} tests
   */
  constructor(tests, options = {}) {
    this.framework = options?.framework;
    this.tests = tests.map(t => {
      if (!t.suites) t.suites = [];
      return t;
    });

    this.fileLink = `https://github.com/${process.env.GITHUB_REPOSITORY}/tree/${process.env.GITHUB_SHA}`;
    this.isCommentEnabled = false;
    this.comments = {};
  }

  validate() {
    const errors = [];

    this.getTests()
      .filter(t => {
        // processing of skipped tests in playwright; it has "true" as name
        if (this.framework === 'playwright' && t.name === true && t.skipped === true) return false;

        if (!t.name) debug('Empty name for test:', t);
        return !t.name?.replace(/(@[\w:-]+)/g, '').trim();
      })
      .forEach(t => {
        errors.push(`Test name is empty: '${t.name}' at ${t.file}:${t.line}`);
      });

    if (errors.length) {
      throw new ValidateError(
        `Tests validation failed:\n\n- ${errors.join(
          '\n- ',
        )}\n\nPlease check your test files and make sure that all tests have names.`,
      );
    }
  }

  enableComment() {
    this.isCommentEnabled = true;
  }

  disableComment() {
    this.isCommentEnabled = false;
  }

  getTests() {
    return this.tests;
  }

  count() {
    return this.tests.length;
  }

  append(tests) {
    this.tests = this.tests.concat(tests);
  }

  getTestNames() {
    return this.tests.map(t => t.name);
  }

  getFullNames() {
    return this.tests
      .filter(t => !t.skipped)
      .map(t => {
        return `${t.suites.join(': ')}: ${t.name}`;
      });
  }

  getSuiteNames() {
    return [...new Set(this.tests.map(t => t.suites.join(': ')))];
  }

  getTestsInSuite(suite) {
    return this.tests.filter(t => t.suites.join(': ').startsWith(suite));
  }

  getSkippedTests() {
    return this.tests.filter(t => t.skipped);
  }

  getSkippedTestFullNames() {
    return this.getSkippedTests().map(t => {
      return `${t.suites.join(': ')}: ${t.name}`;
    });
  }

  getSkippedMarkdownList() {
    const list = [];
    const tests = this.getSkippedTests();

    for (const test of tests) {
      list.push(`* [~~${escapeSpecial(test.name)}~~]` + `(${this.fileLink}/${test.file}#L${test.line})`);
    }
    return list;
  }

  getSuitesMarkdownList() {
    const list = [];
    for (const test of this.tests) {
      const suite = test.suites[0] || '';

      const count = this.getTestsInSuite(suite).length;

      const fileLine = `* **${suite} (${count} tests)** [${test.file}](${this.fileLink}/${test.file})`;
      if (list.indexOf(fileLine) < 0) {
        list.push(fileLine);
      }
    }
    return list;
  }

  getTextList() {
    const list = [];
    let suites = [];

    const buildSuites = test => {
      const testSuites = test.suites;
      if (suites.length > testSuites.length) {
        suites = suites.slice(0, testSuites.length);
      }
      for (let i = 0; i < testSuites.length; i++) {
        if (suites[i] === testSuites[i]) continue;
        if (!suites[i]) {
          list.push(indent(`= ${testSuites[i]}`));
          suites[i] = testSuites[i];
          continue;
        }
        suites = suites.slice(0, i);
        list.push(indent(`= ${testSuites[i]}:`));
        suites[i] = testSuites[i];
      }
    };

    for (const test of this.tests) {
      // _test is used for newman tests
      const fileLine = ` 🗒️  File: ${test.file || test._file}\n`;
      if (list.indexOf(fileLine) < 0) {
        list.push('-----');
        list.push(fileLine);
        suites = [];
      }

      buildSuites(test);

      if (test.skipped) {
        list.push(indent(`- (skipped) ${test.name}`));
        continue;
      }
      list.push(indent(`- ${test.name}`));
    }

    function indent(line) {
      return ''.padStart(suites.length * 2, ' ') + line;
    }

    return list;
  }

  getMarkdownList() {
    const list = [];
    let suites = [];

    const buildSuites = test => {
      const testSuites = test.suites;
      if (suites.length > testSuites.length) {
        suites = suites.slice(0, testSuites.length);
      }
      for (let i = 0; i < testSuites.length; i++) {
        if (suites[i] === testSuites[i]) continue;
        if (!suites[i]) {
          list.push(indent(`* 📎 **${escapeSpecial(testSuites[i])}**${this.generateComment(testSuites[i])}`));
          suites[i] = testSuites[i];
          continue;
        }
        suites = suites.slice(0, i);
        list.push(indent(`* 📎 **${escapeSpecial(testSuites[i])}**${this.generateComment(testSuites[i])}`));
        suites[i] = testSuites[i];
      }
    };

    for (const test of this.tests) {
      const fileLine = `\n📝 [${test.file}](${this.fileLink}/${test.file})${this.generateComment(test.file)}`;
      if (list.indexOf(fileLine) < 0) {
        list.push(fileLine);
        suites = [];
      }

      buildSuites(test);
      const fullName = test.file + test.suites[0] + test.name;

      if (test.skipped) {
        list.push(
          indent(`* [~~${escapeSpecial(test.name)}~~]` + `(${this.fileLink}/${test.file}#L${test.line}) ⚠️ *skipped*`),
        );
        continue;
      }
      list.push(`${indent(`* ✔️ \`${test.name}\``)}${this.generateComment(fullName)}`);
    }

    function indent(line) {
      return ''.padStart(suites.length * 2, ' ') + line;
    }

    return list;
  }

  generateComment(name) {
    if (this.isCommentEnabled) {
      const id = hash(name);
      const content = this.comments[id] && this.comments[id].trim() !== '' ? `\n${this.comments[id]}\n` : '';
      return ` <!-- check-tests: Add test docs below id=${id} -->${content}`;
    }

    return '';
  }
}

module.exports = Decorator;

function escapeSpecial(text, open = '`', close = '`') {
  return text.replace(/(@[\w:-]+)/g, `${open}$1${close}`);
}
