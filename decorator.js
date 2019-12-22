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

  getMarkdownList() {
    const fileLink = `https://github.com/${process.env.GITHUB_REPOSITORY}/tree/${process.env.GITHUB_SHA}`;

    const list = [];
    for (const test of this.tests) {
      const suiteName = test.suites.join(': ');
      const numTests = this.getTestsInSuite(suiteName);
      const suiteLine = `\n<summary> 📎 ${suiteName} (${numTests})</summary> \n📂 [${test.file}](${fileLink}/${test.file})`;
      if (list.indexOf(suiteLine) < 0) {
        if (list.length) list.push('</detail>\n');
        list.push('<detail>\n')
        list.push(suiteLine);
      }
      list.push('* [`' + test.name + '`]' + `(${fileLink}/${test.file}#L${test.line})`);
    }
    list.push('</detail>\n')
    return list.join('\n');
  }

}

module.exports = Decorator;