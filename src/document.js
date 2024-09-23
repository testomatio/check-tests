const fs = require('fs');
const hash = require('object-hash');
const util = require('./lib/utils');
// eslint-disable-next-line no-unused-vars
const Decorator = require('./decorator');

/**
 *
 * @param {String} filePath
 * @param {Decorator} decorator
 */
async function createTestDoc(filePath, decorator) {
  decorator.enableComment();
  let oldData = '';
  if (fs.existsSync(filePath)) {
    oldData = fs.readFileSync(filePath, 'utf-8');
    decorator.comments = util.parseComments(oldData);
  }

  const body = `Created by [Testomat.io](https://testomat.io/)\n${decorator.getMarkdownList().join('\n')}`;
  decorator.disableComment();
  if (hash(oldData) !== hash(body)) {
    fs.writeFileSync(filePath, body, 'utf8');
  } else {
    console.log('Nothing to update in test file. So skipping it');
    return false;
  }

  return true;
}

module.exports = {
  createTestDoc,
};
