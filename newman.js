const collection = require('./collection.json');
console.log(collection);
// const collectionName = source.info.name;

// item could be request or folder
const items = collection.item;

// let currentPath = [];
const requests = [];
function getRequestsFromCollectionItems(items, path = []) {
  for (const item of items) {
    // item is request, stop iterating deeper
    if (item.request) {
      const finalPath = path.map(value => value.replace('/', '|')).join('/');
      requests.push({ name: item.name, path: finalPath });
      continue;
    }

    // item including other items > it is folder; if item.length = 0 > folder does contain nothing
    if (item.item?.length) {
      path.push(item.name);
      getRequestsFromCollectionItems(item.item, path);
    }

    // reset path on each main item (child of root/collection)
    path = [];
  }
  return requests;
}

const result = getRequestsFromCollectionItems(items);
console.log(result);
