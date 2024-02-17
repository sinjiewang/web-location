function toFixedTwo(value) {
  return Number(Number(value).toFixed(2));
}

function getZone({ lat, lng }) {
  return `lat${toFixedTwo(lat)}&lng${toFixedTwo(lng)}`;
}

export {
  toFixedTwo,
  getZone,
}