const { replaceAtPoint } = require('./lib/utils');
const fs = require('fs');
const os = require('os');

function updateIds(testData, testomatioMap, workDir) {
  const files = [];
  for (const testArr of testData) {
    const file = `${workDir}/${testArr[0].file}`;
    let fileContent = fs.readFileSync(file, {encoding:'utf8'})
    const suite = testArr[0].suites[0];
    if (testomatioMap.suites[suite] && !suite.includes(testomatioMap.suites[suite])) {
      fileContent = fileContent.replace(suite, `${suite} ${testomatioMap.suites[suite]}`)
      fs.writeFileSync(file, fileContent);
    }
    for (const test of testArr) {
      if (testomatioMap.tests[test.name] && !test.name.includes(testomatioMap.tests[test.name])) {
        fileContent = replaceAtPoint(fileContent, test.updatePoint, ' ' + testomatioMap.tests[test.name]);
        fs.writeFileSync(file, fileContent);
        delete testomatioMap.tests[test.name];
      }
    }
    files.push(file);
  }
  return files;
}

function cleanIds(testData, testomatioMap = {}, workDir, dangerous = false) {
  const testIds = testomatioMap.tests ? Object.values(testomatioMap.tests) : [];
  const suiteIds = testomatioMap.suites ? Object.values(testomatioMap.suites) : [];
  const files = [];
  for (const testArr of testData) {
    const file = `${workDir}/${testArr[0].file}`;
    let fileContent = fs.readFileSync(file, {encoding:'utf8'})
    const suite = testArr[0].suites[0];
    const suiteId = `@S${parseSuite(suite)}`;
    if (suiteIds.includes(suiteId) || (dangerous && suiteId)) {
      const newTitle = suite.slice().replace(suiteId, '').trim();
      fileContent = fileContent.replace(suite, newTitle)
    }
    for (const test of testArr) {
      const testId = `@T${parseTest(test.name)}`;
      if (testIds.includes(testId) || (dangerous && testId)) {
        const newTitle = test.name.slice().replace(testId, '').trim();
        fileContent = fileContent.replace(test.name, newTitle)
      }
    }
    files.push(file);
    fs.writeFileSync(file, fileContent, (err) => {
      if (err) throw err;
    });
  }
  return files;
}

const parseTest = testTitle => {
  const captures = testTitle.match(/@T([\w\d]+)/);
  if (captures) {
    return captures[1];
  }

  return null;
};

const parseSuite = suiteTitle => {
  const captures = suiteTitle.match(/@S([\w\d]+)/);
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

module.exports = {
  updateIds,
  cleanIds,
}
