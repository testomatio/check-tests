module.exports = {
  tests: {
    files: ['lib/**/*.js', 'test/**/*.coffee'],
    tasks: ['mocha'],
    options: {
      atBegin: true
    }
  }
};
