const fs = require('fs');
const debug = require('debug')('testomatio:update-ids');
const { replaceAtPoint, cleanAtPoint } = require('../lib/utils');
const { TAG_REGEX } = require('./constants');
const { parseTest, parseSuite, replaceSuiteTitle } = require('./helpers');

/**
 * Insert test ids (@T12345678) into test files
 * @param {*} testData array of arrays of test data;
 * the main array represents test files, nested arrays includes test data for each test
 * @param {*} testomatioMap mapping of test ids received from testomatio server
 * @param {*} workDir
 * @param {*} opts
 * @returns
 */
function updateIdsCommon(testData, testomatioMap, workDir, opts = {}) {
  const files = [];
  let duplicateTests = 0;
  let duplicateSuites = 0;

  debug('Test data:', testData);

  for (const testArr of testData) {
    if (!testArr.length) continue;

    const file = `${workDir}/${testArr[0].file}`;
    debug('Updating file: ', file);
    let fileContent = fs.readFileSync(file, { encoding: 'utf8' });

    let suiteId = '';
    for (const testItem of testArr) {
      for (const suite of testItem.suites) {
        if (!suite) continue;

        debug('Updating suite: ', suite);

        let suiteIndex = `${testItem.file.replace('\\', '/')}` + '#' + suite;
        debug('testIndex', suiteIndex);

        if (!testomatioMap.suites[suiteIndex]) {
          suiteIndex = suite;
        }

        const suiteWithoutTags = suite.replace(TAG_REGEX, '').trim();
        const currentSuiteId = parseSuite(suiteIndex);

        if (testomatioMap.suites[suiteIndex] === suiteId) continue;

        const existingIds = suite.match(/@S[a-z0-9]+/gi) || [];

        const mappedId = testomatioMap.suites[suiteIndex] || testomatioMap.suites[suiteWithoutTags];

        if (currentSuiteId && mappedId && existingIds.includes(mappedId)) {
          debug(`   Skipping duplicate for suite '${suiteIndex}'`);
          continue;
        }

        if (mappedId && !existingIds.includes(mappedId)) {
          const updatedSuite = `${suite} ${mappedId}`;
          fileContent = replaceSuiteTitle(suite, updatedSuite, fileContent);
          fs.writeFileSync(file, fileContent);

          suiteId = mappedId;
          delete testomatioMap.suites[suiteIndex];
          delete testomatioMap.suites[suiteWithoutTags];
        }
      }
    }
    // let suiteId = '';
    // for (const testItem of testArr) {
    //   for (const suite of testItem.suites) {
    //     if (!suite) continue;

    //     debug('Updating suite: ', suite);
    //     let suiteIndex = `${testItem.file.replace('\\', '/')}#${suite || ''}`;
    //     debug('testIndex', suiteIndex);
    //     if (!testomatioMap.suites[suiteIndex]) {
    //       suiteIndex = `${suite || ''}`; // if file is not found
    //     }
    //     const suiteWithoutTags = suite.replace(TAG_REGEX, '').trim();
    //     const currentSuiteId = parseSuite(suiteIndex);
    //     if (testomatioMap.suites[suiteIndex] == suiteId) continue;
    //     if (
    //       currentSuiteId &&
    //       testomatioMap.suites[suiteIndex] !== `@S${currentSuiteId}` &&
    //       testomatioMap.suites[suiteWithoutTags] !== `@S${currentSuiteId}`
    //     ) {
    //       debug(`   Previous ID detected in suite '${suiteIndex}'`);
    //       duplicateSuites++;
    //       continue;
    //     }
    //     if (testomatioMap.suites[suiteIndex] && !suite.includes(testomatioMap.suites[suiteIndex])) {
    //       fileContent = replaceSuiteTitle(suite, `${suite} ${testomatioMap.suites[suiteIndex]}`, fileContent);
    //       fs.writeFileSync(file, fileContent);
    //       suiteId = testomatioMap.suites[suiteIndex];
    //       delete testomatioMap.suites[suiteIndex];
    //     } else if (testomatioMap.suites[suiteWithoutTags] && !suite.includes(testomatioMap.suites[suiteWithoutTags])) {
    //       fileContent = replaceSuiteTitle(suite, `${suite} ${testomatioMap.suites[suiteWithoutTags]}`, fileContent);
    //       fs.writeFileSync(file, fileContent);
    //       suiteId = testomatioMap.suites[suiteWithoutTags];
    //       delete testomatioMap.suites[suiteWithoutTags];
    //     }
    //   }
    // }

    for (const test of testArr) {
      if (opts.framework === 'playwright' && test.name === true) continue;

      const suite = test.suites[0] || '';
      const normalizedFile = test.file.replace(/\\/g, '/');
      const normalizedName = test.name.replace(TAG_REGEX, '').trim();
      const normalizedSuite = suite.replace(TAG_REGEX, '').trim();

      let testIndex = `${normalizedFile}#${suite}#${test.name}`;
      let testWithoutTags = `${normalizedSuite}#${normalizedName}`;

      if (!testomatioMap.tests[testIndex]) {
        testIndex = `${suite}#${test.name}`;
      }
      if (!testomatioMap.tests[testIndex] && !testomatioMap.tests[testWithoutTags]) {
        testIndex = test.name;
        testWithoutTags = normalizedName;
      }

      const currentTestId = parseTest(testIndex);
      const mappedId = testomatioMap.tests[testIndex] || testomatioMap.tests[testWithoutTags];
      const existingIds = test.name.match(/@T[a-z0-9]+/gi) || [];

      if (currentTestId && mappedId && existingIds.includes(mappedId)) {
        debug(`Previous ID detected in test '${testIndex}'`);
        duplicateTests++;
        continue;
      }

      if (mappedId && !existingIds.includes(mappedId)) {
        fileContent = replaceAtPoint(fileContent, test.updatePoint, ` ${mappedId}`);
        fs.writeFileSync(file, fileContent);
        delete testomatioMap.tests[testIndex];
        delete testomatioMap.tests[testWithoutTags];
      }
    }

    // for (const test of testArr) {
    //   let testIndex = `${test.file.replace('\\', '/')}#${test.suites[0] || ''}#${test.name}`;
    //   debug('testIndex', testIndex);

    //   // this is not test; its test.skip() annotation inside a test
    //   if (opts.framework === 'playwright' && test.name === true) continue;

    //   let testWithoutTags = `${(test.suites[0] || '').replace(TAG_REGEX, '').trim()}#${test.name.replace(
    //     TAG_REGEX,
    //     '',
    //   )}`.trim();
    //   if (!testomatioMap.tests[testIndex]) {
    //     testIndex = `${test.suites[0] || ''}#${test.name}`; // if file is not found
    //   }
    //   if (!testomatioMap.tests[testIndex] && !testomatioMap.tests[testWithoutTags]) {
    //     testIndex = test.name; // if no suite title provided
    //     testWithoutTags = test.name.replace(TAG_REGEX, '').trim();
    //   }

    //   const currentTestId = parseTest(testIndex);
    //   if (
    //     currentTestId &&
    //     testomatioMap.tests[testIndex] !== `@T${currentTestId}` &&
    //     testomatioMap.tests[testWithoutTags] !== `@T${currentTestId}`
    //   ) {
    //     debug(`Previous ID detected in test '${testIndex}'`);
    //     duplicateTests++;
    //     continue;
    //   }

    //   if (testomatioMap.tests[testIndex] && !test.name.includes(testomatioMap.tests[testIndex])) {
    //     fileContent = replaceAtPoint(fileContent, test.updatePoint, ` ${testomatioMap.tests[testIndex]}`);
    //     fs.writeFileSync(file, fileContent);
    //     delete testomatioMap.tests[testIndex];
    //   } else if (testomatioMap.tests[testWithoutTags] && !test.name.includes(testomatioMap.tests[testWithoutTags])) {
    //     fileContent = replaceAtPoint(fileContent, test.updatePoint, ` ${testomatioMap.tests[testWithoutTags]}`);
    //     fs.writeFileSync(file, fileContent);
    //     delete testomatioMap.tests[testWithoutTags];
    //   }
    // }
    files.push(file);
  }
  if (duplicateSuites || duplicateTests) {
    console.log('! Previously set Test IDs detected, new IDs ignored');
    console.log('! Clean previously set Test IDs to override them');
    console.log('! Run script with DEBUG="testomatio:*" flag to get more info of affected tests ');
  }

  return files;
}

