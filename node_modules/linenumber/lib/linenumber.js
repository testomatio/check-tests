(function() {
  // Decide what environment we're running in
  var isNode = typeof module !== 'undefined' && this.module !== module;

  /* istanbul ignore next */ 
  var fs = isNode ? require('fs') : {};

  var loader;

  var defaults = {
    sync: fs.readFileSync,
    async: fs.readFile,
    args: [{ encoding: 'utf8' }],
    context: fs
  };

  var find = function(contents, query, file) {
    // Create a regex for the query if it's not one already
    var regex = query instanceof RegExp ? query : new RegExp(query, 'g');
    // For performance, make sure the contents actual contain the pattern
    // before we parse them.
    if (!regex.test(contents)) {
      return null;
    } else {
      // regex.test advances the search index, so we need to reset it
      regex.lastIndex = 0;
      var match;
      var matches = [];
      // Iterate over the matches
      while ((match = regex.exec(contents)) !== null) {
        // and construct an object of the matches that includes
        // line and the string that matches, as well as the file
        // name if there is one.
        var matchObj = {
          line: contents.substring(0, match.index).split('\n').length,
          match: match[0]
        };

        if (file) {
          matchObj.file = file;
        }

        matches.push(matchObj);
      }
      return matches;
    }
  };

  var linenumber = function(file, query, cb) {
    var process = function() {
      var matches = find.apply(null, arguments);
      if (cb && cb.length === 1) {
        cb(matches);
      } else if (cb) {
        cb(null, matches);
      } else {
        return matches;
      }
    };

    // If "file" looks like a filename
    if (file.indexOf('\n') === -1 && file.indexOf('.') > -1) {
      // If we have a callback and an async loading mechanism
      if (cb && loader.async) {
        // Invoke the loader with the supplied context and any additional args, but wrap the callback
        loader.async.apply(loader.context, [file].concat(loader.args).concat(function(err, contents) {
          // If the callback expects a single argument, that means "err"
          // is not an error, but the actual file contents
          if (cb.length === 1) {
            cb(find(err, query, file));
          }
          // If the length is greater than 1, do normal node signature stuff
          else if (err) {
            cb(err);
          } else {
            cb(null, find(contents, query, file));
          }
        }));
      } else {
        var contents = loader.sync.apply(loader.context, [file].concat(loader.args));
        return process(contents, query, file);
      }
    } else {
      // "file" is actually the contents to parse
      return process(file, query);
    }
  };

  var _loader = function(fn, args, context) {
    if (fn.constructor.name === 'Array') {
      loader = {
        sync: fn[0],
        async: fn[1],
        args: args,
        context: context
      };
    } else if (fn.constructor.name === 'Object') {
      loader = {
        sync: fn.sync,
        async: fn.async,
        args: args,
        context: context
      };
    }
  };

  linenumber.loader = function(fn) {
    var args = [].slice.call(arguments, 1);
    if (typeof fn === 'function') {
      _loader({ async: fn }, args, this);
    } else {
      _loader(fn, args, this);
    }
  };

  linenumber.loaderSync = function(fn) {
    var args = [].slice.call(arguments, 1);
    if (typeof fn === 'function') {
      _loader({ sync: fn }, args, this);
    } else {
      _loader(fn, args, this);
    }
  };

  linenumber.reset = function() {
    loader = {
      sync: defaults.sync,
      async: defaults.async,
      args: defaults.args,
      context: defaults.context
    };
  };

  // Initialize loader and args
  linenumber.reset();

  /* istanbul ignore else */
  if (isNode) {
    module.exports = linenumber;
  } else {
    window.linenumber = linenumber;
  }

})();
