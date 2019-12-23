class Comment {

  constructor() {
    this.attribution = '🌀 Tests overview by [Testomatio](https://testomat.io)';
    this.body = this.attribution + '\n';
  }

  writeDiff(diff) {

    if (diff.added.length || diff.missing.length) {
      
      if (diff.added.length) {
        this.body += `\n#### ✔️ Added ${diff.added.length} tests\n`;

        if (diff.added.length < 300) { // 300 tests at once? not a useful diff
          this.body += '\n\n```diff\n';
          diff.added.forEach(test => this.body +=`\n+ ${Object.values(test)[0]}`);        
          this.body += '\n```\n\n';
        }
      }

      if (diff.missing.length) {
        this.body += `\n#### 🗑️ Removed ${diff.missing.length} tests\n`;

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
      this.body += `\n\n#### ⚠️ Skipped ${diff.added.length} tests\n`;
      this.body += '```diff\n'
      diff.added.forEach(test => this.body +=`\n- ${Object.values(test)[0]}`);        
      this.body += '\n```\n\n'
    }

    if (diff.missing.length) {
      this.body += `\n\n#### ♻ Restored ${diff.missing.length} tests\n`;
      this.body += '```diff\n';
      diff.missing.forEach(test => this.body += `\n+ ${Object.values(test)[0]}`);        
      this.body += '\n```\n\n';
    }

  }

  writeTests(list) {
    this.body += 
`\n\n<details>
  <summary>📑 List all tests</summary>

---

${list}

</details>

`;  
  }

  writeSummary(tests, files, framework) {
    this.body += `\n\nFound **${tests}** ${framework} tests in ${files} files `;
  }

}

class CommentError extends Error {

  getComment() {
    const c = new Comment;
    c.body += '\n ⛔ ' + this.message;
    return c; 
  }
}


module.exports = Comment;
module.exports.Error = CommentError;