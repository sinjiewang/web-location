import DdbActions from './DdbActions.mjs';

const { API_WEBLOCATION_SITECONNECTIONTABLE_NAME, REGION } = process.env;

class DdbSiteConnection extends DdbActions {
  static TABLE = API_WEBLOCATION_SITECONNECTIONTABLE_NAME;

  query({ connectionId }) {
    return DdbSiteConnection.query({
      region: REGION,
      condition: { connectionId },
    }, {
      IndexName: 'siteConnectionsByConnectionId',
    });
  }

  update({ id, data }) {
    return DdbSiteConnection.update({
      region: REGION,
      condition: { id },
      data,
    });
  }
};

export default DdbSiteConnection;