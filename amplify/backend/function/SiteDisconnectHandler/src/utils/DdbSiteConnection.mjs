import DdbActions from './DdbActions.mjs';

const { API_WEBLOCATION_SITECONNECTIONTABLE_NAME, REGION } = process.env;

class DdbSiteConnection extends DdbActions {
  static TABLE = API_WEBLOCATION_SITECONNECTIONTABLE_NAME;

  queryByConnectionId({ connectionId }) {
    return DdbSiteConnection.query({
      region: REGION,
      condition: { connectionId },
    }, {
      IndexName: 'siteConnectionsByConnectionId',
    });
  }

  queryByPositionId({ positionId }) {
    return DdbSiteConnection.query({
      region: REGION,
      condition: { positionId },
    }, {
      IndexName: 'siteConnectionsByPositionId',
    });
  }

  delete({ id }) {
    return DdbSiteConnection.delete({
      region: REGION,
      condition: { id },
    })
  }
};

export default DdbSiteConnection;