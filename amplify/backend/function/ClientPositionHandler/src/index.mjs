/* Amplify Params - DO NOT EDIT
	API_WEBLOCATION_CLIENTCONNECTIONTABLE_ARN
	API_WEBLOCATION_CLIENTCONNECTIONTABLE_NAME
	API_WEBLOCATION_GRAPHQLAPIIDOUTPUT
	API_WEBLOCATION_SITECONNECTIONTABLE_ARN
	API_WEBLOCATION_SITECONNECTIONTABLE_NAME
	ENV
	REGION
Amplify Params - DO NOT EDIT */

import DdbClientConnection from './utils/DdbClientConnection.mjs';
import { getZone } from './utils/positionHelper.mjs';

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
export async function handler(event) {
  console.log(`EVENT: ${JSON.stringify(event)}`);

  const { connectionId } = event.requestContext;
  const body = JSON.parse(event.body);
  const { lat, lng } = body.data;
  const ddbClientConnection = new DdbClientConnection();
  const res = await ddbClientConnection.query({ connectionId }).catch(err => {
    console.error('ddbClientConnection.query fail: ', err);
  });

  if (res.Items && res.Items.length) {
    await Promise.all(res.Items.map(({ id }) => {
      console.log('ddbClientConnection.update id:', id, { lat, lng });

      return ddbClientConnection.update({
        id,
        data: {
          lat: Number(lat),
          lng: Number(lng),
          zone: getZone({ lat, lng }),
        },
      });
    }));
  }

  return {
    statusCode: 200,
  };
};
