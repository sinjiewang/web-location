import DdbActions from './DdbActions.mjs';

const { API_WEBLOCATION_CLIENTCONNECTIONTABLE_NAME, REGION } = process.env;

class DdbClientConnection extends DdbActions {
  static TABLE = API_WEBLOCATION_CLIENTCONNECTIONTABLE_NAME;

  queryByConnectionId({ connectionId }) {
    return DdbClientConnection.query({
      region: REGION,
      condition: { connectionId },
    }, {
      IndexName: 'clientConnectionsByConnectionId',
    });
  }

  delete({ id }) {
    return DdbClientConnection.delete({
      region: REGION,
      condition: { id },
    })
  }
};

export default DdbClientConnection;