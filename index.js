const core = require('@actions/core');
const parser = require('@babel/parser');
const fs = require('fs');
const path = require('path');
const glob = require("glob");
const arrayCompare = require("array-compare")

const Comment = require('./comment');
const Decorator = require('./decorator');

// command
// RUNNER_TOOL_CACHE="/tmp" GITHUB_REF=refs/heads/master INPUT_FRAMEWORK=mocha INPUT_TESTS="example/mocha/**.js" node index.js
const mainRepoPath = process.env.GITHUB_WORKSPACE;
const headRepoPath = path.join(process.env.GITHUB_WORKSPACE, core.getInput('head-path') || 'gh-head');

// most @actions toolkit packages have async methods
async function run() {
  try {

    const pattern = core.getInput('tests', { required: true });

    if (!mainRepoPath) {
      throw new Error('Repository was not fetched, please enable add `actions/checkout` step before');
    }
  
    if (!fs.existsSync(headRepoPath)) {
      throw new Error(`HEAD ref for repository was not fetched, please add additional 'actions/checkout' step before to fetch head:
      - uses: actions/checkout@v2
        with:
          ref: \${{ github.event.pull_request.head.sha }}    
          path: head        
      `);
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
    
    const baseStats = calculateStats(frameworkParser, path.join(headRepoPath, pattern));
    const stats = calculateStats(frameworkParser, path.join(mainRepoPath, pattern), (testsData) => {
      testsData = frameworkParser(ast).map(t => {
        t.file = file.replace(mainRepoPath + path.sep, '');
        return t;
      });
      allTests.append(testsData);
    });

    const diff = arrayCompare(baseStats.tests, stats.tests);

    const comment = new Comment();
    comment.writeSummary(stats.tests.length, stats.files.length, framework);
    comment.writeDiff(diff);
    comment.writeTests(allTests.getMarkdownList());
    comment.post();

    console.log(`Added ${diff.added.length} tests, removed ${diff.missing.length} tests`);
    console.log(`Total ${stats.tests.length} tests`);
    
  } 
  catch (error) {
    core.setFailed(error.message);
  }
}

run()

async function calculateStats(frameworkParser, pattern, cb) {
    
  const stats = {
    tests: [],
    suites: [],
    files: [],
  };

  const files = glob.sync(pattern)

  for (const file of files) {
    const source = fs.readFileSync(file).toString();
    const ast = parser.parse(source);

    // append file name to each test
    const testsData = frameworkParser(ast).map(t => {
      t.file = file.replace(process.env.GITHUB_WORKSPACE + path.sep, '');
      return t;
    });

    
    const tests = new Decorator(testsData);
    stats.tests = stats.tests.concat(tests.getFullNames());
    stats.suites = stats.suites.concat(tests.getSuiteNames());
    stats.files.push(file);

    core.debug(`Tests in ${file}: ${tests.getTestNames().join(', ')}`);

    if (cb) cb(testsData);
  }

  return stats;
}
