const { TEST_ID_REGEX, SUITE_ID_REGEX } = require('./constants');

const SUITE_KEYWORDS = ['describe', 'context', 'suite', 'Feature'].map(k => new RegExp(`(\\s|^)${k}(\\(|\\s)`));
const SUITE_KEYWORDS_SPECIAL = ['describe', 'context', 'suite', 'Feature'].map(
  k => new RegExp(`^(?=.*?\\b${k}\\b).*`, 'gm'),
);
const LINE_START_REGEX = /^[ \t]*(import|const|let|var)\s+.*$/;

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

  // try to find string near keyword
  for (const lineNumber in lines) {
    if (lines[lineNumber].match(LINE_START_REGEX)) continue;

    const line = lines[lineNumber];

    if (line.includes(title)) {
      for (const keyword of SUITE_KEYWORDS.concat(SUITE_KEYWORDS_SPECIAL)) {
        if (line.match(keyword)) {
          for (let i = lineNumber; i < lines.length; i++) {
            if (lines[i].includes(title)) {
              lines[i] = line.replace(title, replace);
              return lines.join('\n');
            }
          }
        }
      }
    }
  }

  return content.replace(title, replace);
};

module.exports = {
  parseTest,
  parseSuite,
  replaceSuiteTitle,
};
