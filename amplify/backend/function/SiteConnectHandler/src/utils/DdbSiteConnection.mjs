import DdbActions from './DdbActions.mjs';

const { API_WEBLOCATION_SITECONNECTIONTABLE_NAME, REGION } = process.env;

class DdbSiteConnection extends DdbActions {
  static TABLE = API_WEBLOCATION_SITECONNECTIONTABLE_NAME;

  create({ connectionId, positionId, siteId, type=null, passwordRequired=false }) {
    return DdbSiteConnection.create({
      region: REGION,
      data: { connectionId, positionId, siteId, type, passwordRequired },
    });
  }

  queryBySiteId({ siteId }) {
    return DdbSiteConnection.query({
      region: REGION,
      condition: { siteId },
    }, {
      IndexName: 'siteConnectionsBySiteId',
    });
  }
};

export default DdbSiteConnection;