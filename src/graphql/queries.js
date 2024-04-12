/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getPosition = /* GraphQL */ `
  query GetPosition($positionId: String = "", $limit: Int = 10, $nextToken: String = null) {
    getPosition(positionId: $positionId) {
      positionId
      lat
      lng
      sites(limit: $limit, nextToken: $nextToken) {
        nextToken
        items {
          siteId
          createdAt
          positionId
          title
          passwordRequired
          type
          updatedAt
        }
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
      passwordRequired
      type
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
      createdAt
      updatedAt
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
        passwordRequired
        type
        connectionId
        siteId
        positionId
        createdAt
        updatedAt
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
      zone
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
        zone
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
export const siteConnectionsByConnectionId = /* GraphQL */ `
  query SiteConnectionsByConnectionId(
    $connectionId: String!
    $sortDirection: ModelSortDirection
    $filter: ModelSiteConnectionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    siteConnectionsByConnectionId(
      connectionId: $connectionId
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        title
        passwordRequired
        type
        connectionId
        siteId
        positionId
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const siteConnectionsBySiteId = /* GraphQL */ `
  query SiteConnectionsBySiteId(
    $siteId: String!
    $sortDirection: ModelSortDirection
    $filter: ModelSiteConnectionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    siteConnectionsBySiteId(
      siteId: $siteId
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        title
        passwordRequired
        type
        connectionId
        siteId
        positionId
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const siteConnectionsByPositionId = /* GraphQL */ `
  query SiteConnectionsByPositionId(
    $positionId: String!
    $sortDirection: ModelSortDirection
    $filter: ModelSiteConnectionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    siteConnectionsByPositionId(
      positionId: $positionId
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        title
        passwordRequired
        type
        connectionId
        siteId
        positionId
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const clientConnectionsByConnectionId = /* GraphQL */ `
  query ClientConnectionsByConnectionId(
    $connectionId: String!
    $sortDirection: ModelSortDirection
    $filter: ModelClientConnectionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    clientConnectionsByConnectionId(
      connectionId: $connectionId
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
        zone
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const clientConnectionsByZone = /* GraphQL */ `
  query ClientConnectionsByZone(
    $zone: String!
    $sortDirection: ModelSortDirection
    $filter: ModelClientConnectionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    clientConnectionsByZone(
      zone: $zone
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
        zone
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
