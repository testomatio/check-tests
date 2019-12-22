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

  getMarkdownList() {
    const fileLink = `https://github.com/${process.env.GITHUB_REPOSITORY}/tree/${process.env.GITHUB_SHA}`;

    const list = [];
    for (const test of this.tests) {
      const suiteName = test.suites.join(': ');
      const suiteLine = `\n##### 📎 ${suiteName} \n*${test.file}*`;
      if (list.indexOf(suiteLine) < 0) {
        list.push(suiteLine);
      }
      list.push('* [`' + test.name + '`]' + `(${fileLink}/${test.file}#L${test.line})`);
    }
    return list.join('\n');
  }

}

module.exports = Decorator;