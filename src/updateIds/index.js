const { updateIdsCommon, cleanIdsCommon } = require('./updateIds');
const { updateIdsNewman, cleanIdsNewman } = require('./updateIds-newman');

function updateIds(testData, testomatioMap, workDir, opts) {
  if (opts?.framework === 'newman') return updateIdsNewman(testomatioMap, workDir, opts);
  return updateIdsCommon(testData, testomatioMap, workDir, opts);
}

function cleanIds(testData, testomatioMap, workDir, opts) {
  if (opts?.framework === 'newman') return cleanIdsNewman(testomatioMap, workDir, opts);
  return cleanIdsCommon(testData, testomatioMap, workDir, opts);
}

module.exports = {
  updateIds,
  cleanIds,
};
