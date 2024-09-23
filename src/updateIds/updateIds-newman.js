const debug = require('debug')('testomatio:update-ids-newman');
const fs = require('fs');
const glob = require('glob');
const path = require('path');
const { TAG_REGEX } = require('./constants');
const { parseTest } = require('./helpers');

/**
 *
 * @param {*} pathToRequestThrouthTheFolders the same as suites
 * @param {*} currentRequestName request name without id
 * @param {*} testId testId to add to request
 */
const addIdToRequestAndUpdateCollection = function (
  collection,
  pathToRequestThrouthTheFolders,
  currentRequestName,
  testId,
) {
  function addIdToRequest(items, pathToRequestThrouthTheFolders) {
    const currentFolder = pathToRequestThrouthTheFolders.shift();
    for (const item of items) {
      // if no currentFolder - 1) request is directly inside the collection or 2) we have reached the target folder
      if (item.name === currentFolder || !currentFolder) {
        // we are in the destination folder
        if (pathToRequestThrouthTheFolders.length === 0) {
          // if item is request we are searching
          if (item.request && item.name === currentRequestName) {
            item.name += ` ${testId}`;
            return true;
          }

          // if item is final folder, iterating through requests
          for (const request of item.item) {
            if (request.name === currentRequestName) {
              request.name += ` ${testId}`;
              debug('Request name updated', item.name);
              return true;
            }
          }
          // destination folder not reached yet, go deeper through the folders (suites)
        } else if (item.item) {
          if (addIdToRequest(item.item, pathToRequestThrouthTheFolders)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  if (addIdToRequest(collection.item, pathToRequestThrouthTheFolders)) {
    debug(`"${collection.info.name}" collection  updated`);
  } else {
    debug(`Request "${currentRequestName}" not found in ${pathToRequestThrouthTheFolders}`);
  }
  return collection;
};

/**
 *
 * @param {*} testData array of arrays of test data;
 * the main array represents test files, nested arrays includes test data for each test
 * @param {*} testomatioMap mapping of test ids received from testomatio server
 * @param {*} workDir
 * @param {*} opts
 * @returns
 */
exports.updateIdsNewman = function (testomatioMap, workDir, opts = {}) {
  const patternWithFullPath = path.join(path.resolve(workDir), opts.pattern);
  const files = glob.sync(patternWithFullPath);
  debug('Files:', files);

  debug('Testomatio map:\n', testomatioMap);
  const updatedFiles = [];
  let duplicatedTests = 0;

  // debug(`Test data (containing tests from ${testData.length} files)`, JSON.stringify(testData));

  // each file represents collection
  for (const file of files) {
    const fileContent = fs.readFileSync(file, { encoding: 'utf8' });

    let collection = {};
    try {
      collection = JSON.parse(fileContent);
    } catch (e) {
      console.warn(`Cannot parse file ${file}. Ignoring.`);
      continue;
    }

    const items = collection.item;

    /**
     *
     * @param {*} items collection items (could be folder or request)
     * @param {*} suites represents path to request through the folders; (will not contain collection name)
     * @returns
     */
    /* eslint-disable */
    function iterateThroughCollectionItems(items, suites = []) {
      for (const item of items) {
        if (item.request) {
          debug(`\nAnalyzing request ${item.name}`);
          const theClosestSuite = suites[suites.length - 1] || '';

          let testIndex = `${theClosestSuite}#${item.name}`;
          let testIndexWithoutTags = `${theClosestSuite.replace(TAG_REGEX, '').trim()}#${item.name.replace(
            TAG_REGEX,
            '',
          )}`.trim();

          // if testId not fount in map > don't use suite and # sign
          if (!testomatioMap.tests[testIndex] && !testomatioMap.tests[testIndexWithoutTags]) {
            testIndex = item.name;
            testIndexWithoutTags = item.name.replace(TAG_REGEX, '').trim();
          }

          const currentTestId = parseTest(testIndex);
          debug(`testIndex:', ${testIndex}
          testIndexWithoutTags:', ${testIndexWithoutTags}
          currentTestId:', ${currentTestId}`);

          if (
            currentTestId &&
            testomatioMap.tests[testIndex] !== `@T${currentTestId}` &&
            testomatioMap.tests[testIndexWithoutTags] !== `@T${currentTestId}`
          ) {
            debug(`Previous ID detected in test '${testIndex}'`);
            duplicatedTests++;
            continue;
          }

          const isTestNameIncludesId = item.name.includes(testomatioMap.tests[testIndex]);
          // if testId found in map and test name does not include test id, add test id
          if (testomatioMap.tests[testIndex] && !isTestNameIncludesId) {
            debug(`Adding test id for test ${suites}: ${item.name}`);
            collection = addIdToRequestAndUpdateCollection(
              collection,
              suites,
              item.name,
              testomatioMap.tests[testIndex],
            );

            delete testomatioMap.tests[testIndex];
          } else if (
            testomatioMap.tests[testIndexWithoutTags] &&
            !item.name.includes(testomatioMap.tests[testIndexWithoutTags])
          ) {
            debug(`Adding test id for test ${suites}: ${item.name}`);
            collection = addIdToRequestAndUpdateCollection(
              collection,
              suites,
              item.name,
              testomatioMap.tests[testIndex],
            );

            delete testomatioMap.tests[testIndex];
          }

          // item is request, stop iterating deeper
          continue;
        }

        // if item includes other items - it is folder;
        // if item.item.length=0, folder does contain nothing (is empty)
        if (item.item?.length) {
          suites.push(item.name);
          iterateThroughCollectionItems(item.item, suites);
        }

        // reset suites on each main item (child of root/collection)
        suites = [];
      }
    }

    iterateThroughCollectionItems(items);

    // update file
    fs.writeFileSync(file, JSON.stringify(collection, null, 2));
    updatedFiles.push(file);

    if (duplicatedTests) {
      console.log(`! Previously set Test IDs detected, new IDs ignored
      Clean previously set Test IDs to override them');
      Run script with DEBUG="testomatio:*" flag to get more info of affected tests`);
    }
  }
  return updatedFiles;
};

exports.cleanIdsNewman = function (testomatioMap, workDir, opts) {
  const dangerous = opts.dangerous;

  const patternWithFullPath = path.join(path.resolve(workDir), opts.pattern);
  const files = glob.sync(patternWithFullPath);
  debug('Files:', files);

  // debug('Testomatio map:\n', testomatioMap);
  const updatedFiles = [];

  // each file represents collection
  for (const file of files) {
    debug(`Cleaning ids in file ${file}`);
    const fileContent = fs.readFileSync(file, { encoding: 'utf8' });

    let collection = {};
    try {
      collection = JSON.parse(fileContent);
    } catch (e) {
      console.warn(`Cannot parse file ${file}. Ignoring.`);
      continue;
    }

    const items = collection.item;
    const testIdsFromMap = testomatioMap.tests ? Object.values(testomatioMap.tests) : [];

    /**
     *
     * @param {*} items collection items (could be folder or request)
     * @returns
     */
    /* eslint-disable */
    function iterateThroughCollectionItems(items) {
      for (const item of items) {
        if (item.request) {
          const testId = `@T${parseTest(item.name)}`;
          if (item.name.includes(testId) || (dangerous && testIdsFromMap)) {
            item.name = item.name.replace(testId, '').trim();
            debug(`Remove test id ${testId}`);
          }

          // item is request, stop iterating deeper
          continue;
        }

        // if item includes other items - it is folder;
        // if item.item.length=0, folder does contain nothing (is empty)
        if (item.item?.length) {
          iterateThroughCollectionItems(item.item);
        }
      }
    }

    iterateThroughCollectionItems(items);

    // update file
    fs.writeFileSync(file, JSON.stringify(collection, null, 2));
    updatedFiles.push(file);
  }
  return updatedFiles;
};
