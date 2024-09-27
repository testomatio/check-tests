const debug = require('debug')('check-tests:newman');

// ast and file will be ignored
// if you need to expand the adapter with options, use opts = {}
// eslint-disable-next-line no-unused-vars
module.exports = (ast = '', file = '', source = '') => {
  const collection = JSON.parse(source);
  debug('Collection:\n', collection);

  // item could be request or folder
  const items = collection.item;

  // "request" entity in postman/newman collection == "test" entity in testomatio
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

        if (item.event && item.event.length) {
          for (const event of item.event) {
            // script could be empty
            if (!event.script?.exec?.length || !event.script?.exec[0]) continue;

            const scriptType = event.listen;
            code += `> ${scriptType}\n`;
            code += event.script?.exec.join('\n');
            code += '\n';
          }
        }

        requests.push({
          code,
          file,
          name: item.name,
          suites,
        });
        // item is request, stop iterating deeper;
        continue;
      }

      // if item including other items - it is folder;
      // if item.length=0 - folder does contain nothing (is empty)
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

  return tests;
};
