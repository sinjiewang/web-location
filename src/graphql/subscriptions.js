/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreatePosition = /* GraphQL */ `
  subscription OnCreatePosition($filter: ModelSubscriptionPositionFilterInput) {
    onCreatePosition(filter: $filter) {
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
export const onUpdatePosition = /* GraphQL */ `
  subscription OnUpdatePosition($filter: ModelSubscriptionPositionFilterInput) {
    onUpdatePosition(filter: $filter) {
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
export const onDeletePosition = /* GraphQL */ `
  subscription OnDeletePosition($filter: ModelSubscriptionPositionFilterInput) {
    onDeletePosition(filter: $filter) {
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
export const onCreateSiteConnection = /* GraphQL */ `
  subscription OnCreateSiteConnection(
    $filter: ModelSubscriptionSiteConnectionFilterInput
  ) {
    onCreateSiteConnection(filter: $filter) {
      id
      title
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
export const onUpdateSiteConnection = /* GraphQL */ `
  subscription OnUpdateSiteConnection(
    $filter: ModelSubscriptionSiteConnectionFilterInput
  ) {
    onUpdateSiteConnection(filter: $filter) {
      id
      title
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
export const onDeleteSiteConnection = /* GraphQL */ `
  subscription OnDeleteSiteConnection(
    $filter: ModelSubscriptionSiteConnectionFilterInput
  ) {
    onDeleteSiteConnection(filter: $filter) {
      id
      title
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
export const onCreateClientConnection = /* GraphQL */ `
  subscription OnCreateClientConnection(
    $filter: ModelSubscriptionClientConnectionFilterInput
  ) {
    onCreateClientConnection(filter: $filter) {
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
export const onUpdateClientConnection = /* GraphQL */ `
  subscription OnUpdateClientConnection(
    $filter: ModelSubscriptionClientConnectionFilterInput
  ) {
    onUpdateClientConnection(filter: $filter) {
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
export const onDeleteClientConnection = /* GraphQL */ `
  subscription OnDeleteClientConnection(
    $filter: ModelSubscriptionClientConnectionFilterInput
  ) {
    onDeleteClientConnection(filter: $filter) {
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
