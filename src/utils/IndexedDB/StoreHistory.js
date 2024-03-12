import StoreOperator from "./StoreOperator";

export default class StoreHistory extends StoreOperator {
  constructor({ db, storeName='history' }={}) {
    super({ db, storeName });
  }

  // queryByAction(action) {
  //   const { db, storeName } = this;

  //   return new Promise((resolve, reject) => {
  //     const request = db.transaction(storeName)
  //       .objectStore(storeName)
  //       .index('byAction')
  //       .getAll(action)

  //     request.onsuccess = (event) => resolve(event.target.result);
  //     request.onerror = (event) => reject(event.target.error);
  //   });
  // }

  queryActionOrderByUpdateTime(action='', {
    next=null,
    limit=Infinity,
    order='prev',
  }={}) {
    const { db, storeName } = this;
    const items = [];
    let startFrom = next ? atob(next) : next;

    return new Promise((resolve, reject) => {
      const request = db.transaction(storeName)
        .objectStore(storeName)
        .index('byUpdatedTime')
        .openCursor(null, order);

      request.onsuccess = (event) => {
        const cursor = event.target.result;

        if (cursor) {
          const item = cursor.value;
          const id = item.id

          if (startFrom && startFrom === id) {
            startFrom = null;
          } else if (!startFrom) {
            if (!action || item.action === action) {
              items.push(item);
            }
            if (items.length >= limit) {
              return resolve({ items, next: btoa(id) });
            }
          }

          cursor.continue();
        } else {
          resolve({ items, next: null });
        }
      };
      request.onerror = (event) => reject(event.target.error);
    });
  }
}