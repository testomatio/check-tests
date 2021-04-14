'use strict'

var fs = require('fs')
var os = require('os')

function Inserter(filePath) {
  if (typeof filePath === 'undefined') {
    throw new Error('File path not specified')
  }
  this.filePath = filePath
  return this
}

Inserter.prototype.content = function(lineContent, options) {
  return setUpContent.bind(this)(lineContent, options, false)
}

Inserter.prototype.contentSync = function(lineContent, options) {
  return setUpContent.bind(this)(lineContent, options, true)
}

Inserter.prototype.at = function(lineNumber) {
  if (!this.options.append) {
    lineNumber = parseInt(lineNumber)
    if (typeof lineNumber !== 'number' || lineNumber <= 0) {
      throw new Error('Invalid line number')
    }
  }
  this.atLineNumber = lineNumber
  if (this.options.sync) {
    var fileContent = fs.readFileSync(this.filePath, 'utf8');
    return insert(this.filePath, fileContent, this.atLineNumber, this.lineContent, this.options)
  } else {
    return this
  }
} 

Inserter.prototype.prepend = function(lineContent, options) {
  if (typeof options === 'undefined') { options = {} }
  options.prepend = true
  return this.content(lineContent, options)
}

Inserter.prototype.prependSync = function(lineContent, options) {
  if (typeof options === 'undefined') { options = {} }
  options.prepend = true
  return this.contentSync(lineContent, options)
}

Inserter.prototype.append = function(lineContent, options) {
  if (typeof options === 'undefined') { options = {} }
  options.append = true
  return this.content(lineContent, options)
}

Inserter.prototype.appendSync = function(lineContent, options) {
  if (typeof options === 'undefined') { options = {} }
  options.append = true
  return this.contentSync(lineContent, options)
}

Inserter.prototype.then = function(callback) {
  if (typeof this.atLineNumber === 'undefined' && (!this.options.prepend && !this.options.append)) {
    return callback(new Error('Line number not set'))
  }
  var filePath = this.filePath
  var self = this
  fs.access(filePath, function(err) {
    if (err) return callback(err)
    fs.readFile(filePath, 'utf8', function(err, fileContent) {
      if (err) return callback(err)
      insert(self.filePath, fileContent, self.atLineNumber, self.lineContent, self.options, callback)
    })
  })
}

function setUpContent(lineContent, options, sync) {
  if (typeof lineContent === 'undefined') {
    lineContent = ''
  }
  this.options = {
    prepend: false,
    append: false,
    padding: 0,
    padWith: ' ',
    eol: os.EOL,
    overwrite: false,
    sync: sync || false
  }
  if (typeof options !== 'undefined') {
    if ('prepend' in options) this.options.prepend = options.prepend
    if ('append' in options) this.options.append = options.append
    if ('padding' in options) this.options.padding = options.padding
    if ('padWith' in options) this.options.padWith = options.padWith
    if ('eol' in options) this.options.eol = options.eol
    if ('overwrite' in options) this.options.overwrite = options.overwrite
  }
  this.lineContent = lineContent.toString()
  if (this.options.sync) {
    if (this.options.prepend) {
      return this.at(1)
    } else if (this.options.append) {
      return this.at()
    } else {
      return this
    }
  } else {
    return this
  }
}

function insert(filePath, fileContent, atLineNumber, lineContent, options, callback) {
  var prepend = false 
  var append = false
  var newLines = []
  var updatedContent
  var padWith = options.padWith || ''
  var padding = options.padding || 0
  var padString = padWith.repeat(padding)
  var skip = false

  var lines = fileContent.split(/\r\n|\r|\n/g);
  var nextLine = lines.length + 1

  if (atLineNumber > nextLine) {
    if (options.sync) {
      throw new Error('Invalid line')
    } else {
      return callback(new Error('Invalid line'))
    }
  }
  
  if (options.prepend || atLineNumber === 1) {
    prepend = true
  } else if (options.append || lines.length + 1 === atLineNumber) {
    append = true
  }

  if (prepend) {
    updatedContent = padString + lineContent + options.eol + fileContent
  } else if (append) {
    updatedContent =  fileContent + padString + lineContent + options.eol
  } else {
    for (var i = 0; i < lines.length; i++) {
      if (atLineNumber === i + 1) {
        newLines.push(padString + lineContent)
        if (options.overwrite) { skip = true }
      }
      if (skip) {
        skip = false
      } else {
        newLines.push(lines[i])
      }
    }
    updatedContent = newLines.join(options.eol)
  }

  if (options.sync) {
    return fs.writeFileSync(filePath, updatedContent)
  } else {
    fs.writeFile(filePath, updatedContent, function(err) {
      return callback(err)
    })
  }
}

module.exports = function(filePath) {
  return new Inserter(filePath)
}
