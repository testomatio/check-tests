const traverse = require('babel-traverse');
const CommentError = require('../../errors/comment.error');
const {
  getStringValue,
  getUpdatePoint,
  hasStringOrTemplateArgument,
  getLineNumber,
  getEndLineNumber,
  getCode,
} = require('../utils');

module.exports = (ast, file = '', source = '') => {
  const tests = [];
  let currentSuite = [];

  function addSuite(path) {
    currentSuite = currentSuite.filter(s => s.loc.end.line > path.loc.start.line);
    currentSuite.push(path);
  }

  traverse.default(ast, {
    enter(path) {
      if (path.isIdentifier({ name: 'describe' })) {
        if (!path.parentPath && !path.parentPath.container) return;
        if (!hasStringOrTemplateArgument(path.parentPath.container)) return;
        addSuite(path.parentPath.container);
      }

      // forbid only
      if (path.isIdentifier({ name: 'only' })) {
        const name = path.parent.object.name || path.parent.object.callee.object.name;
        if (['describe', 'it', 'context', 'test'].includes(name)) {
          const line = getLineNumber(path);
          throw new CommentError(
            'Exclusive tests detected. `.only` call found in '
              + `${file}:${line}\n`
              + 'Remove `.only` to restore test checks',
          );
        }
      }

      if (path.isIdentifier({ name: 'skip' })) {
        if (!path.parent || !path.parent.object) {
          return;
        }

        const name = path.parent.object.name || path.parent.object.property.name || path.parent.object.callee.object.name;

        if (name === 'test' || name === 'it') {
          // test or it
          if (!hasStringOrTemplateArgument(path.parentPath.container)) return;

          const testName = getStringValue(path.parentPath.container);
          tests.push({
            name: testName,
            suites: currentSuite
              .filter(s => getEndLineNumber({ container: s }) >= getLineNumber(path))
              .map(s => getStringValue(s)),
            line: getLineNumber(path),
            code: getCode(source, getLineNumber(path), getEndLineNumber(path)),
            file,
            skipped: true,
          });
        }

        if (name === 'describe') {
          // suite
          if (!hasStringOrTemplateArgument(path.parentPath.container)) return;
          const suite = path.parentPath.container;
          suite.skipped = true;
          addSuite(suite);
        }

        // todo: handle "context"
      }

      if (path.isIdentifier({ name: 'fixme' })) {
        if (!path.parent || !path.parent.object) {
          return;
        }

        const name = path.parent.object.name || path.parent.object.property.name || path.parent.object.callee.object.name;

        if (name === 'test' || name === 'it') {
          // test or it
          if (!hasStringOrTemplateArgument(path.parentPath.container)) return;

          const testName = getStringValue(path.parentPath.container);
          tests.push({
            name: testName,
            suites: currentSuite
              .filter(s => getEndLineNumber({ container: s }) >= getLineNumber(path))
              .map(s => getStringValue(s)),
            line: getLineNumber(path),
            code: getCode(source, getLineNumber(path), getEndLineNumber(path)),
            file,
            skipped: true,
          });
        }

        if (name === 'describe') {
          // suite
          if (!hasStringOrTemplateArgument(path.parentPath.container)) return;
          const suite = path.parentPath.container;
          suite.skipped = true;
          addSuite(suite);
        }

        // todo: handle "context"
      }

      if (path.isIdentifier({ name: 'todo' })) {
        // todo tests => skipped tests
        if (path.parent.object.name === 'test') {
          // test
          if (!hasStringOrTemplateArgument(path.parentPath.container)) return;

          const testName = getStringValue(path.parentPath.container);
          tests.push({
            name: testName,
            suites: currentSuite
              .filter(s => getEndLineNumber({ container: s }) >= getLineNumber(path))
              .map(s => getStringValue(s)),
            line: getLineNumber(path),
            code: getCode(source, getLineNumber(path), getEndLineNumber(path)),
            file,
            skipped: true,
          });
        }
      }

      if (path.isIdentifier({ name: 'test' }) || path.isIdentifier({ name: 'it' })) {
        if (!hasStringOrTemplateArgument(path.parent)) return;

        const testName = getStringValue(path.parent);

        tests.push({
          name: testName,
          suites: currentSuite
            .filter(s => getEndLineNumber({ container: s }) >= getLineNumber(path))
            .map(s => getStringValue(s)),
          updatePoint: getUpdatePoint(path.parent),
          line: getLineNumber(path),
          code: getCode(source, getLineNumber(path), getEndLineNumber(path)),
          file,
          skipped: !!currentSuite.filter(s => s.skipped).length,
        });
      }

      if (path.isIdentifier({ name: 'each' })) {
        const currentPath = path.parentPath.parentPath;

        if (!hasStringOrTemplateArgument(currentPath.parent)) return;
        const testName = getStringValue(currentPath.parent);
        tests.push({
          name: testName,
          suites: currentSuite
            .filter(s => getEndLineNumber({ container: s }) >= getLineNumber(path))
            .map(s => getStringValue(s)),
          updatePoint: getUpdatePoint(path.parent),
          line: getLineNumber(currentPath),
          code: getCode(source, getLineNumber(currentPath), getEndLineNumber(currentPath)),
          file,
          skipped: !!currentSuite.filter(s => s.skipped).length,
        });
      }
    },
  });

  return tests;
};
