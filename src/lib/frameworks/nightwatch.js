const path = require('path');

// if you need to expand the adapter with options, use opts = {}
module.exports = (ast, file = '', source = '') => {
  let exported;

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
    if (['beforeEach', 'afterEach', 'before', 'after'].includes(testName)) continue;

    const testFn = exported[testName];

    tests.push({
      name: testName,
      suites: [file.split('/').pop()],
      code: testFn.toString(),
      file,
    });
  }

  return tests;
};
