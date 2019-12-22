const github = require('@actions/github');
const core = require('@actions/core');

class Comment {

  constructor() {
    this.body = '🌀 Tests overview by [Testomatio](https://testomat.io)\n';
  }

  writeDiff(diff) {

    if (diff.added.length || diff.missing.length) {
      this.body += '\n\n```diff\n';
      
      if (diff.added.length) {
        this.body += `Added ${diff.added.length} tests\n===========`;
        diff.added.forEach(test => this.body +=`\n+ ${Object.values(test)[0]}`);        
      }

      if (diff.missing.length) {
        this.body += `\n\nRemoved ${diff.missing.length} tests\n=============`;
        diff.missing.forEach(test => this.body += `\n- ${Object.values(test)[0]}`);        
      }

      this.body += '\n```\n\n';
    } else {
      this.body += '\nNo new tests added or removed';
    }
  }

  writeTests(list) {
    this.body += 
`\n\n<details>
  <summary>📑 List all tests</summary>

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
    
    const { data: pullRequests } = await octokit.pulls.list({
      owner,
      repo,
      state: 'open'
    });
  
    const pr = pullRequests.filter(pr => pr.head.sha === process.env.GITHUB_SHA)[0];
  
    if (!pr) return;
    
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