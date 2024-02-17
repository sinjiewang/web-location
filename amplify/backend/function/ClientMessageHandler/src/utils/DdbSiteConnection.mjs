import DdbActions from './DdbActions.mjs';

const { API_WEBLOCATION_SITECONNECTIONTABLE_NAME, REGION } = process.env;

class DdbOrganizationActions extends DdbActions {
  static TABLE = API_WEBLOCATION_SITECONNECTIONTABLE_NAME;

  queryByConnectionId({ connectionId }) {
    return DdbOrganizationActions.query({
      region: REGION,
      condition: { connectionId },
    }, {
      IndexName: 'siteConnectionsByConnectionId',
    })
  }
};

export default DdbOrganizationActions;