import StoreOperator from "./StoreOperator";

export default class StoreFile extends StoreOperator {
  constructor({ db, storeName='file' }={}) {
    super({ db, storeName });
  }
}