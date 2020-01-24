module.exports = {
  browser: {
    src: [
      'test/helpers/bind-polyfill.js',
      'lib/linenumber.js',
      'node_modules/mocha-given/browser/mocha-given.js',
      'test/helpers/setup.js',
      'node_modules/chai/chai.js',
      'test/helpers/should.coffee',
      'test/linenumber.coffee'
    ],
    options: {
      framework: 'mocha',
      parallel: 2,
      launch_in_ci: ['PhantomJS'],
      launch_in_dev: ['PhantomJS', 'Chrome', 'Firefox', 'Safari'],
      reporter: 'dot'
    }
  }
};
