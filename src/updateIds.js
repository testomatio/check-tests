const fs = require('fs');
const debug = require('debug')('testomatio:update-ids');
const { replaceAtPoint, cleanAtPoint } = require('./lib/utils');

const TAG_REGEX = /\@([\w\d\-\(\)\.\,\*:]+)/g;
const TEST_ID_REGEX = /@T([\w\d]{8})/;
const SUITE_ID_REGEX = /@S([\w\d]{8})/;
const LINE_START_REGEX = /^[ \t]*(import|const|let|var)\s+.*$/;
const SUITE_KEYWORDS = ['describe', 'context', 'suite', 'Feature'].map(k => new RegExp(`(\\s|^)${k}(\\(|\\s)`));

function updateIds(testData, testomatioMap, workDir, opts = {}) {
  const files = [];
  let duplicateTests = 0;
  let duplicateSuites = 0;
  let sutes = [];

  for (const testArr of testData) {
    if (!testArr.length) continue;

    const file = `${workDir}/${testArr[0].file}`;

    let fileContent = getFileContent(file);

    for (const suiteGroup of testArr) {
      sutes.push(...suiteGroup.suites);
    }

    // update inner suites - used only unique ones
    sutes = uniqueSuites(sutes);

    sutes.forEach(suite => {
      debug('    suite  ', suite);

      const suiteIndex = suite;
      const suiteWithoutTags = suite.replace(TAG_REGEX, '').trim();
      debug('    suiteWithoutTags  ', suiteWithoutTags);

      const currentSuiteId = parseSuite(suiteIndex);

      if (
        currentSuiteId &&
        testomatioMap.suites[suiteIndex] !== `@S${currentSuiteId}` &&
        testomatioMap.suites[suiteWithoutTags] !== `@S${currentSuiteId}`
      ) {
        debug(`   Previous ID detected in suite '${suiteIndex}'`);
        duplicateSuites++;

        return;
      }

      if (testomatioMap.suites[suite] && !suite.includes(testomatioMap.suites[suite])) {
        fileContent = replaceSuiteTitle(suite, `${suite} ${testomatioMap.suites[suite]}`, fileContent);
        updateFileContent(file, fileContent);
      } else if (testomatioMap.suites[suiteWithoutTags] && !suite.includes(testomatioMap.suites[suiteWithoutTags])) {
        fileContent = replaceSuiteTitle(suite, `${suite} ${testomatioMap.suites[suiteWithoutTags]}`, fileContent);
        updateFileContent(file, fileContent);
      }
    });

    for (const test of testArr) {
      let testIndex = `${test.suites[0] || ''}#${test.name}`;
      debug('    test  ', testIndex);

      let testWithoutTags = `${(test.suites[0] || '').replace(TAG_REGEX, '').trim()}#${test.name.replace(
        TAG_REGEX,
        '',
      )}`.trim();

      if (!testomatioMap.tests[testIndex] && !testomatioMap.tests[testWithoutTags]) {
        testIndex = test.name; // if no suite title provided
        testWithoutTags = test.name.replace(TAG_REGEX, '').trim();
      }

      const currentTestId = parseTest(testIndex);
      if (
        currentTestId &&
        testomatioMap.tests[testIndex] !== `@T${currentTestId}` &&
        testomatioMap.tests[testWithoutTags] !== `@T${currentTestId}`
      ) {
        debug(`   Previous ID detected in test '${testIndex}'`);
        duplicateTests++;
        continue;
      }

      if (testomatioMap.tests[testIndex] && !test.name.includes(testomatioMap.tests[testIndex])) {
        fileContent = replaceAtPoint(fileContent, test.updatePoint, ` ${testomatioMap.tests[testIndex]}`);
        updateFileContent(file, fileContent);
        delete testomatioMap.tests[testIndex];
      } else if (testomatioMap.tests[testWithoutTags] && !test.name.includes(testomatioMap.tests[testWithoutTags])) {
        fileContent = replaceAtPoint(fileContent, test.updatePoint, ` ${testomatioMap.tests[testWithoutTags]}`);
        updateFileContent(file, fileContent);
        delete testomatioMap.tests[testWithoutTags];
      }
    }
    files.push(file);
  }
  if (duplicateSuites || duplicateTests) {
    console.log('! Previously set Test IDs detected, new IDs ignored');
    console.log('! Clean previously set Test IDs to override them');
    console.log('! Run script with DEBUG="testomatio:*" flag to get more info of affected tests ');
  }

  return files;
}

function cleanIds(testData, testomatioMap = {}, workDir, opts = { dangerous: false }) {
  const dangerous = opts.dangerous;
  let fileSuites = [];

  const testIds = testomatioMap.tests ? Object.values(testomatioMap.tests) : [];
  const suiteIds = testomatioMap.suites ? Object.values(testomatioMap.suites) : [];
  const files = [];
  for (const testArr of testData) {
    if (!testArr.length) continue;

    const file = `${workDir}/${testArr[0].file}`;

    let fileContent = getFileContent(file);

    for (const suiteGroup of testArr) {
      fileSuites.push(...suiteGroup.suites);
    }

    fileSuites = uniqueSuites(fileSuites);

    for (const suite of fileSuites) {
      debug('suite: ', suite);
      const suiteId = `@S${parseSuite(suite)}`;
      if (suiteIds.includes(suiteId) || (dangerous && suiteId)) {
        debug('  clenaing suiteId: ', suiteId);
        const newTitle = suite.slice().replace(suiteId, '').trim();
        fileContent = fileContent.replace(suite, newTitle);
      }
    }

    for (const test of testArr) {
      const testId = `@T${parseTest(test.name)}`;
      debug('  clenaing test: ', test.name);
      if (testIds.includes(testId) || (dangerous && testId)) {
        fileContent = cleanAtPoint(fileContent, test.updatePoint, testId);
      }
    }
    files.push(file);
    fs.writeFileSync(file, fileContent, err => {
      if (err) throw err;
    });
  }
  return files;
}

const uniqueSuites = suites => {
  return [...new Set(suites)];
};

const getFileContent = file => {
  debug('Updating file: ', file);

  return fs.readFileSync(file, { encoding: 'utf8' });
};

const updateFileContent = (file, newContent) => {
  fs.writeFileSync(file, newContent);
};

const parseTest = testTitle => {
  const captures = testTitle.match(TEST_ID_REGEX);
  if (captures) {
    return captures[1];
  }

  return null;
};

const parseSuite = suiteTitle => {
  const captures = suiteTitle.match(SUITE_ID_REGEX);
  if (captures) {
    return captures[1];
  }

  return null;
};

const replaceSuiteTitle = (title, replace, content) => {
  const lines = content.split('\n');
  // try to find string near keyword & exclude import lines
  const updatedLines = lines.map(line => {
    // ignore lines with kewords
    if (line.match(LINE_START_REGEX)) return line;

    for (const keyword of SUITE_KEYWORDS) {
      if (line.match(keyword) || line.includes(title)) {
        return line.replace(title, replace);
      }

      return line;
    }

    return line;
  });

  return updatedLines.join('\n');
};

module.exports = {
  updateIds,
  cleanIds,
};
