import DdbActions from './DdbActions.mjs';

const { API_WEBLOCATION_POSITIONTABLE_NAME, REGION } = process.env;

class DdbSiteConnection extends DdbActions {
  static TABLE = API_WEBLOCATION_POSITIONTABLE_NAME;

  create({ positionId, lat, lng }) {
    return DdbSiteConnection.create({
      region: REGION,
      data: { positionId, lat, lng },
    });
  }
};

export default DdbSiteConnection;