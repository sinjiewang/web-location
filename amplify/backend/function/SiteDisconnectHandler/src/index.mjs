/* Amplify Params - DO NOT EDIT
	API_WEBLOCATION_GRAPHQLAPIIDOUTPUT
	API_WEBLOCATION_POSITIONTABLE_ARN
	API_WEBLOCATION_POSITIONTABLE_NAME
	API_WEBLOCATION_SITECONNECTIONTABLE_ARN
	API_WEBLOCATION_SITECONNECTIONTABLE_NAME
	ENV
	REGION
Amplify Params - DO NOT EDIT */

import DdbSiteConnection from './utils/DdbSiteConnection.mjs';
import DdbPosition from './utils/DdbPosition.mjs';

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
export async function handler(event) {
  console.log(`EVENT: ${JSON.stringify(event)}`);

  const { connectionId } = event.requestContext;
  const ddbSiteConnection = new DdbSiteConnection();
  const ddbPosition = new DdbPosition();
  const res = await ddbSiteConnection.queryByConnectionId({ connectionId }).catch(err => {
    console.error('ddbSiteConnection.queryByConnectionId fail: ', err)
  });

  if (res.Items && res.Items.length) {
    const positionIds = new Set();

    await Promise.all(res.Items.map(({ id, positionId }) => {
      console.log('ddbSiteConnection.delete id:', id);

      positionIds.add(positionId);

      return ddbSiteConnection.delete({ id });
    }));

    await Promise.all(Array.from(positionIds).map((positionId) => {
      return new Promise(async (reslove, reject) => {
        const result = await ddbSiteConnection.queryByPositionId({ positionId }).catch(err => {
          console.error('ddbSiteConnection.queryByPositionId fail: ', err)

          return reject(err);
        });
  
        if (result && result.Count) {
          return reslove();
        }
  
        await ddbPosition.delete({ positionId }).catch(err => {
          console.error('ddbPosition.delete fail: ', err);

          return reject(err);
        });

        reslove();
      });
    }));
  }

  return {
    statusCode: 200,
  };
};
