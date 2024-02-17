import DdbActions from './DdbActions.mjs';

const { API_WEBLOCATION_POSITIONTABLE_NAME, REGION } = process.env;

class DdbPosition extends DdbActions {
  static TABLE = API_WEBLOCATION_POSITIONTABLE_NAME;

  query({ positionId }) {
    return DdbPosition.query({
      region: REGION,
      condition: { positionId },
    });
  }

  delete({ positionId }) {
    return DdbPosition.delete({
      region: REGION,
      condition: { positionId },
    })
  }
};

export default DdbPosition;