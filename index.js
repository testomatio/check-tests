const core = require('@actions/core');
const parser = require('@babel/parser');
const fs = require('fs');
const path = require('path');
const glob = require("glob");
const exec = require('@actions/exec');
const arrayCompare = require("array-compare")

const PullRequest = require('./pullRequest');
const Comment = require('./comment');
const Decorator = require('./decorator');

// command
// RUNNER_TOOL_CACHE="/tmp" GITHUB_REF=refs/heads/master INPUT_FRAMEWORK=mocha INPUT_TESTS="example/mocha/**.js" node index.js
const mainRepoPath = process.env.GITHUB_WORKSPACE;

// most @actions toolkit packages have async methods
async function run() {
  try {
    
    const pattern = core.getInput('tests', { required: true });

    if (!mainRepoPath) {
      throw new Error('Repository was not fetched, please enable add `actions/checkout` step before');
    }
  
    let frameworkParser;
    
    const framework = core.getInput('framework', {required: true});

    switch (framework) {
      case 'codecept':
      case 'codeceptjs':
        frameworkParser = require('./lib/codeceptjs');
      break;
      case 'mocha':
      case 'cypress':
      case 'cypress.io': 
      case 'cypressio': 
      default:
        frameworkParser = require('./lib/mocha');
        break;
    }
    
    const allTests = new Decorator([]);
    
    const stats = calculateStats(frameworkParser, path.join(mainRepoPath, pattern), (file, testsData) => {
      testsData = testsData.map(t => {
        t.file = file.replace(mainRepoPath + path.sep, '');
        return t;
      });
      allTests.append(testsData);
    });

    const pullRequest = new PullRequest(core.getInput('token', { required: true }));

    const pr = await pullRequest.fetch();

    console.log('Comparing with', pr.base.sha);

    await exec.exec('git', ['checkout', pr.base.sha], { cwd: mainRepoPath });

    const baseStats = calculateStats(frameworkParser, path.join(mainRepoPath, pattern));

    const diff = arrayCompare(baseStats.tests, stats.tests);
    const skippedDiff = arrayCompare(baseStats.skipped, stats.skipped);
        
    await exec.exec('git', ['switch', '-'], { cwd: mainRepoPath });

    console.log(`Added ${diff.added.length} tests, removed ${diff.missing.length} tests`);
    console.log(`Total ${stats.tests.length} tests`);


    const comment = new Comment();
    comment.writeSummary(stats.tests.length, stats.files.length, framework);
    comment.writeDiff(diff);
    comment.writeSkippedDiff(skippedDiff);
    comment.writeTests(allTests.getMarkdownList());

    await pullRequest.addComment(comment);

    if (!core.getInput('no-tests-label') && !core.getInput('has-tests-label')) return;

    // add label

    if (core.getInput('has-tests-label')) {
      let title = core.getInput('has-tests-label');
      title = typeof title === 'boolean' ? ' ✔️ has tests' : title
      if (diff.added.length) {
        await pullRequest.addLabel(title);
      } else {
        await pullRequest.removeLabel(title);
      }
    }
    
    if (core.getInput('no-tests-label')) {
      let title = core.getInput('no-tests-label');
      title = typeof title === 'boolean' ? '❌ no tests' : title
      if (diff.added.length) {
        await pullRequest.removeLabel(title);  
      } else {
        await pullRequest.addLabel(title);  
      }
    }
  } catch (error) {
    core.setFailed(error.message);
    console.error(error);
  }
}

run()

function calculateStats(frameworkParser, pattern, cb) {
    
  const stats = {
    tests: [],
    suites: [],
    files: [],
    skipped: [],
  };

  const files = glob.sync(pattern);

  for (const file of files) {
    const source = fs.readFileSync(file).toString();
    const ast = parser.parse(source);

    // append file name to each test
    const testsData = frameworkParser(ast);
    
    const tests = new Decorator(testsData);
    stats.tests = stats.tests.concat(tests.getFullNames());
    stats.skipped = stats.skipped.concat(tests.getSkippedTestFullNames());
    stats.files.push(file);

    core.debug(`Tests in ${file}: ${tests.getTestNames().join(', ')}`);

    if (cb) cb(file, testsData);
  }

  return stats;
}
