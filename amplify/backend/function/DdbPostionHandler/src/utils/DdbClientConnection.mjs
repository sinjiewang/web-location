import DdbActions from './DdbActions.mjs';
import { toFixedTwo, getZone } from './positionHelper.mjs'

const { API_WEBLOCATION_CLIENTCONNECTIONTABLE_NAME, REGION } = process.env;

class DdbClientConnection extends DdbActions {
  static TABLE = API_WEBLOCATION_CLIENTCONNECTIONTABLE_NAME;

  queryClientInZone({ lat, lng }, range=0.01) {
    const latToFixedTwo = toFixedTwo(lat);
    const lngToFixedTwo = toFixedTwo(lng);
    const zoneList = [latToFixedTwo - range, latToFixedTwo, latToFixedTwo + range].map(($lat) =>
      [lngToFixedTwo - range, lngToFixedTwo, lngToFixedTwo + range].map(($lng) => getZone({
        lat: toFixedTwo($lat),
        lng: toFixedTwo($lng),
      }))
    ).flat();

    return Promise.all(zoneList.map((zone) => this.queryByZone(zone)))
      .then((res) => {
        const items = res.map(({ Items }) => Items).reduce((acc, curr) => acc.concat(curr));

        return {
          Items: items,
          Count: items.length,
          ScannedCount: items.length,
        };
      });
  }

  async queryByZone(zone) {
    let results = [];
    let lastEvaluatedKey = null;

    do {
      const response = await DdbClientConnection.query({
        region: REGION,
        condition: { zone },
      }, {
        IndexName: 'clientConnectionsByZone',
        ExclusiveStartKey: lastEvaluatedKey,
      })

      results = results.concat(response.Items || []);
      lastEvaluatedKey = response.LastEvaluatedKey;
    }
    while (lastEvaluatedKey);

    return {
      Items: results,
      Count: results.length,
      ScannedCount: results.length,
    };
  }

  delete({ id }) {
    return DdbClientConnection.delete({
      region: REGION,
      condition: { id },
    })
  }
};

export default DdbClientConnection;