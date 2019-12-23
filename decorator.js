class Decorator {

  constructor(tests) {
    this.tests = tests;
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
    let suites = [];


    const buildSuites = (test) => {
      const testSuites = test.suites;
      if (suites.length > testSuites.length) {
        suites = suites.slice(0, testSuites.length);
      }
      for (let i = 0; i < testSuites.length; i++) {
        if (suites[i] === testSuites[i]) continue;
        if (!suites[i]) {
          suites[i] = testSuites[i];
          list.push(indent(`* 📎 **${escapeSpecial(testSuites[i])}**`));
          continue;
        }
        delete suites[i];
        list.push(indent(`* 📎 **${escapeSpecial(testSuites[i])}**`));
        suites[i] = testSuites[i];
      }
    }
    
    
    for (const test of this.tests) {
      
      const fileLine = `\n📝 [${test.file}](${fileLink}/${test.file})`;
      if (list.indexOf(fileLine) < 0) {
        list.push(fileLine);
      }
      
      buildSuites(test);

      if (test.skipped) {
        list.push(indent('  * [~~' + escapeSpecial(test.name) + '~~]' + `(${fileLink}/${test.file}#L${test.line}) ⚠️ *skipped*`));
        continue;  
      }
      list.push(indent('  * ' + escapeSpecial(test.name)));
    }


    function indent(line) {
      return ''.padStart(suites.length * 2, ' ') + line;
    }

    function escapeSpecial(text, open = '`', close = '`') {
      return text.replace(/(@[\w:-]+)/g, `${open}$1${close}`);
    }

    return list;
  }

}

module.exports = Decorator;