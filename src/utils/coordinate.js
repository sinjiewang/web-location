function toFixedSix(value) {
  return Number(Number(value).toFixed(6));
}

function transform({ lat, lng }) {
  return {
    lat: toFixedSix(lat),
    lng: toFixedSix(lng),
  };
}

export default {
  transform,
}