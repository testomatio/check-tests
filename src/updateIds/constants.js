const TAG_REGEX = /\@([\w\d\-\(\)\.\,\*:]+)/g;
const TEST_ID_REGEX = /@T([\w\d]{8})/;
const SUITE_ID_REGEX = /@S([\w\d]{8})/;

module.exports = {
  SUITE_ID_REGEX,
  TAG_REGEX,
  TEST_ID_REGEX,
};
