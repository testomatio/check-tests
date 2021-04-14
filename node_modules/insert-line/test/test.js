'use strict'

const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const insertLine = require('../')
const srcListPath = path.join(__dirname, 'list')
const destListPath = path.join(__dirname, 'test.list')

describe('insert-line', function() {

  beforeEach(function(done) {
    fs.createReadStream(srcListPath).pipe(fs.createWriteStream(destListPath))
    .on('finish', done)
  })

  afterEach(function(done) {
    fs.unlink(destListPath, done)
  })

  describe('- async insertion', function() {

    it('should throw if file is not specified', function(done) {
      assert.throws(insertLine)
      done()
    })

    it('should throw if line number is not specified', function(done) {
      insertLine(destListPath).content('hello').then(function(err) {
        assert(err)
        done()
      })
    })

    it('should throw if line number is less than 1', function(done) {
      assert.throws(function() {
        insertLine(destListPath).content('hello').at(0).then(function(err) { })
      })
      done()
    })

    it('should throw if line number is more than (number of lines + 1)', function(done) {
      insertLine(destListPath).content('hello').at(100).then(function(err) {
        assert(err)
        done()
      })
    })

    it('should prepend a line using .prepend() ', function(done) {
      insertLine(destListPath).prepend('Rocks').then(function(err) {
        var content = fs.readFileSync(destListPath, 'utf8')
        assert(content.startsWith('Rocks' + os.EOL))
        assert.equal(9, content.split(os.EOL).length)
        done(err)
      })
    })

    it('should append a line using .append()', function(done) {
      insertLine(destListPath).append('Rocks').then(function(err) {
        var content = fs.readFileSync(destListPath, 'utf8')
        assert(content.endsWith('Rocks' + os.EOL))
        assert.equal(9, content.split(os.EOL).length)
        done(err)
      })
    })

    it('should prepend a line using .at()', function(done) {
      insertLine(destListPath).content('Rocks').at(1).then(function(err) {
        var content = fs.readFileSync(destListPath, 'utf8')
        assert(content.startsWith('Rocks' + os.EOL))
        assert.equal(9, content.split(os.EOL).length)
        done(err)
      })
    })

    it('should append a line using .at()', function(done) {
      insertLine(destListPath).content('Rocks').at(9).then(function(err) {
        var content = fs.readFileSync(destListPath, 'utf8')
        assert(content.endsWith('Rocks' + os.EOL))
        assert.equal(9, content.split(os.EOL).length)
        done(err)
      })
    })

    it('should support padding', function(done) {
      insertLine(destListPath).content('Rocks', { padding: 2, padWith: '\t' }).at(9).then(function(err) {
        var content = fs.readFileSync(destListPath, 'utf8')
        assert(content.endsWith('\t\tRocks' + os.EOL))
        assert.equal(9, content.split(os.EOL).length)
        done(err)
      })
    })

    it('should overwrite a line', function(done) {
      insertLine(destListPath).content('Pets:', { overwrite: true, padding: 2 }).at(5).then(function(err) {
        var content = fs.readFileSync(destListPath, 'utf8')
        var lines = content.split(os.EOL)
        assert.equal('  Pets:', lines[4])
        assert.equal('    - Cats', lines[5])
        assert.equal(8, content.split(os.EOL).length)
        done(err)
      })
    })

  })

  describe('- synchronous insertion', function() {

    it('should throw if line number is less than 1', function() {
      assert.throws(function() {
        insertLine(destListPath).contentSync('hello').at(0)
      })
    })

    it('should throw if line number is more than (number of lines + 1)', function() {
      assert.throws(function() {
        insertLine(destListPath).contentSync('hello').at(100)
      })
    })

    it('should prepend a line using .prepend() ', function() {
      insertLine(destListPath).prependSync('Rocks')
      var content = fs.readFileSync(destListPath, 'utf8')
      assert(content.startsWith('Rocks' + os.EOL))
      assert.equal(9, content.split(os.EOL).length)
    })

    it('should append a line using .append()', function() {
      insertLine(destListPath).appendSync('Rocks')
      var content = fs.readFileSync(destListPath, 'utf8')
      assert(content.endsWith('Rocks' + os.EOL))
      assert.equal(9, content.split(os.EOL).length)
    })

    it('should prepend a line using .at()', function() {
      insertLine(destListPath).contentSync('Rocks').at(1)
      var content = fs.readFileSync(destListPath, 'utf8')
      assert(content.startsWith('Rocks' + os.EOL))
      assert.equal(9, content.split(os.EOL).length)
    })

    it('should append a line using .at()', function() {
      insertLine(destListPath).contentSync('Rocks').at(9)
      var content = fs.readFileSync(destListPath, 'utf8')
      assert(content.endsWith('Rocks' + os.EOL))
      assert.equal(9, content.split(os.EOL).length)
    })

    it('should support padding', function() {
      insertLine(destListPath).contentSync('Rocks', { padding: 2, padWith: '\t' }).at(9)
      var content = fs.readFileSync(destListPath, 'utf8')
      assert(content.endsWith('\t\tRocks' + os.EOL))
      assert.equal(9, content.split(os.EOL).length)
    })

    it('should overwrite a line', function() {
      insertLine(destListPath).contentSync('Pets:', { overwrite: true, padding: 2 }).at(5)
      var content = fs.readFileSync(destListPath, 'utf8')
      var lines = content.split(os.EOL)
      assert.equal('  Pets:', lines[4])
      assert.equal('    - Cats', lines[5])
      assert.equal(8, content.split(os.EOL).length)
    })

  })

})
