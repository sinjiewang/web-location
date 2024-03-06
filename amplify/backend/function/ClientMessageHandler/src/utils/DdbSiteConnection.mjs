import DdbActions from './DdbActions.mjs';

const { API_WEBLOCATION_SITECONNECTIONTABLE_NAME, REGION } = process.env;

class DdbOrganizationActions extends DdbActions {
  static TABLE = API_WEBLOCATION_SITECONNECTIONTABLE_NAME;

  queryBySiteId({ siteId }) {
    return DdbOrganizationActions.query({
      region: REGION,
      condition: { siteId },
    }, {
      IndexName: 'siteConnectionsBySiteId',
    });
  }
};

export default DdbOrganizationActions;