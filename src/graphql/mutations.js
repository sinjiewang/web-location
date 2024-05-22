/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createPosition = /* GraphQL */ `
  mutation CreatePosition(
    $input: CreatePositionInput!
    $condition: ModelPositionConditionInput
  ) {
    createPosition(input: $input, condition: $condition) {
      positionId
      lat
      lng
      sites {
        nextToken
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const updatePosition = /* GraphQL */ `
  mutation UpdatePosition(
    $input: UpdatePositionInput!
    $condition: ModelPositionConditionInput
  ) {
    updatePosition(input: $input, condition: $condition) {
      positionId
      lat
      lng
      sites {
        nextToken
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const deletePosition = /* GraphQL */ `
  mutation DeletePosition(
    $input: DeletePositionInput!
    $condition: ModelPositionConditionInput
  ) {
    deletePosition(input: $input, condition: $condition) {
      positionId
      lat
      lng
      sites {
        nextToken
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const createSiteConnection = /* GraphQL */ `
  mutation CreateSiteConnection(
    $input: CreateSiteConnectionInput!
    $condition: ModelSiteConnectionConditionInput
  ) {
    createSiteConnection(input: $input, condition: $condition) {
      id
      title
      passwordRequired
      type
      owner
      connectionId
      siteId
      positionId
      position {
        positionId
        lat
        lng
        createdAt
        updatedAt
        __typename
      }
      connectionCount
      connectionLimit
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const updateSiteConnection = /* GraphQL */ `
  mutation UpdateSiteConnection(
    $input: UpdateSiteConnectionInput!
    $condition: ModelSiteConnectionConditionInput
  ) {
    updateSiteConnection(input: $input, condition: $condition) {
      id
      title
      passwordRequired
      type
      owner
      connectionId
      siteId
      positionId
      position {
        positionId
        lat
        lng
        createdAt
        updatedAt
        __typename
      }
      connectionCount
      connectionLimit
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const deleteSiteConnection = /* GraphQL */ `
  mutation DeleteSiteConnection(
    $input: DeleteSiteConnectionInput!
    $condition: ModelSiteConnectionConditionInput
  ) {
    deleteSiteConnection(input: $input, condition: $condition) {
      id
      title
      passwordRequired
      type
      owner
      connectionId
      siteId
      positionId
      position {
        positionId
        lat
        lng
        createdAt
        updatedAt
        __typename
      }
      connectionCount
      connectionLimit
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const createClientConnection = /* GraphQL */ `
  mutation CreateClientConnection(
    $input: CreateClientConnectionInput!
    $condition: ModelClientConnectionConditionInput
  ) {
    createClientConnection(input: $input, condition: $condition) {
      id
      connectionId
      lat
      lng
      zone
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const updateClientConnection = /* GraphQL */ `
  mutation UpdateClientConnection(
    $input: UpdateClientConnectionInput!
    $condition: ModelClientConnectionConditionInput
  ) {
    updateClientConnection(input: $input, condition: $condition) {
      id
      connectionId
      lat
      lng
      zone
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const deleteClientConnection = /* GraphQL */ `
  mutation DeleteClientConnection(
    $input: DeleteClientConnectionInput!
    $condition: ModelClientConnectionConditionInput
  ) {
    deleteClientConnection(input: $input, condition: $condition) {
      id
      connectionId
      lat
      lng
      zone
      createdAt
      updatedAt
      __typename
    }
  }
`;
