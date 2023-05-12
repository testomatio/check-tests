const { TEST_ID_REGEX, SUITE_ID_REGEX } = require('./constants');

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

module.exports = {
  parseTest,
  parseSuite,
};
