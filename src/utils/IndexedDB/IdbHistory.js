import IdbOperator from "./IdbOperator";

export default class IdbHistory extends IdbOperator {
  constructor({ db, storeName='history' }={}) {
    super({ db, storeName });
  }

  queryByAction(action) {
    const { db, storeName } = this;

    return new Promise((resolve, reject) => {
      const request = db.transaction(storeName)
        .objectStore(storeName)
        .index('byAction')
        .getAll(action)

      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event);
    });
  }
}