import StoreOperator from "./StoreOperator";

export default class StoreChat extends StoreOperator {
  constructor({ db, storeName='account' }={}) {
    super({ db, storeName });
  }
}