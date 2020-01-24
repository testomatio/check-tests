[![Build Status](https://travis-ci.org/tandrewnichols/linenumber.png)](https://travis-ci.org/tandrewnichols/linenumber) [![downloads](http://img.shields.io/npm/dm/linenumber.svg)](https://npmjs.org/package/linenumber) [![npm](http://img.shields.io/npm/v/linenumber.svg)](https://npmjs.org/package/linenumber) [![Code Climate](https://codeclimate.com/github/tandrewnichols/linenumber/badges/gpa.svg)](https://codeclimate.com/github/tandrewnichols/linenumber) [![Test Coverage](https://codeclimate.com/github/tandrewnichols/linenumber/badges/coverage.svg)](https://codeclimate.com/github/tandrewnichols/linenumber) [![dependencies](https://david-dm.org/tandrewnichols/linenumber.png)](https://david-dm.org/tandrewnichols/linenumber) ![Size](https://img.shields.io/badge/size-1.25kb-brightgreen.svg)

# linenumber

Get the line number of one or more matches in a file

## Installation

`npm install --save linenumber`

## Summary

Pass in the contents of a file or a filename, along with a pattern and an optional callback, and get back an array that includes the line numbers of any matches in that file.

## Usage

Pass the content to search (which can also be a filename) and the string or regular expression pattern to search for to linenumber, along with an optional callback.

For example, given _lib/foo.json_,

```js
{
  "foo": 1,
  "bar": true,
  "baz": "a string"
}
```

any of the following will work:

```js
/**
 * SYNC
 */
var linenumber = require('linenumber');

// With string content and query
linenumber('Foo\nbar\nbaz', 'bar'); // [{ line: 2, match: 'bar' }]

// With a filename
linenumber('lib/foo.json', 'bar'); // [{ line: 3, match: 'bar', file: 'lib/foo.json' }]

// With a regular expression
linenumber('lib/foo.json', /ba./g); // [{ line: 3, match: 'bar', file: 'lib/foo.json' }, { line: 4, match: 'baz', file: 'lib/foo.json' }]

// Without a match
linenumber('lib/foo.json', 'hello'); // null

/**
 * ASYNC
 */
// The other versions above will also work asynchronously if a callback is passed
linenumber('lib/foo.json', 'bar', function(err, results) { /*...*/ }); // results = [{ line: 3, match: 'bar', file: 'lib/foo.json' }]
```

By default, `linenumber` will use `fs.readFile` and `fs.readFileSync` to read in the contents of a file, but you can set it up to use a different file loader if desired. For instance, since our examples above use a `.json` file, we can make `linenumber` use `require` as the loader instead.

```js
linenumber.loaderSync(require);
linenumber('lib/foo.json', 'bar');
```

 If you are using `linenumber` on the client-side, these defaults obviously will not work, so you will have to load your own. There are too many client side libraries and frameworks to try to establish a reasonable default.

A note on async usage: `linenumber` looks at your callback length to try to determine whether to return `null, results` or just `results`. `fs` and many other node-based modules use the standard error-then-everything-else signature, but on the client-side that may not be the case. `linenumber` assumes that if a callback accepts only one parameter, it's the content, _not_ an error (which makes sense).

## Custom Loaders

As above, you can provide custom loaders for reading the contents of a "file" (which could really mean anything). There are several ways to do this.

### Sync loader only

Call `linenumber.loaderSync` and pass the function.

```js
linenumber.loaderSync(require);
```

### Async loader only

Call `linenumber.loader` and pass the function.

```js
// Contrived example
linenumber.loader(function(file, done) {
  fs.readFile(file, { encoding: 'utf8' }, function(err, contents) {
    done(null, contents.replace('hello', 'goodbye'));
  });
});
```

### Provide both sync and async loaders

You can call _either_ `loader` or `loaderSync` with an array or object to replace both the sync and async loaders.

```js
linenumber.loader([sync, async]);
// or
linenumber.loader({ sync: sync, async: async });
```

### Args

You can also provide arguments to be passed to loader functions.

```js
// someSyncFunction will be invoked with the filename, 'foo', and 'bar'
linenumber.loaderSync(someSyncFunction, 'foo', 'bar');
```

### Context

You can even set the context of the `this` object for the loader function:

```
linenumber.loader.apply(this, asyncFunc);
```

In this case, `linenumber` will store the `this` context and apply it whenever the loader is called.

### Reset the loaders

If for some reason, you need to restore the original loaders, just call `linenumber.reset()`.

## Browser

Use whatever serving mechanism you prefer and serve `dist/linenumber.js` or `dist/linenumber.min.js`, then access it globally with `linenumber`.

```html
<script src="/dist/linenumber.js"></script>
<script>
  var matches = linenumber('Foo\nbar\nbaz', 'bar');
</script>
```

## Contributing

Please see [the contribution guidelines](CONTRIBUTING.md).
