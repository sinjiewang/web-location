export default class IndexedDBConfig {
  constructor({ sub }={}) {
    this.version = 3;
    this.sub = sub || 'guest';
    this.db = null;
  }

  get dbName() {
    return this.sub;
  }

  async open() {
    const { dbName, version } = this;
    const db = await new Promise((reslove, reject) => {
      const request = indexedDB.open(dbName, version);

      request.onupgradeneeded = (event) => this.onupgradeneeded(event);
      request.onsuccess = (event) => reslove(event.target.result);
      request.onerror = (event) => reject(event);
    });

    this.db = db;

    return db;
  }

  get storeConfigure() {
    return {
      account: {
        options: { keyPath: 'id' },
      },
      history: {
        options: { keyPath: 'id' },
        indexes: [
          {
            indexName: 'byAction',
            keyPath: 'action',
            options: { unique: false },
          },
          {
            indexName: 'byUpdatedTime',
            keyPath: 'updatedTime',
            options: { unique: false },
          },
        ]
      },
      chat: {
        options: {
          keyPath: 'id',
          autoIncrement: true,
        },
        indexes: [
          {
            indexName: 'byHistoryId',
            keyPath: 'historyId',
            options: { unique: false },
          },
        ],
      },
      post: {
        options: {
          keyPath: 'id',
        },
        indexes: [
          {
            indexName: 'byHistoryId',
            keyPath: 'historyId',
            options: { unique: false },
          },
        ],
      },
      comment: {
        options: {
          keyPath: 'id',
        },
        indexes: [
          {
            indexName: 'byPostId',
            keyPath: 'postId',
            options: { unique: false },
          },
        ],
      }
    }
  }

  onupgradeneeded(event) {
    const db = event.target.result;
    const { storeConfigure } = this;

    Object.keys(storeConfigure).forEach((storeName) => {
      const { options, indexes } = storeConfigure[storeName];
      let store;

      if (!db.objectStoreNames.contains(storeName)) {
        store = db.createObjectStore(storeName, options);
      } else {
        store = event.target.transaction.objectStore(storeName);
      }

      if (indexes && indexes.length) {
        indexes.forEach(({indexName, keyPath, options}) => {
          if (!store.indexNames.contains(indexName)) {
            store.createIndex(indexName, keyPath, options);
          }
        });
      }
    });
  }
}