class Comment {
  constructor() {
    this.attribution = '🌀 Tests overview by [Testomatio](https://testomat.io)';
    this.body = `${this.attribution}\n`;
  }

  writeDiff(diff) {
    if (diff.added.length || diff.missing.length) {
      if (diff.added.length) {
        this.body += `\n#### ✔️ Added ${diff.added.length} ${properWordForNumberOfTests(diff.added.length)}\n`;

        if (diff.added.length < 300) { // 300 tests at once? not a useful diff
          this.body += '\n\n```diff\n';
          diff.added.forEach(test => this.body += `\n+ ${Object.values(test)[0]}`);
          this.body += '\n```\n\n';
        }
      }

      if (diff.missing.length) {
        this.body += `\n#### 🗑️ Removed ${diff.missing.length} ${properWordForNumberOfTests(diff.missing.length)}\n`;

        if (diff.added.length < 300) {
          this.body += '\n\n```diff\n';
          diff.missing.forEach(test => this.body += `\n- ${Object.values(test)[0]}`);
          this.body += '\n```\n\n';
        }
      }
    } else {
      this.body += '\nNo new tests added or removed';
    }
  }

  writeSkippedDiff(diff) {
    if (diff.added.length) {
      this.body += `\n\n#### ⚠️ Skipped ${diff.added.length} ${properWordForNumberOfTests(diff.added.length)}\n`;
      this.body += '```diff\n';
      diff.added.forEach(test => this.body += `\n- ${Object.values(test)[0]}`);
      this.body += '\n```\n\n';
    }

    if (diff.missing.length) {
      this.body += `\n\n#### ♻ Restored ${diff.missing.length} ${properWordForNumberOfTests(diff.missing.length)}\n`;
      this.body += '```diff\n';
      diff.missing.forEach(test => this.body += `\n+ ${Object.values(test)[0]}`);
      this.body += '\n```\n\n';
    }
  }

  writeSkipped(list) {
    if (!list.length) return;
    const body = list.join('\n');

    this.body
+= `\n\n<details>
  <summary>⚠️ List all skipped ${properWordForNumberOfTests(list.length)} (${list.length})</summary>

${body}

</details>

`;
  }

  writeSuites(list) {
    const body = list.join('\n');

    this.body
+= `\n\n<details>
  <summary>📎 List all suites (${list.length})</summary>


${body}

</details>

`;
  }

  write(text) {
    this.body += `\n${text}\n`;
  }

  writeTests(list) {
    // too big list of tests
    let body = list.join('\n');

    if (body.length > 60000) {
      console.log('Too many tests, ignoring them in comment. String length: ', body.length);

      body = `${body.substring(0, 60000)}\n*...(more than possible to show)...*`;
    }
    this.body
+= `\n\n<details>
  <summary>📑 List all tests</summary>

---

${body}

</details>

`;
  }

  writeSummary(tests, files, framework) {
    this.body += `\n\nFound **${tests}** ${framework} tests in ${files} files `;
  }
}

function properWordForNumberOfTests(numberOfTests) {
  return numberOfTests === 1 ? 'test' : 'tests';
}

module.exports = Comment;
