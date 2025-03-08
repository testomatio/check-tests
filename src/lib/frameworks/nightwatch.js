const path = require('path');

// if you need to expand the adapter with options, use opts = {}
module.exports = (ast, file = '', source = '') => {
  let exported;

  let beforeEach = '';
  let beforeAll = '';

  try {
    exported = require(path.join(process.cwd(), file));
  } catch (err) {
    try {
      const match = source.split(/module.exports\s*=\s*/)[1];
      eval(`exported = ${match}`);
    } catch (err) {
      console.error(`Can't parse ${file}; It should be module.exports = {} format`);
      return [];
    }
  }

  const tests = [];

  for (const testName in exported) {
    if (typeof exported[testName] !== 'function') continue;
    if (testName == 'beforeEach') {
      beforeEach = exported[testName].toString();
      continue;
    }
    if (testName == 'beforeAll') {
      beforeAll = exported[testName].toString();
      continue;
    }

    if (['beforeEach', 'afterEach', 'before', 'after'].includes(testName)) continue;

    const testFn = exported[testName];

    let code = testFn.toString();
    if (beforeEach) {
      code = `beforeEach(${beforeEach})\n\n${code}`;
    }
    if (beforeAll) {
      code = `beforeAll(${beforeAll})\n\n${code}`;
    }

    tests.push({
      name: testName,
      suites: [file.split('/').pop()],
      code,
      file,
    });
  }

  return tests;
};
