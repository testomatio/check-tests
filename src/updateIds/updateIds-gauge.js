const fs = require('fs');
const glob = require('glob');
const path = require('path');
const debug = require('debug')('testomatio:update-ids-gauge');
const { TAG_REGEX, SUITE_ID_REGEX, TEST_ID_REGEX } = require('./constants');

// Match only proper IDs like @SXXXXXXXX or @TXXXXXXXX (8 chars)
const ID_REGEX = new RegExp(`${SUITE_ID_REGEX.source}|${TEST_ID_REGEX.source}`, 'gi');
// Also match any legacy or malformed @S* / @T* tokens to ensure replacement
const ANY_ST_TOKEN_REGEX = /@(S|T)[A-Za-z0-9]+/g;

const isSuite = line => line.startsWith('# ');
const isTest = line => line.startsWith('## ');
const isUnderlinedSuite = (line, index) => /^=+$/.test(line.trim()) && index > 0;
const isUnderlinedTest = (line, index) => /^-+$/.test(line.trim()) && index > 0;

const extractName = line =>
  line
    .replace(/^#{1,2}\s*/, '')
    .replace(TAG_REGEX, '')
    .trim();
const extractUnderlinedName = line => line.trim();

// kept for potential future use; avoid lint error
// const extractIds = line => line.match(ID_REGEX) || [];

const buildKeys = (file, suite, test) => ({
  full: `${file}#${suite}${test ? `#${test}` : ''}`,
  simple: test || suite,
  normalized: (test || suite).replace(TAG_REGEX, '').trim(),
});

const findMappedId = (map, keys) => map[keys.full] || map[keys.simple] || map[keys.normalized];

const updateLine = (line, id) => {
  // Remove any previously set Suite/Test IDs and append the new one
  // This guarantees there is at most one ID in the title
  // Remove both strict IDs and any legacy @S* / @T* tokens
  const lineWithoutIds = line.replace(ID_REGEX, '').replace(ANY_ST_TOKEN_REGEX, '').replace(/\s+/g, ' ').trim();
  return `${lineWithoutIds} ${id}`.trim();
};

const removeIds = (line, ids) => {
  let newLine = line;
  ids.forEach(id => {
    newLine = newLine.replace(new RegExp(`${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), '');
  });
  return newLine.replace(/\s+/g, ' ').trim();
};

const processSuite = (line, file, map) => {
  const name = extractName(line);
  const keys = buildKeys(file, name);
  const mappedId = findMappedId(map, keys);

  if (mappedId) {
    delete map[keys.full];
    delete map[keys.simple];
    delete map[keys.normalized];
    return { updated: true, line: updateLine(line, mappedId), name };
  }
  return { updated: false, line, name };
};

const processTest = (line, file, map, suiteName) => {
  const name = extractName(line);
  const keys = buildKeys(file, suiteName, name);
  const mappedId = findMappedId(map, keys);

  if (mappedId) {
    delete map[keys.full];
    delete map[keys.simple];
    delete map[keys.normalized];
    return { updated: true, line: updateLine(line, mappedId), name };
  }
  return { updated: false, line, name };
};

const processUnderlinedSuite = (line, file, map) => {
  const name = extractUnderlinedName(line);
  const keys = buildKeys(file, name);
  const mappedId = findMappedId(map, keys);

  if (mappedId) {
    delete map[keys.full];
    delete map[keys.simple];
    delete map[keys.normalized];
    return { updated: true, line: updateLine(line, mappedId), name };
  }
  return { updated: false, line, name };
};

const processUnderlinedTest = (line, file, map, suiteName) => {
  const name = extractUnderlinedName(line);
  const keys = buildKeys(file, suiteName, name);
  const mappedId = findMappedId(map, keys);

  if (mappedId) {
    delete map[keys.full];
    delete map[keys.simple];
    delete map[keys.normalized];
    return { updated: true, line: updateLine(line, mappedId), name };
  }
  return { updated: false, line, name };
};

const processLine = (line, index, lines, file, map, currentSuite) => {
  if (isSuite(line)) {
    const result = processSuite(line, file, map.suites);
    return { line: result.line, suite: result.name, updated: result.updated };
  }

  if (isTest(line)) {
    const result = processTest(line, file, map.tests, currentSuite);
    return { line: result.line, suite: currentSuite, updated: result.updated };
  }

  if (isUnderlinedSuite(line, index)) {
    const result = processUnderlinedSuite(lines[index - 1], file, map.suites);
    return { line: result.line, suite: result.name, updated: result.updated, replaceIndex: index - 1 };
  }

  if (isUnderlinedTest(line, index)) {
    const prevLine = lines[index - 1]?.trim();
    if (prevLine && !/^=+$/.test(prevLine)) {
      const result = processUnderlinedTest(prevLine, file, map.tests, currentSuite);
      return { line: result.line, suite: currentSuite, updated: result.updated, replaceIndex: index - 1 };
    }
  }

  return { line, suite: currentSuite, updated: false };
};

const processFile = (file, map) => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  let isModified = false;
  let currentSuite = null;

  for (let i = 0; i < lines.length; i++) {
    const result = processLine(lines[i], i, lines, file, map, currentSuite);

    if (result.replaceIndex !== undefined) {
      lines[result.replaceIndex] = result.line;
    } else {
      lines[i] = result.line;
    }

    if (result.updated) isModified = true;
    if (result.suite !== currentSuite) currentSuite = result.suite;
  }

  if (isModified) {
    fs.writeFileSync(file, lines.join('\n'));
    return file;
  }
  return null;
};

const updateIdsGauge = (testomatioMap, workDir, opts = {}) => {
  const pattern = path.join(path.resolve(workDir), opts.pattern);
  const files = glob.sync(pattern);
  debug('Files:', files);

  return files.map(file => processFile(file, testomatioMap)).filter(Boolean);
};

const cleanLine = (line, ids) => removeIds(line, ids);

const cleanFile = (file, ids) => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  let isModified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let newLine = line;

    if (isSuite(line) || isTest(line)) {
      newLine = cleanLine(line, ids);
    } else if (isUnderlinedSuite(line, i) || isUnderlinedTest(line, i)) {
      newLine = cleanLine(lines[i - 1], ids);
      lines[i - 1] = newLine;
    }

    if (newLine !== line) isModified = true;
    if (newLine !== line && !isUnderlinedSuite(line, i) && !isUnderlinedTest(line, i)) {
      lines[i] = newLine;
    }
  }

  if (isModified) {
    fs.writeFileSync(file, lines.join('\n'));
    return file;
  }
  return null;
};

const cleanIdsGauge = (testomatioMap, workDir, opts = { dangerous: false }) => {
  const pattern = path.join(path.resolve(workDir), opts.pattern);
  const files = glob.sync(pattern);

  const testIds = testomatioMap.tests ? Object.values(testomatioMap.tests) : [];
  const suiteIds = testomatioMap.suites ? Object.values(testomatioMap.suites) : [];
  const ids = [...testIds, ...suiteIds];

  if (opts.dangerous) {
    return files
      .map(file => {
        const content = fs.readFileSync(file, 'utf8');
        const newContent = content.replace(ID_REGEX, '').replace(/\s+/g, ' ').trim();
        if (newContent !== content) {
          fs.writeFileSync(file, newContent);
          return file;
        }
        return null;
      })
      .filter(Boolean);
  }

  return files.map(file => cleanFile(file, ids)).filter(Boolean);
};

module.exports = {
  updateIdsGauge,
  cleanIdsGauge,
};
