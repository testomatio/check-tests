const core = require('@actions/core');
const exec = require('@actions/exec');
const arrayCompare = require("array-compare")

const PullRequest = require('./pullRequest');
const Comment = require('./comment');
const Analyzer = require('./analyzer');
const Reporter = require('./reporter');

// command
// RUNNER_TOOL_CACHE="/tmp" GITHUB_REF=refs/heads/master INPUT_FRAMEWORK=mocha INPUT_TESTS="example/mocha/**.js" node index.js
const mainRepoPath = process.env.GITHUB_WORKSPACE;

// most @actions toolkit packages have async methods
async function run() {

  let nodiff = core.getInput('nodiff');
  const framework = core.getInput('framework', {required: true});
  const pattern = core.getInput('tests', { required: true });
  const apiKey = core.getInput('testomatio-key');

  const pullRequest = new PullRequest(core.getInput('token', { required: true }));
  const analyzer = new Analyzer(framework, mainRepoPath);

  if (core.getInput('typescript')) analyzer.withTypeScript();

  try {    

    if (!mainRepoPath) {
      throw new Error('Repository was not fetched, please enable add `actions/checkout` step before');
    }
  
    analyzer.analyze(pattern);

    const allTests = analyzer.getDecorator();    
    const stats = analyzer.getStats();
    
    if (apiKey) {
      const reporter = new Reporter(apiKey);
      reporter.addTests(allTests.getDecorator().getTests());
      reporter.send(); // async call
    }

    let pr;

    console.log('Ready to analyze')
    try {
      console.log(`Is nodiff ${nodiff}`)
      if (!nodiff) {
        pr = await pullRequest.fetch();
        console.log(`PR details : ${pr}`)
      }
    } catch (err) {
      pr = null;
    }

    const baseStats = await analyzeBase(pr);

    console.log(`Basetests : ${baseStats}`);

    const diff = arrayCompare(baseStats.tests, stats.tests);
    diff.missing = diff.missing.filter(t => !stats.skipped.includes(Object.values(t)[0])) // remove skipped tests from missing
    
    const skippedDiff = arrayCompare(baseStats.skipped, stats.skipped);
        
    console.log(`Added ${diff.added.length} tests, removed ${diff.missing.length} tests`);
    console.log(`Total ${stats.tests.length} tests`);

    console.log(`Is PR ${pr}`)
    if (!pr) return;

    const comment = new Comment();
    comment.writeSummary(stats.tests.length, stats.files.length, framework);

    const commentOnEmpty = core.getInput('comment-on-empty');
    const commentOnSkipped = core.getInput('comment-on-skipped');
    const closeOnEmpty = core.getInput('close-on-empty');
    const closeOnSkipped = core.getInput('close-on-skipped');

    const isEmpty = !diff.added.length && !diff.missing.length && !skippedDiff.added.length && !skippedDiff.missing.length;

    if (commentOnEmpty && commentOnEmpty !== 'true' && isEmpty) {
      comment.write(commentOnEmpty);
    }
    
    if (commentOnSkipped && commentOnSkipped !== 'true' && skippedDiff.added.length) {
      comment.write(commentOnSkipped);
    }

    comment.writeDiff(diff);
    comment.writeSkippedDiff(skippedDiff);
    comment.writeSkipped(allTests.getSkippedMarkdownList());

    if (allTests.count() < 300) {
      comment.writeTests(allTests.getMarkdownList());
    } else {
      comment.writeSuites(allTests.getSuitesMarkdownList());
    }

    if (isEmpty && !commentOnEmpty) {
      console.log('No tests changed, comment not shown');
    } else {
      await pullRequest.addComment(comment);
    }

    if (isEmpty && closeOnEmpty) {
      await pullRequest.close();
    }
    if (skippedDiff.added.length && closeOnSkipped) {
      await pullRequest.close();
    }

    // add label
    if (core.getInput('has-tests-label')) {
      let title = core.getInput('has-tests-label');
      title = title === 'true' ? '✔️ has tests' : title
      if (diff.added.length) {
        await pullRequest.addLabel(title);
      } else {
        await pullRequest.removeLabel(title);
      }
    }
    
    if (core.getInput('no-tests-label')) {
      let title = core.getInput('no-tests-label');
      title = title === 'true' ? '❌ no tests' : title
      if (diff.added.length) {
        await pullRequest.removeLabel(title);  
      } else {
        await pullRequest.addLabel(title);  
      }
    }
  } catch (error) {
    if (error instanceof Comment.Error) {
      pullRequest.addComment(error.getComment());
    }
    core.setFailed(error.message);
    console.error(error);
  }

  async function analyzeBase(pr) {
    if (!pr) {
      return analyzer.getEmptyStats();
    }

    try {
      console.log('Comparing with', pr.base.sha);
      await exec.exec('git', ['checkout', pr.base.sha], { cwd: mainRepoPath, stdio: 'inherit'});

      analyzer.analyze(pattern);

      await exec.exec('git', ['switch', '-'], { cwd: mainRepoPath, stdio: 'inherit' });
      return analyzer.getStats();

    } catch (err) {
      console.error("Can't calculate base test files");
      console.error(err);
      return analyzer.getEmptyStats();
    }
    
  }
}

run()
