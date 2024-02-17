function transformValueByType(attr={}) {
  const [type, value] = Object.entries(attr).pop() || [];

  switch (type) {
    case 'S':
      return '' + value;
    case 'N':
      return Number(value);
    // case 'B':
    // case 'BOOL':
    // case 'NULL':
    // case 'M':
    // case 'L':
    // case 'SS':
    // case 'NS':
    // case 'BS':
    default:
      return value;
  }
}

export function transformPosition({ lat, lng }) {
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  };
}

export function parseEventItem(item) {
  return Object.keys(item).reduce((acc, curr) => ({
    ...acc,
    [curr]: transformValueByType(item[curr])
  }), {});
}
