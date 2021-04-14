# insert-line

Node module for inserting lines to an existing file.

## Usage

### Instantiation

```js
const insertLine = require('insert-line')
```

### API

`insertLine` accepts a file path, after which you can call the chained methods: `content()` to specify the content and
`at()` to specify the line number. Finally, you must call `then()` and pass your callback function.

If you need to prepend a line to a file, you can use the shortcut method `prepend()`, instead of calling `content()` and `at()`.
If you need to append a line to a file, you can use the shortcut method `append()`, instead of calling `content()` and `at()`.

`content()`, `prepend()`, and `append()` can be configured to specify the tab character, tab count, EOL character, and the
option to overwrite the existing line.

`contentSync()`, `prependSync()`, and `appendSync()` and the synchronous version of `content()`, `prepend()`, and `append()` respectively.

**`insertLine(<filePath>)`**

`filePath`: path to the file to insert the line.

**`.content([lineContent], [options])`**

`lineContent`: the content to be inserted at the line. If not specified, it defaults to an empty string.
`options`: the options object supports the following options.

  - `prepend`: whether to prepend or not, defaults to `false`
  - `append`: whether to append or not, defaults to `false`
  - `padding`: padding amount, defaults to `0`
  - `padWith`: character to be used for padding, defaults to ' ',
  - `eol`: end of line character, defaults to `os.EOL`
  - `overwrite`: whether to overwrite the existing line, defaults to `false`

**`.contentSync([lineContent], [options])`**

Synchronous version of `content()`. `then()` is not required, insertion starts on calling `at()`.

**`.at(<lineNumer>)`**

`lineNumer`: line number, where to insert the content. By default, the existing line will be pushed below. To overwrite the
current line, specify `overwrite: true`, in the `options` object passed to `content()`, `prepend()`, or `append()`.

If insert mode is sync (`options.sync` is set to `true`), `then()` is not called, instead the insertion operation starts at `at()`.

**`.prepend([lineContent], [options])`**

Shortcut for adding a new line at the beginning of a file, with a combination of `at()` and `content()`.
Refer to the documentation of `.content()` for details about `lineContent` and `options`.

**`.prependSync([lineContent], [options])`**

Synchronous version of `prepend()`. `then()` is not required, insertion starts on calling `at()`.

**`.append([lineContent], [options])`**

Shortcut for adding a new line at the end of a file, with a combination of `at()` and `content()`.
Refer to the documentation of `.content()` for details about `lineContent` and `options`.

**`.appendSync([lineContent], [options])`**

Synchronous version of `append()`. `then()` is not required, insertion starts on calling `at()`.

**`.then(<callback>)`**

This method is only required while calling the async methods `content()`, `prepend()`, and `append()`.

`callback`: callback function which will be executed after the line has been successfully inserted, or an error was encountered.

## Examples

Appending a line asynchronously:

```js
insertLine('./myfile.txt').append('Rocks').then(function(err) {
  var content = fs.readFileSync(destListPath, 'utf8')
  console.log(content)
})
```

Appending a line synchronously:

```js
insertLine('./myfile.txt').appendSync('Rocks')
var content = fs.readFileSync(destListPath, 'utf8')
console.log(content)
```

Inserting a line at line number 3 asynchronously:

```js
insertLine('./myfile.txt').content('This is a test').at(3).then(function(err) {
  var content = fs.readFileSync(destListPath, 'utf8')
  console.log(content)
})
```

Inserting a line at line number 3 synchronously:

```js
insertLine('./myfile.txt').content('This is a test').atSync(3)
var content = fs.readFileSync(destListPath, 'utf8')
console.log(content)
```

For more examples, refer to [/test/test.js](/test/test.js).

## LICENSE

[MIT](LICENSE)