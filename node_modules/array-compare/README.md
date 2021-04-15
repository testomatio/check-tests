array-compare
=====

Performs a shallow diff on a set of arrays returning found, missing and added pairs. It works by searching the second array for the items of the first comparing by object equality. Optionally, you can provided a third parameter which will be used to identify objects by their id. Array-compare is also UMD compatible.

[![NPM](https://nodei.co/npm/array-compare.png)](https://nodei.co/npm/array-compare/)

[![build status](https://img.shields.io/travis/willhoag/array-compare.svg)](http://travis-ci.org/willhoag/array-compare)
[![npm](https://img.shields.io/npm/v/array-compare.svg)](http://travis-ci.org/willhoag/array-compare)
[![npm](https://img.shields.io/bower/v/array-compare.svg)](http://travis-ci.org/willhoag/array-compare)

EXAMPLE
====

`arrayCompare(arrayA, arrayB, <idName>)`
---

```js
var arrayCompare = require("array-compare")

var arrayA = [
  { sandwich: 'turkey', good: 'no' },
  { sandwich: 'blt', good: 'yes' }
];

var arrayB = [
  { sandwich: 'turkey', good: 'yes' },
  { sandwich: 'pbj', good: 'yes' }
];

// use either syntax
arrayCompare(arrayA, arrayB, 'sandwich');
arrayCompare({ a: arrayA, b: arrayB, id: 'sandwich' });

// returns
// {
//   found: [{
//     a: { sandwich: 'turkey', good: 'no' },
//     b: { sandwich: 'turkey', good: 'yes' },
//   }],
//   missing: [{
//     a: { sandwich: 'blt', good: 'yes' }
//     b: undefined
//   }],
//   added: [{
//     a: undefined
//     b: { sandwich: 'pbj', good: 'yes' }
//   }]
// }
```

NOTES
===
It's not nearly as useful for basic arrays filled with numbers or strings, but will work. Also, it doesn't currently provide any indication of a change in order, though it should be trivial to add as the code already has access to both a and b indexes thanks to [Mout.js](http://moutjs.com) and its [findIndex](http://moutjs.com/docs/latest/array.html#findIndex) function.

LICENSE
=======

MIT
