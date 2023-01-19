const fs = require('fs');
const debug = require('debug')('testomatio:update-ids');
const { replaceAtPoint, cleanAtPoint } = require('./lib/utils');

const TAG_REGEX = /\@([\w\d\-\(\)\.\,\*:]+)/g;

function updateIds(testData, testomatioMap, workDir, opts = {}) {
  const files = [];
  for (const testArr of testData) {
    if (!testArr.length) continue;

    const file = `${workDir}/${testArr[0].file}`;
    debug('Updating file: ', file);
    let fileContent = fs.readFileSync(file, { encoding: 'utf8' });

    const suite = testArr[0].suites[0] || '';
    const suiteIndex = suite;
    const suiteWithoutTags = suite.replace(TAG_REGEX, '').trim();
    if (testomatioMap.suites[suiteIndex] && !suite.includes(testomatioMap.suites[suiteIndex])) {
      fileContent = fileContent.replace(suite, `${suite} ${testomatioMap.suites[suiteIndex]}`);
      fs.writeFileSync(file, fileContent);
    } else if (testomatioMap.suites[suiteWithoutTags] && !suite.includes(testomatioMap.suites[suiteWithoutTags])) {
      fileContent = fileContent.replace(suite, `${suite} ${testomatioMap.suites[suiteWithoutTags]}`);
      fs.writeFileSync(file, fileContent);
    }

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
      if (testomatioMap.tests[testIndex] && !test.name.includes(testomatioMap.tests[testIndex])) {
        fileContent = replaceAtPoint(fileContent, test.updatePoint, ` ${testomatioMap.tests[testIndex]}`);
        fs.writeFileSync(file, fileContent);
        delete testomatioMap.tests[testIndex];
      } else if (testomatioMap.tests[testWithoutTags] && !test.name.includes(testomatioMap.tests[testWithoutTags])) {
        fileContent = replaceAtPoint(fileContent, test.updatePoint, ` ${testomatioMap.tests[testWithoutTags]}`);
        fs.writeFileSync(file, fileContent);
        delete testomatioMap.tests[testWithoutTags];
      }
    }
    files.push(file);
  }
  return files;
}

function cleanIds(testData, testomatioMap = {}, workDir, opts = { dangerous: false }) {
  const dangerous = opts.dangerous;

  const testIds = testomatioMap.tests ? Object.values(testomatioMap.tests) : [];
  const suiteIds = testomatioMap.suites ? Object.values(testomatioMap.suites) : [];
  const files = [];
  for (const testArr of testData) {
    if (!testArr.length) continue;

    const file = `${workDir}/${testArr[0].file}`;
    debug('Updating file: ', file);
    let fileContent = fs.readFileSync(file, { encoding: 'utf8' });

    const suite = testArr[0].suites[0];
    const suiteId = `@S${parseSuite(suite)}`;
    if (suiteIds.includes(suiteId) || (dangerous && suiteId)) {
      const newTitle = suite.slice().replace(suiteId, '').trim();
      fileContent = fileContent.replace(suite, newTitle);
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

const parseTest = testTitle => {
  const captures = testTitle.match(/@T([\w\d]{8})/);
  if (captures) {
    return captures[1];
  }

  return null;
};

const parseSuite = suiteTitle => {
  const captures = suiteTitle.match(/@S([\w\d]{8})/);
  if (captures) {
    return captures[1];
  }

  return null;
};

const getLineNumberOfText = (text, content) => {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(text)) return i;
  }

  return 0;
};

function fileIndex(file, index) {
  if (file) return `${file}:${index}`;
  return index;
}

module.exports = {
  updateIds,
  cleanIds,
};
