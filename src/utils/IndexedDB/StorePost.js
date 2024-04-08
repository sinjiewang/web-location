import StoreOperator from "./StoreOperator";

export default class StorePost extends StoreOperator {
  constructor({ db, storeName='post' }={}) {
    super({ db, storeName });
  }

  queryByHistoryId(id) {
    const { db, storeName } = this;

    return new Promise((resolve, reject) => {
      const request = db.transaction(storeName)
        .objectStore(storeName)
        .index('byHistoryId')
        .getAll(id)

      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }
}