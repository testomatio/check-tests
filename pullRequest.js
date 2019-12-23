const github = require('@actions/github');
const core = require('@actions/core');

let pr;

module.exports = async () => {
  if (pr) return pr;
  
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

  return pr = pullRequests.filter(pr => pr.head.sha === process.env.GITHUB_SHA)[0];
}
