import DdbActions from './DdbActions.mjs';

const { API_WEBLOCATION_SITECONNECTIONTABLE_NAME, REGION } = process.env;

class DdbSiteConnection extends DdbActions {
  static TABLE = API_WEBLOCATION_SITECONNECTIONTABLE_NAME;

  create({ connectionId, positionId, type=null }) {
    return DdbSiteConnection.create({
      region: REGION,
      data: { connectionId, positionId, type },
    });
  }
};

export default DdbSiteConnection;