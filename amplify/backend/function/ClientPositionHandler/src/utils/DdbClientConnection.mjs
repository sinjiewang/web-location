import DdbActions from './DdbActions.mjs';

const { API_WEBLOCATION_CLIENTCONNECTIONTABLE_NAME, REGION } = process.env;

class DdbClientConnection extends DdbActions {
  static TABLE = API_WEBLOCATION_CLIENTCONNECTIONTABLE_NAME;

  query({ connectionId }) {
    return DdbClientConnection.query({
      region: REGION,
      condition: { connectionId },
    }, {
      IndexName: 'clientConnectionsByConnectionId',
    });
  }

  update({ id, data }) {
    return DdbClientConnection.update({
      region: REGION,
      condition: { id },
      data,
    });
  }
};

export default DdbClientConnection;