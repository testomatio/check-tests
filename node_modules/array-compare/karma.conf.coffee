module.exports = (config) ->
  config.set
    basePath: "./"
    frameworks: ["mocha", 'chai', 'sinon-chai', 'browserify']
    files: [ "test/*.spec.coffee" ]
    preprocessors:
      "test/*.spec.coffee": "browserify"

    # LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
    logLevel: config.LOG_INFO
    autoWatch: false
    port: 9876

    # Chrome, Firefox, PhantomJS
    browsers: ["PhantomJS"]
    singleRun: true
    reporters: ['mocha']
    browserify:
      extensions: ['.coffee']
