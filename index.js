const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const parser = require('@babel/parser');
const fs = require('fs');
const path = require('path');
const glob = require("glob");
const arrayCompare = require("array-compare")

const Comment = require('./comment');
const Decorator = require('./decorator');

// command
// RUNNER_TOOL_CACHE="/tmp" GITHUB_REF=refs/heads/master INPUT_FRAMEWORK=mocha INPUT_TESTS="example/mocha/**.js" node index.js

// most @actions toolkit packages have async methods
async function run() {
  if (!process.env.GITHUB_WORKSPACE) {
    throw new Error('Repository was not fetched, please enable add `actions/checkout` step before');
  }

  try {

    const prevStats = await loadStats();

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


    const pattern = path.join(process.env.GITHUB_WORKSPACE, core.getInput('tests', { required: true }));

    const stats = {
      tests: [],
      suites: [],
      files: [],
    };

    glob(pattern, (err, files) => {
      if (err) {
        core.setFailed(error.message);
        return;
      };
      const allTests = new Decorator([]);

      for (const file of files) {
        const source = fs.readFileSync(file).toString();
        const ast = parser.parse(source);

        // append file name to each test
        const testsData = frameworkParser(ast).map(t => {
          t.file = file;
          return t;
        });

        allTests.append(testsData);
        
        const tests = new Decorator(testsData);
        core.debug(`Tests in ${file}: ${tests.getTestNames().join(', ')}`);
        stats.tests = stats.tests.concat(tests.getFullNames());
        stats.suites = stats.suites.concat(tests.getSuiteNames());
        stats.files.push(file);
      }

      const diff = arrayCompare(prevStats.tests, stats.tests);

      const comment = new Comment();
      comment.writeSummary(stats.tests.length, stats.files.length, framework);
      comment.writeDiff(diff);
      comment.writeTests(allTests.getMarkdownList());
      comment.post();

      console.log(`Added ${diff.added.length} tests, removed ${diff.missing.length} tests`);
      console.log(`Total ${stats.tests.length} tests`);

      saveStats(stats);
    });
    
  } 
  catch (error) {
    core.setFailed(error.message);
  }
}

run()

async function loadStats() {
  const versionOrBranch = 'refs/heads/' + (core.getInput('branch') || 'master');
  const testStatsDir = await tc.find('tests.json', versionOrBranch);
  const testStatsFile = path.join(testStatsDir, 'tests.json');
  let stats = {
    suites: [],
    files: [],
    tests: [],
  };
  if (fs.existsSync(testStatsFile)) {
    stats = JSON.parse(fs.readFileSync(path.join(testStatsDir, 'tests.json')));
  }
  return stats;
}

async function saveStats(stats) {
  const versionOrBranch = 'refs/heads/' + (core.getInput('branch') || 'master');
  // do not save stats if we are not in base branch
  if (process.env.GITHUB_REF !== versionOrBranch) return;

  // write file and cache contents
  fs.writeFileSync('tests.json', JSON.stringify(stats)); 
  await tc.cacheFile('tests.json', 'tests.json', 'tests.json', versionOrBranch);    
  
}
