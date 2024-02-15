<script>
import { v4 as uuidv4 } from 'uuid';
import coordinate from '../utils/coordinate';

export default {
  name: "InteractionMap",
  props: {
    center: {
      type: Object,
      default: () => null,
    },
    maxZoom: {
      type: Number,
      default: 20
    },
    minZoom: {
      type: Number,
      default: 12
    },
    zoom: {
      type: Number,
      default: 17
    },
  },
  data() {
    return {
      CONFIG: {
        streetViewControl: false,
        mapTypeControl: false,
        styles: [
          {
            featureType: 'poi.business',
            stylers: [{ visibility: 'off' }]
          },
        ]
      },
      map: null,
      markers: new Map(),
      positionMarkerId: null,
    };
  },
  async mounted() {
    let position;

    if (this.center) {
      position = this.center;
    } else {
      position = await this.getUserPosition();
    }

    const map = this.createMap({
      ...this.CONFIG,
      center: position,
      zoom: this.zoom,
      maxZoom: this.maxZoom,
      minZoom: this.minZoom,
    });

    map.addListener('dragend', () => this.onMapDragend());

    this.map = map;
    // this.addLabelMarker(position);
    // this.addLabelMarker({
    //     'lat': 24.949717,
    //     'lng': 121.382895,
    //   });
    
    // this.addLabelMarker({
    //     'lat': 24.944717,
    //     'lng': 121.387895,
    //   });
    
    // this.addLabelMarker({
    //     'lat': 24.939717,
    //     'lng': 121.382895,
    //   });
    
    // this.addLabelMarker({
    //     'lat': 24.944717,
    //     'lng': 121.377895,
    //   });
  },
  computed: {
    draggableTitle() {
      return 'Drag to set your position.';
    },
  },
  methods: {
    createMap(config) {
      return new google.maps.Map(document.getElementById("map"), config);
    },
    getMarker(id) {
      return this.markers.get(id);
    },
    setMarker(id, marker) {
      this.markers.set(id, marker);
    },
    deleteMaker(id) {
      this.markers.delete(id);
    },
    addPositionMarker({ lat, lng }) {
      const { positionMarkerId } = this;
      if (positionMarkerId) {
        this.deleteMaker(positionMarkerId);
      }

      const id = uuidv4();
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: this.map,
      });

      marker.addListener('dragend', (event) => this.onMarkerDragend(event));

      this.positionMarkerId = id;
      this.setMarker(id, marker);
      this.setMarkerDraggable(marker);

      return { id, marker };
    },
    setMarkerDraggable(marker) {
      marker.setDraggable(true);
      marker.setTitle(this.draggableTitle);
    },
    setMarkerUndraggable(marker) {
      marker.setDraggable(false);
      marker.setTitle('');
    },
    addLabelMarker({ lat, lng }) {
      const id = uuidv4();
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: this.map,
        icon: {
          url: '/thumbtack.svg',
        },
      });

      marker.addListener('mouseover', () => this.onLabelMouseover({ lat, lng }));

      this.setMarker(id, marker);

      return { id, marker };
    },
    async getCurrentPosition() {
      return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject))
        .then(({ coords }) => ({
          accuracy: coords.accuracy,
          ...coordinate.transform({
            lat: coords.latitude,
            lng: coords.longitude,
          }),
        }));
    },
    async getGeolocationAPI() {
        return fetch(this.googleapisUrl, {
          method: 'POST',
        })
        .then(res => res.json())
        .then(({ accuracy, location }) => ({ accuracy, ...coordinate.transform(location)}));
    },
    async getUserPosition() {
      let position = null;

      try {
        if ('geolocation' in navigator) {
          position = await this.getCurrentPosition();
        } else {
          position = await this.getGeolocationAPI();
        }

      } catch (err) {
        console.warn('getUserPosition fail', err);
      }

      return position;
    },
    onMapDragend() {
      const center = this.map.getCenter();

      this.$emit('center', {
        lat: center.lat(),
        lng: center.lng(),
      });
    },
    onMarkerDragend(event) {
      this.$emit('marker', {
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      });
    },
    onLabelMouseover({ lat,lng  }) {
      this.$emit('label', { lat, lng });
    },
  }
};
</script>

<template>
  <div>
    <div class="google-map" id="map"></div>
  </div>
</template>

<style scoped>
.google-map {
  width: 100%;
  height: 400px;
}
</style>
