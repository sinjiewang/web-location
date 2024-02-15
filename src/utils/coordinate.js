function transform({ lat, lng }) {
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  };
}

export default {
  transform,
}