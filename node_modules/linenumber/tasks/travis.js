module.exports = {
  options: {
    targets: {
      test: '{{ version }}',
      when: 'v0.12',
      tasks: ['istanbul:unit', 'matrix:v0.12']
    }
  }
};
