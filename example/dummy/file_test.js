const assert = require('assert');

// Create a test suite (group) called Math
describe('Math', () => {
  it('should test', () => {
    // Our actual test: 3*3 SHOULD EQUAL 9
    assert.equal(9, 3 * 3);
  });
});
