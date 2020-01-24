describe 'linenumber with a file', ->
  Given -> @linenumber = require '../lib/linenumber'
  When -> @match = @linenumber "#{__dirname}/fixtures/banana.js", 'getColor'
  Then -> @match.should.eql [
    file: "#{__dirname}/fixtures/banana.js"
    line: 7
    match: 'getColor'
  ]
