/* Amplify Params - DO NOT EDIT
	API_WEBLOCATION_CLIENTCONNECTIONTABLE_ARN
	API_WEBLOCATION_CLIENTCONNECTIONTABLE_NAME
	API_WEBLOCATION_GRAPHQLAPIIDOUTPUT
	API_WEBLOCATION_SITECONNECTIONTABLE_ARN
	API_WEBLOCATION_SITECONNECTIONTABLE_NAME
	ENV
	REGION
Amplify Params - DO NOT EDIT */

import AWS from 'aws-sdk';

const SiteConnectionWebSocketAPI_URL = 'https://k64wydzchi.execute-api.ap-northeast-1.amazonaws.com/dev/';
const apiGateway = new AWS.ApiGatewayManagementApi({
    endpoint: SiteConnectionWebSocketAPI_URL
});

import DdbSiteConnection from './utils/DdbSiteConnection.mjs';

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
export async function handler(event) {
  console.log(`EVENT: ${JSON.stringify(event)}`);

  const statusCode = 200;
  const body = JSON.parse(event.body);
  const { siteId, data } = body;
  const clientId = event.requestContext.connectionId;

  if (!siteId) {
    return { statusCode };
  }

  const ddbSiteConnection = new DdbSiteConnection();
  const res = await ddbSiteConnection.queryByConnectionId({ connectionId: siteId }).catch(err => {
    console.error('DdbSiteConnection.query fail: ', err);
  });

  if (res.Items && res.Items.length) {
    await Promise.all(res.Items.map(({ connectionId }) => {
      return apiGateway.postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify({
          action: body.action,
          clientId,
          data: data
        }),
      }).promise();
    }));
  }

  return { statusCode };
};
