import IdbOperator from "./IdbOperator";

export default class IdbChat extends IdbOperator {
  constructor({ db, storeName='chat' }={}) {
    super({ db, storeName });
  }

  queryByHistoryId(id) {
    const { storeName } = this;

    return new Promise((resolve, reject) => {
      const request = db.transaction(storeName)
        .objectStore(storeName)
        .index('byHistoryId')
        .getAll(id)

      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event);
    });
  }
}