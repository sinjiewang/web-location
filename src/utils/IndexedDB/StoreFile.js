import short from 'short-uuid';
import StoreOperator from "./StoreOperator";
import genThumbnail from '../genThumbnail.js';

export default class StoreFile extends StoreOperator {
  constructor({ db, storeName='file' }={}) {
    super({ db, storeName });
  }

  create(data) {
    const id = short.generate();
    const item = {
      id,
      ...data,
    };

    return super.create(item);
  }

  async createImage(data) {
    const { src, thumbnailSrc, image } = await genThumbnail(data.src);
    const { width, height } = image;
    const item = {
      ...data,
      src,
      thumbnailSrc,
      info: {
        width,
        height,
      },
    };

    return this.create(item);
  }

  listByUpdateTime({
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
            items.push(item);

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