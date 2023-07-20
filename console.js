const a = require('./console2');

const logs = [];

// Redirect console output to gather logs
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function(...args) {
  originalConsoleLog.apply(console, args);
  logs.push(args);
};

console.error = function(...args) {
  originalConsoleError.apply(console, args);
  logs.push(args);
};


console.log(' log 1');
console.log(' log 2');
console.log(' log 3');

a();

console.warn(' - - - - - - - - - -- - - - - -- -');
console.log(logs);
console.warn(' - - - - - - - - - -- - - - - -- -');

