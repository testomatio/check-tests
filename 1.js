const path = require('path');
const upath = require('upath');

const path1 = 'foo/bar/baz';
const path2 = 'foo\\bar\\baz';

console.log(upath.toUnix(path1));
console.log(upath.toUnix(path2));
