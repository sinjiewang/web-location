/* Amplify Params - DO NOT EDIT
    API_WEBLOCATION_CLIENTCONNECTIONTABLE_ARN
    API_WEBLOCATION_CLIENTCONNECTIONTABLE_NAME
    API_WEBLOCATION_GRAPHQLAPIIDOUTPUT
    ENV
    REGION
Amplify Params - DO NOT EDIT */

import DdbClientConnection from './utils/DdbClientConnection.mjs';

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
export async function handler(event) {
  console.log(`EVENT: ${JSON.stringify(event)}`);

  const { connectionId } = event.requestContext;
  const ddbClientConnection = new DdbClientConnection();
  const res = await ddbClientConnection.queryByConnectionId({ connectionId }).catch(err => {
    console.error('DdbClientConnection.queryByConnectionId fail: ', err)
  });

  if (res.Items && res.Items.length) {
    await Promise.all(res.Items.map(({ id }) => {
      console.log('DdbClientConnection.delete id:', id)
      return ddbClientConnection.delete({ id });
    }));
  }

  return {
    statusCode: 200,
  };
};
