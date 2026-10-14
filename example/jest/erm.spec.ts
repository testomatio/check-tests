const getResource = () => ({
  [Symbol.dispose]: () => { console.log('disposed'); },
});

describe('ERM', () => {
  test('using works', () => {
    using r = getResource();
    expect(1).toBe(1);
  });
});
