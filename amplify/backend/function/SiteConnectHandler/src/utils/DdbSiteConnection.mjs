import DdbActions from './DdbActions.mjs';

const { API_WEBLOCATION_SITECONNECTIONTABLE_NAME, REGION } = process.env;

class DdbSiteConnection extends DdbActions {
  static TABLE = API_WEBLOCATION_SITECONNECTIONTABLE_NAME;

  create({ connectionId, positionId, lat, lng }) {
    return DdbSiteConnection.create({
      region: REGION,
      data: { connectionId, positionId, lat, lng },
    });
  }
};

export default DdbSiteConnection;