/**
 * Removes test ids (@T12345678) from test files
 * @param {*} testData
 * @param {*} testomatioMap
 * @param {*} workDir
 * @param {*} opts
 * @returns
 */
function cleanIdsCommon(testData, testomatioMap = {}, workDir, opts = { dangerous: false }) {
  const dangerous = opts.dangerous;

  const testIds = testomatioMap.tests ? Object.values(testomatioMap.tests) : [];
  const suiteIds = testomatioMap.suites ? Object.values(testomatioMap.suites) : [];
  const files = [];
  for (const testArr of testData) {
    if (!testArr.length) continue;

    const file = `${workDir}/${testArr[0].file}`;
    debug('Updating file: ', file);
    let fileContent = fs.readFileSync(file, { encoding: 'utf8' });

    for (const suites of testArr) {
      for (const suite of suites.suites) {
        if (!suite) continue;

        const suiteId = `@S${parseSuite(suite)}`;
        debug('  cleaning suite: ', suite);

        if (suiteIds.includes(suiteId) || (dangerous && suiteId)) {
          const newTitle = suite.slice().replace(suiteId, '').trim();
          fileContent = fileContent.replace(suite, newTitle);
        }
      }
    }

    for (const test of testArr) {
      const testId = `@T${parseTest(test.name)}`;
      debug('  cleaning test: ', test.name);

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

module.exports = {
  updateIdsCommon,
  cleanIdsCommon,
};
