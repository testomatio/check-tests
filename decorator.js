const fileLink = `https://github.com/${process.env.GITHUB_REPOSITORY}/tree/${process.env.GITHUB_SHA}`;

class Decorator {

  constructor(tests) {
    this.tests = tests.map(t => {
      if (!t.suites) t.suites = [];
      return t;
    });
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
    return this.tests.filter(t => !t.skipped).map(t => {
      return t.suites.join(': ') + ': ' + t.name;
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
      return t.suites.join(': ') + ': ' + t.name;
    });
  }

  getSkippedMarkdownList() {
    const list = []
    const tests = this.getSkippedTests();

    for (const test of tests) {
      list.push('* [~~' + escapeSpecial(test.name) + '~~]' + `(${fileLink}/${test.file}#L${test.line})`);
    }
    return list;
  }

  getSuitesMarkdownList() {
    const list = [];
    for (const test of this.tests) {
      const suite = test.suites[0] || '';

      const count = this.getTestsInSuite(suite).length;

      const fileLine = `* **${suite} (${count} tests)** [${test.file}](${fileLink}/${test.file})`;
      if (list.indexOf(fileLine) < 0) {
        list.push(fileLine);
      }
    }
    return list; 
  }

  getTextList() {
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
          list.push(indent(`= ${testSuites[i]}`));
          suites[i] = testSuites[i];
          continue;
        }
        suites = suites.slice(0, i);
        list.push(indent(`= ${testSuites[i]}:`));
        suites[i] = testSuites[i];
      }
    }
    
    
    for (const test of this.tests) {
      
      const fileLine = `File: ${test.file}\n`;
      if (list.indexOf(fileLine) < 0) {
        list.push('-----');
        list.push(fileLine);
        suites = [];
      }
      
      buildSuites(test);

      if (test.skipped) {
        list.push(indent('- (skipped) ' + test.name));
        continue;  
      }
      list.push(indent('- ' + test.name));
    }


    function indent(line) {
      return ''.padStart(suites.length * 2, ' ') + line;
    }
    
    return list;
  }  

  getMarkdownList() {
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
          list.push(indent(`* 📎 **${escapeSpecial(testSuites[i])}**`));
          suites[i] = testSuites[i];
          continue;
        }
        suites = suites.slice(0, i);
        list.push(indent(`* 📎 **${escapeSpecial(testSuites[i])}**`));
        suites[i] = testSuites[i];
      }
    }
    
    
    for (const test of this.tests) {
      
      const fileLine = `\n📝 [${test.file}](${fileLink}/${test.file})`;
      if (list.indexOf(fileLine) < 0) {
        list.push(fileLine);
        suites = [];
      }
      
      buildSuites(test);

      if (test.skipped) {
        list.push(indent('* [~~' + escapeSpecial(test.name) + '~~]' + `(${fileLink}/${test.file}#L${test.line}) ⚠️ *skipped*`));
        continue;  
      }
      list.push(indent('* `' + test.name + '`'));
    }


    function indent(line) {
      return ''.padStart(suites.length * 2, ' ') + line;
    }
    
    return list;
  }

}

module.exports = Decorator;

function escapeSpecial(text, open = '`', close = '`') {
  return text.replace(/(@[\w:-]+)/g, `${open}$1${close}`);
}