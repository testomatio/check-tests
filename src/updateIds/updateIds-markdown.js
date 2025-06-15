const debug = require('debug')('testomatio:update-ids-markdown');
const fs = require('fs');
const glob = require('glob');
const path = require('path');

/**
 * Insert test ids (@T12345678) and suite ids (@S12345678) into markdown test files
 * @param {*} testomatioMap mapping of test ids received from testomatio server
 * @param {*} workDir
 * @param {*} opts
 * @returns
 */
function updateIdsMarkdown(testomatioMap, workDir, opts = {}) {
  const patternWithFullPath = path.join(path.resolve(workDir), opts.pattern);
  const files = glob.sync(patternWithFullPath);
  debug('Files:', files);

  const updatedFiles = [];

  for (const file of files) {
    debug(`Updating file: ${file}`);
    let fileContent = fs.readFileSync(file, { encoding: 'utf8' });
    const lines = fileContent.split('\n');
    let isModified = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for heading lines (# or ##)
      if (!line.startsWith('#')) continue;

      const isTest = line.startsWith('##');
      const isSuite = line.startsWith('#') && !line.startsWith('##');

      if (!isTest && !isSuite) continue;

      const name = line.replace(/^#+\s*/, '');
      const mappedId = isTest ? testomatioMap.tests[name] : testomatioMap.suites[name];

      if (!mappedId) continue;

      const result = updateId(lines, i, mappedId);
      if (result) {
        isModified = true;
        if (isTest) {
          delete testomatioMap.tests[name];
        } else {
          delete testomatioMap.suites[name];
        }
        debug(`Updated ID for ${name}: ${mappedId}`);
      }
    }

    if (isModified) {
      fs.writeFileSync(file, lines.join('\n'));
      updatedFiles.push(file);
    }
  }

  return updatedFiles;
}

/**
 * Update ID in metadata comment block
 * @param {Array} lines - file lines
 * @param {number} lineNumber - line number where test/suite title is found
 * @param {string} mappedId - ID to insert
 * @returns {boolean} - true if modified
 */
function updateId(lines, lineNumber, mappedId) {
  // Find the metadata comment block before this line
  let commentStart = -1;
  let commentEnd = -1;

  // Look backwards for <!-- test or <!-- suite
  for (let i = lineNumber - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line === '-->') {
      commentEnd = i;
    }
    if (line === '<!-- test' || line === '<!-- suite') {
      commentStart = i;
      break;
    }
  }

  // If no metadata comment found, we can't add ID
  if (commentStart === -1 || commentEnd === -1) {
    debug(`No metadata comment found at line ${lineNumber}`);
    return false;
  }

  // Look for existing id: line in metadata
  for (let i = commentStart + 1; i < commentEnd; i++) {
    if (lines[i].trim().startsWith('id:')) {
      lines[i] = `id: ${mappedId}`;
      return true;
    }
  }

  // Add new id line after comment start
  lines.splice(commentStart + 1, 0, `id: ${mappedId}`);
  return true;
}

/**
 * Remove test ids from markdown test files
 */
function cleanIdsMarkdown(testomatioMap, workDir, opts = { dangerous: false }) {
  const patternWithFullPath = path.join(path.resolve(workDir), opts.pattern);
  const files = glob.sync(patternWithFullPath);

  debug('Files:', files);
  const updatedFiles = [];

  for (const file of files) {
    debug(`Cleaning ids in file: ${file}`);
    let fileContent = fs.readFileSync(file, { encoding: 'utf8' });
    const lines = fileContent.split('\n');
    let isModified = false;

    let inComment = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === '<!-- suite' || line === '<!-- test') {
        inComment = true;
        continue;
      }

      if (inComment && line === '-->') {
        inComment = false;
        continue;
      }

      if (inComment && line.startsWith('id:')) {
        lines.splice(i, 1);
        i--; // Adjust index after removal
        isModified = true;
      }
    }

    if (isModified) {
      fs.writeFileSync(file, lines.join('\n'));
      updatedFiles.push(file);
    }
  }

  return updatedFiles;
}

module.exports = {
  updateIdsMarkdown,
  cleanIdsMarkdown,
};
