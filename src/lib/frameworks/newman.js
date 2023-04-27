const debug = require('debug')('check-tests:newman');

// ast and file will be ignored
module.exports = (ast = '', file = '', source = '') => {
  const collection = JSON.parse(source);
  debug('Collection:\n', collection);

  // item could be request or folder
  const items = collection.item;

  const requests = [];
  /**
   *
   * @param {*} items collection items (could be folder or request)
   * @param {*} suites represents path to request through the folders
   * @returns
   */
  function getRequestsFromCollectionItems(items, suites = []) {
    for (const item of items) {
      if (item.request) {
        // get request scripts code
        let code = '';
        for (const event of item.event) {
          // script could be empty
          if (!event.script?.exec?.length || !event.script?.exec[0]) continue;

          const scriptType = event.listen;
          code += `> ${scriptType}\n`;
          code += event.script?.exec.join('\n');
          code += '\n';
        }

        requests.push({ code, name: item.name, suites });
        // item is request, stop iterating deeper; (iteration continues only if item is folder)
        continue;
      }

      // if item including other items > it is folder;
      // if item.length = 0, then folder does contain nothing (is empty)
      if (item.item?.length) {
        suites.push(item.name);
        getRequestsFromCollectionItems(item.item, suites);
      }

      // reset suites on each main item (child of root/collection)
      suites = [];
      // add collection name as main suite
      if (collection.info?.name) suites.push(collection.info.name);
    }
    return requests;
  }

  const tests = getRequestsFromCollectionItems(items, collection.info?.name ? [collection.info.name] : []);
  debug('Tests:\n', tests);

  // traverse.default(ast, {
  //   enter(path) {
  //     if (path.isIdentifier({ name: 'describe' })) {
  //       if (!hasStringOrTemplateArgument(path.parent)) return;
  //       addSuite(path.parent);
  //     }

  //     // forbid only
  //     if (path.isIdentifier({ name: 'only' })) {
  //       // console.log(path.parent.object);
  //       if (!path.parent) return;
  //       if (!path.parent.object) return;

  //       const name = path.parent.object.name || (path.parent.object.callee && path.parent.object.callee.object.name);
  //       if (['describe', 'it', 'context', 'test'].includes(name)) {
  //         const line = getLineNumber(path);
  //         throw new CommentError(
  //           'Exclusive tests detected. `.only` call found in ' +
  //             `${file}:${line}\n` +
  //             'Remove `.only` to restore test checks',
  //         );
  //       }
  //     }

  //     if (path.isIdentifier({ name: 'skip' })) {
  //       if (!path.parent || !path.parent.object) {
  //         return;
  //       }

  //       const name = path.parent.object.name || path.parent.object.callee.object.name;

  //       if (name === 'test' || name === 'it') {
  //         // test or it
  //         if (!hasStringOrTemplateArgument(path.parentPath.container)) return;

  //         const testName = getStringValue(path.parentPath.container);
  //         tests.push({
  //           name: testName,
  //           suites: currentSuite.map(s => getStringValue(s)),
  //           line: getLineNumber(path),
  //           code: getCode(source, getLineNumber(path), getEndLineNumber(path)),
  //           file,
  //           skipped: true,
  //         });
  //       }

  //       if (name === 'describe') {
  //         // suite
  //         if (!hasStringOrTemplateArgument(path.parentPath.container)) return;
  //         const suite = path.parentPath.container;
  //         suite.skipped = true;
  //         addSuite(suite);
  //       }

  //       // todo: handle "context"
  //     }

  //     if (path.isIdentifier({ name: 'todo' })) {
  //       // todo tests => skipped tests
  //       if (path.parent.object.name === 'test') {
  //         // test
  //         if (!hasStringOrTemplateArgument(path.parentPath.container)) return;

  //         const testName = getStringValue(path.parentPath.container);
  //         tests.push({
  //           name: testName,
  //           suites: currentSuite.map(s => getStringValue(s)),
  //           line: getLineNumber(path),
  //           code: getCode(source, getLineNumber(path), getEndLineNumber(path)),
  //           file,
  //           skipped: true,
  //         });
  //       }
  //     }

  //     if (path.isIdentifier({ name: 'test' }) || path.isIdentifier({ name: 'it' })) {
  //       if (!hasStringOrTemplateArgument(path.parent)) return;

  //       const testName = getStringValue(path.parent);
  //       tests.push({
  //         name: testName,
  //         suites: currentSuite.map(s => getStringValue(s)),
  //         updatePoint: getUpdatePoint(path.parent),
  //         line: getLineNumber(path),
  //         code: getCode(source, getLineNumber(path), getEndLineNumber(path)),
  //         file,
  //         skipped: !!currentSuite.filter(s => s.skipped).length,
  //       });
  //     }

  //     if (path.isIdentifier({ name: 'each' })) {
  //       const currentPath = path.parentPath.parentPath;

  //       if (!hasStringOrTemplateArgument(currentPath.parent)) return;
  //       const testName = getStringValue(currentPath.parent);
  //       tests.push({
  //         name: testName,
  //         suites: currentSuite.map(s => getStringValue(s)),
  //         updatePoint: getUpdatePoint(path.parent),
  //         line: getLineNumber(currentPath),
  //         code: getCode(source, getLineNumber(currentPath), getEndLineNumber(currentPath)),
  //         file,
  //         skipped: !!currentSuite.filter(s => s.skipped).length,
  //       });
  //     }
  //   },
  // });

  return tests;
};
