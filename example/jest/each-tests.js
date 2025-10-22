describe('Jest Each Tests Suite', () => {
  // Regular test.each
  test.each([1, 2, 3])('test.each with number %i', num => {
    expect(num).toBeLessThan(5);
  });

  // Regular it.each
  it.each(['apple', 'banana', 'cherry'])('it.each with fruit %s', fruit => {
    expect(fruit).toBeDefined();
  });

  // test.concurrent.each - основна проблемна конструкція
  test.concurrent.each([1, 2, 3])('test.concurrent.each with number %i', async num => {
    expect(num).toBeLessThan(5);
  });

  // it.concurrent.each
  it.concurrent.each(['red', 'green', 'blue'])('it.concurrent.each with color %s', async color => {
    expect(color).toBeDefined();
  });

  // Skipped each tests
  test.each([1, 2, 3]).skip('skipped test.each with number %i', num => {
    expect(num).toBeLessThan(5);
  });

  it.each(['x', 'y', 'z']).skip('skipped it.each with letter %s', letter => {
    expect(letter).toBeDefined();
  });

  // Skipped concurrent each tests
  test.concurrent.each([1, 2, 3]).skip('skipped test.concurrent.each with number %i', async num => {
    expect(num).toBeLessThan(5);
  });

  it.concurrent.each(['a', 'b', 'c']).skip('skipped it.concurrent.each with letter %s', async letter => {
    expect(letter).toBeDefined();
  });

  // Each with multiple parameters
  test.each([
    [1, 2, 3],
    [4, 5, 9],
    [7, 8, 15],
  ])('test.each with sum %i + %i = %i', (a, b, expected) => {
    expect(a + b).toBe(expected);
  });

  // Concurrent each with multiple parameters
  test.concurrent.each([
    ['hello', 5],
    ['world', 5],
    ['test', 4],
  ])('test.concurrent.each with string "%s" has length %i', async (str, expectedLength) => {
    expect(str.length).toBe(expectedLength);
  });

  // Regular tests for comparison
  test('regular test for comparison', () => {
    expect(true).toBe(true);
  });

  it('regular it for comparison', () => {
    expect(1 + 1).toBe(2);
  });

  // Regular concurrent tests for comparison
  test.concurrent('regular test.concurrent for comparison', async () => {
    expect(true).toBe(true);
  });

  it.concurrent('regular it.concurrent for comparison', async () => {
    expect(1 + 1).toBe(2);
  });
});
