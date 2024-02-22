/* Amplify Params - DO NOT EDIT
	API_WEBLOCATION_GRAPHQLAPIIDOUTPUT
	API_WEBLOCATION_SITECONNECTIONTABLE_ARN
	API_WEBLOCATION_SITECONNECTIONTABLE_NAME
	ENV
	REGION
Amplify Params - DO NOT EDIT */

import DdbSiteConnection from './utils/DdbSiteConnection.mjs';

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
export async function handler(event) {
  console.log(`EVENT: ${JSON.stringify(event)}`);

  const { connectionId } = event.requestContext;
  const body = JSON.parse(event.body);
  const { title } = body.data;
  const ddbSiteConnection = new DdbSiteConnection();
  const res = await ddbSiteConnection.query({ connectionId }).catch(err => {
    console.error('ddbSiteConnection.query fail: ', err);
  });

  if (res.Items && res.Items.length) {
    await Promise.all(res.Items.map(({ id }) => {
      console.log('ddbSiteConnection.update id:', id);

      return ddbSiteConnection.update({
        id,
        data: { title },
      });
    }));
  }

  return {
    statusCode: 200,
  };
};
