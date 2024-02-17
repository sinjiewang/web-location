import DdbActions from './DdbActions.mjs';

const { API_WEBLOCATION_CLIENTCONNECTIONTABLE_NAME, REGION } = process.env;

class DdbClientConnection extends DdbActions {
  static TABLE = API_WEBLOCATION_CLIENTCONNECTIONTABLE_NAME;

  create(data) {
    return DdbClientConnection.create({
      region: REGION,
      data,
    });
  }
};

export default DdbClientConnection;