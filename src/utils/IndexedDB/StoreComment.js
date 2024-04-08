import StoreOperator from "./StoreOperator";

export default class StoreComment extends StoreOperator {
  constructor({ db, storeName='comment' }={}) {
    super({ db, storeName });
  }

  // queryByHistoryId(id) {
  //   const { db, storeName } = this;

  //   return new Promise((resolve, reject) => {
  //     const request = db.transaction(storeName)
  //       .objectStore(storeName)
  //       .index('byHistoryId')
  //       .getAll(id)

  //     request.onsuccess = (event) => resolve(event.target.result);
  //     request.onerror = (event) => reject(event.target.error);
  //   });
  // }

  queryByPostId(id) {
    const { db, storeName } = this;
    return new Promise((resolve, reject) => {
      const request = db.transaction(storeName)
        .objectStore(storeName)
        .index('byPostId')
        .getAll(id)
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }
}