describe 'linenumber with literal text', ->
  Given -> @linenumber = if typeof require == 'function' then require '../lib/linenumber' else window.linenumber
  Given -> @text = """
    exports.eat = function(bites, size) {
      var banana = new Banana(size);
      var quantity =  banana.length - bites;
      return 'You have ' + quantity + '/' banana.length + ' of a banana left';
    };

    exports.getColor = function() {
      return 'yellow';
    };
  """

  context 'on a literal string', ->
    context 'and a single match', ->
      When -> @match = @linenumber @text, 'getColor'
      Then -> @match.should.eql [
        line: 7
        match: 'getColor'
      ]

    context 'and no match', ->
      When -> @match = @linenumber @text, 'peel'
      Then -> (@match == null).should.be.true

    context 'and multiple matches', ->
      When -> @match = @linenumber @text, 'exports'
      Then -> @match.should.eql [
        line: 1
        match: 'exports'
      ,
        line: 7
        match: 'exports'
      ]

  context 'on a regex as a string', ->
    When -> @match = @linenumber @text, 'var [^ ]+'
    Then -> @match.should.eql [
      line: 2
      match: 'var banana'
    ,
      line: 3
      match: 'var quantity'
    ]

  context 'on a regex object', ->
    When -> @match = @linenumber @text, /var [^ ]+/g
    Then -> @match.should.eql [
      line: 2
      match: 'var banana'
    ,
      line: 3
      match: 'var quantity'
    ]

  context 'linenumber.loaderSync', ->
    context 'with a function', ->
      Given -> @get = (file) =>
        return """
          #{@text}
          getColor
        """
      Given -> @linenumber.loaderSync @get
      When -> @match = @linenumber "foo/bar/banana.js", 'getColor'
      Then -> @match.should.eql [
        file: "foo/bar/banana.js"
        line: 7
        match: 'getColor'
      ,
        file: "foo/bar/banana.js"
        line: 10
        match: 'getColor'
      ]

    context 'with an array', ->
      Given -> @sync = (file) => @text
      Given -> @async = (file, done) => done null, @text
      Given -> @linenumber.loaderSync [@sync, @async]
      When -> @matchSync = @linenumber "foo/bar/banana.js", 'getColor'
      And (done) -> @linenumber "foo/bar/banana.js", 'getColor', (err, @matchAsync) => done()
      Then -> @matchSync.should.eql [
        file: "foo/bar/banana.js"
        line: 7
        match: 'getColor'
      ]
      And -> @matchAsync.should.eql [
        file: "foo/bar/banana.js"
        line: 7
        match: 'getColor'
      ]
      
    context 'with an object', ->
      Given -> @sync = (file) => @text
      Given -> @async = (file, done) => done null, @text
      Given -> @linenumber.loaderSync { sync: @sync, async: @async }
      When -> @matchSync = @linenumber "foo/bar/banana.js", 'getColor'
      And (done) -> @linenumber "foo/bar/banana.js", 'getColor', (err, @matchAsync) => done()
      Then -> @matchSync.should.eql [
        file: "foo/bar/banana.js"
        line: 7
        match: 'getColor'
      ]
      And -> @matchAsync.should.eql [
        file: "foo/bar/banana.js"
        line: 7
        match: 'getColor'
      ]

    context 'with a different type', ->
      Given -> @called = false
      Given -> @get = (file) =>
        @called = true
        return @text
      Given -> @linenumber.loaderSync @get
      Given -> @linenumber.loaderSync /foobar/
      When -> @match = @linenumber 'foo/bar/banana.js', 'getColor'
      Then -> @called.should.be.true

    context 'with args', ->
      Given -> @args = []
      Given -> @get = (file, @args...) => @text
      Given -> @linenumber.loaderSync @get, 'foo', 'bar'
      Given -> @linenumber.loaderSync /foobar/
      When -> @match = @linenumber 'foo/bar/banana.js', 'getColor'
      Then -> @args.should.eql ['foo', 'bar']

    context 'sets the context', ->
      Given -> @context =
        foo: 'bar'
      Given -> @get = (file, done) ->
        this.foo = 'baz'
        return @text
      Given -> @linenumber.loaderSync.apply @context, [@get]
      When -> context = @linenumber 'foo/bar/banana.js', 'getColor'
      Then -> @context.foo.should.eql 'baz'

  context 'linenumber.loader', ->
    context 'with a function', ->
      Given -> @get = (file, done) =>
        done null, """
          #{@text}
          getColor
        """
      Given -> @linenumber.loader @get
      When (done) -> @linenumber "foo/bar/banana.js", 'getColor', (err, @match) => done()
      Then -> @match.should.eql [
        file: "foo/bar/banana.js"
        line: 7
        match: 'getColor'
      ,
        file: "foo/bar/banana.js"
        line: 10
        match: 'getColor'
      ]

    context 'with an array', ->
      Given -> @sync = (file) => @text
      Given -> @async = (file, done) => done null, @text
      Given -> @linenumber.loader [@sync, @async]
      When -> @matchSync = @linenumber 'foo/bar/banana.js', 'getColor'
      And (done) -> @linenumber 'foo/bar/banana.js', 'getColor', (err, @matchAsync) => done()
      Then -> @matchSync.should.eql [
        file: 'foo/bar/banana.js'
        line: 7
        match: 'getColor'
      ]
      And -> @matchAsync.should.eql [
        file: 'foo/bar/banana.js'
        line: 7
        match: 'getColor'
      ]

    context 'with an object', ->
      Given -> @sync = (file) => @text
      Given -> @async = (file, done) => done null, @text
      Given -> @linenumber.loader { sync: @sync, async: @async }
      When -> @matchSync = @linenumber 'foo/bar/banana.js', 'getColor'
      And (done) -> @linenumber 'foo/bar/banana.js', 'getColor', (err, @matchAsync) => done()
      Then -> @matchSync.should.eql [
        file: 'foo/bar/banana.js'
        line: 7
        match: 'getColor'
      ]
      And -> @matchAsync.should.eql [
        file: 'foo/bar/banana.js'
        line: 7
        match: 'getColor'
      ]

    context 'sets the context', ->
      Given -> @context =
        foo: 'bar'
      Given -> @get = (file, done) ->
        this.foo = 'baz'
        done null, @text
      Given -> @linenumber.loader.apply @context, [@get]
      When (done) -> @linenumber 'foo/bar/banana.js', 'getColor', (err, context) -> done()
      Then -> @context.foo.should.eql 'baz'

  context 'with a callback', ->
    context 'of length greater than 1', ->
      context 'with no error', ->
        Given -> @get = (file, done) =>
          done null, """
            #{@text}
            getColor
          """
        Given -> @linenumber.loader @get
        When (done) -> @linenumber "foo/bar/banana.js", 'getColor', (err, @match) => done()
        Then -> @match.should.eql [
          file: "foo/bar/banana.js"
          line: 7
          match: 'getColor'
        ,
          file: "foo/bar/banana.js"
          line: 10
          match: 'getColor'
        ]

      context 'but no async operations', ->
        When (done) -> @linenumber @text, 'getColor', (err, @match) => done()
        Then -> @match.should.eql [
          line: 7
          match: 'getColor'
        ]

      context 'with an error', ->
        Given -> @get = (file, done) => done 'err', null
        Given -> @linenumber.loader @get
        When (done) -> @linenumber "foo/bar/banana.js", 'getColor', (@err, @match) => done()
        Then -> (@match == undefined).should.be.true
        And -> @err.should.eql 'err'

    context 'of length 1', ->
      context 'with no error', ->
        Given -> @get = (file, done) => done @text
        Given -> @linenumber.loader @get
        When (done) -> @linenumber "foo/bar/banana.js", 'getColor', (@match) => done()
        Then -> @match.should.eql [
          file: "foo/bar/banana.js"
          line: 7
          match: 'getColor'
        ]

      context 'but no async operations', ->
        When (done) -> @linenumber @text, 'getColor', (@match) => done()
        Then -> @match.should.eql [
          line: 7
          match: 'getColor'
        ]
