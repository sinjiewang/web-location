/* Amplify Params - DO NOT EDIT
	ENV
	REGION
Amplify Params - DO NOT EDIT */

import AWS from 'aws-sdk';
import crypto from 'crypto';
import createCredentials from './utils/createCredentials.mjs';

const ClientConnectionWebSocketAPI_URL = 'https://vv3z4ral1k.execute-api.ap-northeast-1.amazonaws.com/dev/';
const apiGateway = new AWS.ApiGatewayManagementApi({
  endpoint: ClientConnectionWebSocketAPI_URL
});
const key = 'SJW'; // secret

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
export async function handler(event) {
  console.log(`EVENT: ${JSON.stringify(event)}`);

  const { connectionId } = event.requestContext;
  const user = crypto.randomBytes(8).toString('hex');
  const expiry = 60 * 15; // 15 min
  const expireTime = Date.now() + expiry * 1000;
  const { username, credential } = createCredentials(user, key, expiry);
  const iceServer = {
    urls: ['turn:35.79.18.12:3478'],
    username,
    credential,
  };
  const data = {
    iceServers: [ iceServer ],
    expireTime,
  }

  await apiGateway.postToConnection({
    ConnectionId: connectionId,
    Data: JSON.stringify(data),
  }).promise();

  return { statusCode: 200 };
};
