module.exports = {
  mocha: ['mochaTest:test'],
  test: ['jshint:all', 'mocha', 'testem:ci:browser'],
  'default': ['jshint:all', 'mocha', 'browser'],
  coverage: ['istanbul:unit', 'open:coverage'],
  ci: ['test', 'travis'],
  browser: 'testem:run:browser',
  build: ['clean:dist', 'copy:dist', 'uglify:dist']
};
