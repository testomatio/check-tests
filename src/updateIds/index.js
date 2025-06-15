const { updateIdsCommon, cleanIdsCommon } = require('./updateIds');
const { updateIdsNewman, cleanIdsNewman } = require('./updateIds-newman');
const { updateIdsMarkdown, cleanIdsMarkdown } = require('./updateIds-markdown');

function updateIds(testData, testomatioMap, workDir, opts) {
  if (opts?.framework === 'newman') return updateIdsNewman(testomatioMap, workDir, opts);
  if (opts?.framework === 'manual') return updateIdsMarkdown(testomatioMap, workDir, opts);
  return updateIdsCommon(testData, testomatioMap, workDir, opts);
}

function cleanIds(testData, testomatioMap, workDir, opts) {
  if (opts?.framework === 'newman') return cleanIdsNewman(testomatioMap, workDir, opts);
  if (opts?.framework === 'manual') return cleanIdsMarkdown(testomatioMap, workDir, opts);
  return cleanIdsCommon(testData, testomatioMap, workDir, opts);
}

module.exports = {
  updateIds,
  cleanIds,
};
