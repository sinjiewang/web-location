/* Amplify Params - DO NOT EDIT
	ENV
	REGION
Amplify Params - DO NOT EDIT */

import AWS from 'aws-sdk';
import crypto from 'crypto';
import createCredentials from './utils/createCredentials.mjs';
import config from '/opt/nodejs/config.json' assert { type: 'json' };

const env = process.env.ENV || 'dev';
const apiGateway = new AWS.ApiGatewayManagementApi({
  endpoint: config[env]['SITE_WEBSOCKET_API_URL'],
});
const secretKey = config[env]['TURN_SECRET_KEY'];
const turnServerList = config[env]['TURN_SERVER_LIST'];

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
export async function handler(event) {
  console.log(`EVENT: ${JSON.stringify(event)}`);

  const { connectionId } = event.requestContext;
  const user = crypto.randomBytes(8).toString('hex');
  const expiry = 60 * 15; // 15 min
  const expireTime = Date.now() + expiry * 1000;
  const { username, credential } = createCredentials(user, secretKey, expiry);
  const turnServer = {
    urls: turnServerList,
    username,
    credential,
  };
  const googleStun = { urls: 'stun:stun.l.google.com:19302' };
  const data = {
    iceServers: [ googleStun, turnServer ],
    expireTime,
  }

  await apiGateway.postToConnection({
    ConnectionId: connectionId,
    Data: JSON.stringify({
      action: 'iceServers',
      data,
    }),
  }).promise();

  return { statusCode: 200 };
};
