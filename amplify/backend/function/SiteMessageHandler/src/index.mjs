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
import config from '/opt/nodejs/config.json' assert { type: 'json' };

const env = process.env.ENV || 'dev';
const apiGateway = new AWS.ApiGatewayManagementApi({
    endpoint: config[env]['CLIENT_WEBSOCKET_API_URL'],
});

import DdbClientConnection from './utils/DdbClientConnection.mjs';

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
export async function handler(event) {
  console.log(`EVENT: ${JSON.stringify(event)}`);

  // const { connectionId } = event.requestContext;
  const body = JSON.parse(event.body);
  const { clientId, data } = body;
  const siteId = event.requestContext.connectionId;
  const statusCode = 200;

  if (!clientId) {
    return { statusCode };
  }

  const ddbClientConnection = new DdbClientConnection();
  const res = await ddbClientConnection.queryByConnectionId({ connectionId: clientId }).catch(err => {
    console.error('DdbSiteConnection.query fail: ', err);
  });

  if (res?.Items && res?.Items.length) {
    await Promise.all(res.Items.map(({ connectionId }) => {
      return apiGateway.postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify({
          action: body.action,
          siteId,
          data: data
        }),
      }).promise();
    }));
  }

  return { statusCode };
};
