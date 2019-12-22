class Decorator {

  constructor(tests) {
    this.tests = tests;
  }
  
  append(tests) {
    this.tests = this.tests.concat(tests);
  }

  getTestNames() {
    return this.tests.map(t => t.name);
  }

  getFullNames() {
    return this.tests.map(t => {
      return t.suites.join(': ') + ': ' + t.name;
    });
  }
  
  getSuiteNames() {    
    return [...new Set(this.tests.map(t => t.suites.join(': ')))];
  }

  getTestsInSuite(suite) {
    return this.tests.filter(t => t.suites.join(': ') === suite);
  }

  getSkippedTests() {
    return this.tests.filter(t => t.skipped);
  }

  getSkippedTestFullNames() {
    return this.getSkippedTests().map(t => {
      return t.suites.join(': ') + ': ' + t.name;
    });
  }

  getMarkdownList() {
    const fileLink = `https://github.com/${process.env.GITHUB_REPOSITORY}/tree/${process.env.GITHUB_SHA}`;

    const list = [];
    for (const test of this.tests) {
      let suiteName = test.suites.join(': ');
      const suiteLine = `\n📎 **${escapeSpecial(suiteName)}**\n📝 [${test.file}](${fileLink}/${test.file})`;
      if (list.indexOf(suiteLine) < 0) {
        list.push(suiteLine);
      }
      if (test.skipped) {
        list.push('* ⚠️ *Skipped* [' + escapeSpecial(test.name) + ']' + `(${fileLink}/${test.file}#L${test.line})`);
        continue;  
      }
      list.push('* [' + escapeSpecial(test.name) + ']' + `(${fileLink}/${test.file}#L${test.line})`);
    }

    function escapeSpecial(text, open = '`', close = '`') {
      return text.replace(/(@[\w:-]+)/g, `${open}$1${close}`);
    }

    return list.join('\n');
  }

}

module.exports = Decorator;