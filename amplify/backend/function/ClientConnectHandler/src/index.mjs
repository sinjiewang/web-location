/* Amplify Params - DO NOT EDIT
	API_WEBLOCATION_CLIENTCONNECTIONTABLE_ARN
	API_WEBLOCATION_CLIENTCONNECTIONTABLE_NAME
	API_WEBLOCATION_GRAPHQLAPIIDOUTPUT
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
  const { lat = 0, lng = 0 } = event.queryStringParameters || {};
  const ddbClientConnection = new DdbClientConnection();

  await ddbClientConnection.create({
    connectionId,
    lat: Number(lat),
    lng: Number(lng),
    zone: getZone({ lat, lng }),
  });

  return {
    statusCode: 200,
  };
};
