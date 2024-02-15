/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getPosition = /* GraphQL */ `
  query GetPosition($positionId: String!) {
    getPosition(positionId: $positionId) {
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
export const listPositions = /* GraphQL */ `
  query ListPositions(
    $positionId: String
    $filter: ModelPositionFilterInput
    $limit: Int
    $nextToken: String
    $sortDirection: ModelSortDirection
  ) {
    listPositions(
      positionId: $positionId
      filter: $filter
      limit: $limit
      nextToken: $nextToken
      sortDirection: $sortDirection
    ) {
      items {
        positionId
        lat
        lng
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getSiteConnection = /* GraphQL */ `
  query GetSiteConnection($id: ID!) {
    getSiteConnection(id: $id) {
      id
      title
      type
      connectionId
      position {
        positionId
        lat
        lng
        createdAt
        updatedAt
        __typename
      }
      createdAt
      updatedAt
      positionSitesPositionId
      __typename
    }
  }
`;
export const listSiteConnections = /* GraphQL */ `
  query ListSiteConnections(
    $filter: ModelSiteConnectionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listSiteConnections(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        title
        type
        connectionId
        createdAt
        updatedAt
        positionSitesPositionId
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getClientConnection = /* GraphQL */ `
  query GetClientConnection($id: ID!) {
    getClientConnection(id: $id) {
      id
      connectionId
      lat
      lng
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listClientConnections = /* GraphQL */ `
  query ListClientConnections(
    $filter: ModelClientConnectionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listClientConnections(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        connectionId
        lat
        lng
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const positionsByLat = /* GraphQL */ `
  query PositionsByLat(
    $lat: Float!
    $sortDirection: ModelSortDirection
    $filter: ModelPositionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    positionsByLat(
      lat: $lat
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        positionId
        lat
        lng
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const positionsByLng = /* GraphQL */ `
  query PositionsByLng(
    $lng: Float!
    $sortDirection: ModelSortDirection
    $filter: ModelPositionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    positionsByLng(
      lng: $lng
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        positionId
        lat
        lng
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const clientConnectionsByLat = /* GraphQL */ `
  query ClientConnectionsByLat(
    $lat: Float!
    $sortDirection: ModelSortDirection
    $filter: ModelClientConnectionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    clientConnectionsByLat(
      lat: $lat
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        connectionId
        lat
        lng
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const clientConnectionsByLng = /* GraphQL */ `
  query ClientConnectionsByLng(
    $lng: Float!
    $sortDirection: ModelSortDirection
    $filter: ModelClientConnectionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    clientConnectionsByLng(
      lng: $lng
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        connectionId
        lat
        lng
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
