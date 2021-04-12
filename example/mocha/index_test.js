const assert = require('assert');

// Create a test suite (group) called Math
describe('Math', () => {
  it('should test if 3*3 = 9', () => {
    // Our actual test: 3*3 SHOULD EQUAL 9
    assert.equal(9, 3 * 3);
  });
  // // Test Two: A string explanation of what we're testing
  // it('should test (3-4)*8 SHOULD EQUAL -8', function(){
  //   // Our actual test: (3-4)*8 SHOULD EQUAL -8
  //   assert.equal(-8, (3-4)*8);
  // });
  xit('should be clone', () => {
    // Our actual test: 3*3 SHOULD EQUAL 9
    assert.equal(9, 3 * 3);
  });

  it.skip('should be second clone', () => {
    // Our actual test: 3*3 SHOULD EQUAL 9
    assert.equal(9, 3 * 3);
  });

  describe.skip('NoMath', () => {
    it('should be disabled', () => {});
  });
});
