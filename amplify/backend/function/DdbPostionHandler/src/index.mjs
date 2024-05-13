/* Amplify Params - DO NOT EDIT
	API_WEBLOCATION_CLIENTCONNECTIONTABLE_ARN
	API_WEBLOCATION_CLIENTCONNECTIONTABLE_NAME
	API_WEBLOCATION_GRAPHQLAPIENDPOINTOUTPUT
	API_WEBLOCATION_GRAPHQLAPIIDOUTPUT
	API_WEBLOCATION_GRAPHQLAPIKEYOUTPUT
	ENV
	REGION
Amplify Params - DO NOT EDIT */

import AWS from 'aws-sdk';
import config from '/opt/nodejs/config.json' assert { type: 'json' };

const env = process.env.ENV || 'dev';
const apiGateway = new AWS.ApiGatewayManagementApi({
    endpoint: config[env]['CLIENT_WEBSOCKET_API_URL'],
});

import { parseEventItem } from './utils/dynamodbHelper.mjs';
import DdbClientConnection from './utils/DdbClientConnection.mjs';

const RANGE = 0.01;
/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
export async function handler(event) {
// exports.handler = event => {
  console.log(`EVENT: ${JSON.stringify(event)}`);
  const ddbClientConnection = new DdbClientConnection();

  for (const record of event.Records) {
    console.log(record.eventID);
    console.log(record.eventName);
    console.log('DynamoDB Record: %j', record.dynamodb);

    const { eventName, dynamodb } = record;
    let key, action;

    switch (eventName) {
      case 'INSERT':
        key = 'NewImage';
        action = 'add';
        break;
      case 'REMOVE':
        key = 'OldImage';
        action = 'remove';
        break;
      default:
        return Promise.resolve('Successfully processed DynamoDB record');
    }

    const item = parseEventItem(dynamodb[key]);
    const { lat, lng, positionId, createdAt, updatedAt, __typename } = item;
    const res = await ddbClientConnection.queryClientInZone({ lat, lng });

    if (res.Items && res.Items.length) {
      await Promise.all(res.Items.map(({ id, connectionId }) => {
        return apiGateway.postToConnection({
          ConnectionId: connectionId,
          Data: JSON.stringify({
            action,
            type: 'position',
            data: { lat, lng, positionId, createdAt, updatedAt, __typename },
          }),
        }).promise().catch((err) => {
          console.error('apiGateway.postToConnection() fail:', err);
          // connectionId Invalid
          return ddbClientConnection.delete({ id });
        });
      }));
    }
  }
  return Promise.resolve('Successfully processed DynamoDB record');
};
