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
import { getPositionId } from './utils/positionHelper.mjs';

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
export async function handler(event) {
  console.log(`EVENT: ${JSON.stringify(event)}`);

  const { queryStringParameters, requestContext } = event;
  const { connectionId } = requestContext;

  if (!queryStringParameters ||
      !queryStringParameters.hasOwnProperty('siteId') ||
      !queryStringParameters.hasOwnProperty('lat') ||
      !queryStringParameters.hasOwnProperty('lng')
  ) {
    return {
      statusCode: 403,
      body: 'Connection refused: invalid position'
    };
  }

  const { siteId, lat, lng, type } = queryStringParameters;
  const ddbPosition = new DdbPosition();
  const ddbSiteConnection = new DdbSiteConnection();
  const positionId = getPositionId({ lat, lng });

  const res = await ddbSiteConnection.queryBySiteId({ siteId }).catch(err => {
    console.error('DdbSiteConnection.query fail: ', err);
  });

  if (res.Items && res.Items.length) {
    console.error('Duplicate siteId', siteId)
    return {
      statusCode: 400,
      body: 'Duplicate siteId'
    };
  }

  await ddbPosition.create({
    positionId,
    lat: Number(lat),
    lng: Number(lng),
  });

  await ddbSiteConnection.create({
    positionId,
    connectionId,
    type,
    siteId,
  });

  return {
    statusCode: 200,
  };
};
