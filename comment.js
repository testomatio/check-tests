const github = require('@actions/github');
const core = require('@actions/core');
const pullRequest = require('./pullRequest');

class Comment {

  constructor() {
    this.body = '🌀 Tests overview by [Testomatio](https://testomat.io)\n';
  }

  writeDiff(diff) {

    if (diff.added.length || diff.missing.length) {
      
      if (diff.added.length) {
        this.body += `\n#### ✔️ Added ${diff.added.length} tests\n`;
        this.body += '\n\n```diff\n';
        diff.added.forEach(test => this.body +=`\n+ ${Object.values(test)[0]}`);        
        this.body += '\n```\n\n';
      }

      if (diff.missing.length) {
        this.body += `\n#### 🗑️ Removed ${diff.missing.length} tests\n`;
        this.body += '\n\n```diff\n';
        diff.missing.forEach(test => this.body += `\n- ${Object.values(test)[0]}`);        
        this.body += '\n```\n\n';
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

  async post() {  
    const githubToken = core.getInput('token');
    if (!githubToken) return;
    
    const octokit = new github.GitHub(githubToken);  
    
    const repoUrl = process.env.GITHUB_REPOSITORY;
    
    const [ owner, repo ] = repoUrl.split('/');
    
    const pr = await pullRequest();

    const { number } = pr;
  
    
    return octokit.issues.createComment({
      owner,
      repo,
      issue_number: number,
      body: this.body,
    });
  }
}

module.exports = Comment;