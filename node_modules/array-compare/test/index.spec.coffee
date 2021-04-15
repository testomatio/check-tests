'use strict'

arrayCompare = require('../index.js')

describe 'array-compare', ->

  sandwiches = [
    { sandwich: 'turkey', good: 'yes' },
    { sandwich: 'pbj', good: 'yes' },
    { sandwich: 'turkey', good: 'no' },
    { sandwich: 'blt', good: 'yes' }
  ]

  data1 = null
  data2 = null
  c = null

  describe 'with id param', ->

    beforeEach ->
      data1 = [ sandwiches[0], sandwiches[1] ]
      data2 = [ sandwiches[2], sandwiches[3] ]
      c = arrayCompare(data1, data2, 'sandwich')

    it 'should return items in an array of paired objects found', ->
      expect( c.found[0].a ).to.equal( sandwiches[0] )
      expect( c.found[0].b ).to.equal( sandwiches[2] )

    it 'should return the items in an array of objects missing', ->
      expect( c.missing[0].a ).to.equal( sandwiches[1] )
      expect( c.missing[0].b ).to.be.undefined

    it 'should return items in an array of paird objects added', ->
      expect(c.added[0].a).to.be.undefined
      expect(c.added[0].b).to.equal(sandwiches[3])

  describe 'without id param', ->

    beforeEach ->
      data1 = [ sandwiches[0], sandwiches[1] ]
      data2 = [ sandwiches[0], sandwiches[2] ]
      c = arrayCompare(data1, data2)

    it 'should return items in an array of paired objects found', ->
      expect(c.found[0].a).to.equal(sandwiches[0])
      expect(c.found[0].b).to.equal(sandwiches[0])

    it 'should return the items in an array of objects missing', ->
      expect(c.missing[0].a).to.equal(sandwiches[1])
      expect(c.missing[0].b).to.be.undefined

    it 'should return items in an array of paird objects added', ->
      expect(c.added[0].a).to.be.undefined
      expect(c.added[0].b).to.equal(sandwiches[2])

  describe 'with same sandwiches and defferent references', ->

    beforeEach ->
      data1 = [
        { sandwich: 'turkey', good: 'no'  },
        { sandwich: 'blt', good: 'yes'  }
      ]
      data2 = [
        { sandwich: 'turkey', good: 'yes'  },
        { sandwich: 'blt', good: 'yes'  }
      ]

    it 'should have no found without key', ->
      c = arrayCompare(data1, data2)
      expect(c.found).to.deep.equal([])
      expect(c.missing).to.deep.equal([
        { a: data1[0] },
        { a: data1[1] }
      ])
      expect(c.added).to.deep.equal([
        { b: data2[0] },
        { b: data2[1] }
      ])

    it 'should have all found with key', ->
      c = arrayCompare(data1, data2, 'sandwiches')
      expect(c.found).to.deep.equal([
        {a: data1[0], b: data2[0] },
        {a: data1[1], b: data2[1] }
      ])
      expect(c.missing).to.deep.equal([])
      expect(c.added).to.deep.equal([])
