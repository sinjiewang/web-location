<script>
import { v4 as uuidv4 } from 'uuid';

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
      default: 18
    },
  },
  data() {
    return {
      CONFIG: {
        streetViewControl: false,
        mapTypeControl: false,
        scaleControl: true,
        styles: [
          {
            featureType: 'poi.business',
            stylers: [{ visibility: 'off' }]
          },
        ]
      },
      LABEL_ID_PREFIX: 'label',
      POSITION_ID_PREFIX: 'position',
      mapHeight: '100%',
      map: null,
      markers: new Map(),
      positionMarkerId: null,
    };
  },
  async mounted() {
    const map = this.createMap({
      ...this.CONFIG,
      center: this.center,
      zoom: this.zoom,
      maxZoom: this.maxZoom,
      minZoom: this.minZoom,
    });

    map.addListener('dragend', () => this.onMapDragend());

    this.map = map;
    this.setMapHeight();
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
      const { map, markers } = this;

      marker.setMap(map);
      markers.set(id, () => {
        marker.setMap(null);
        google.maps.event.clearListeners(marker);
      })
    },
    deleteMaker(id) {
      const deleteMaker = this.getMarker(id);

      if (!deleteMaker) return;

      deleteMaker();

      this.markers.delete(id);
    },
    getPositionMarkerId() {
      return `${this.POSITION_ID_PREFIX}_${uuidv4()}`;
    },
    addPositionMarker({ lat, lng }) {
      this.removePositionMarker();

      const id = this.getPositionMarkerId();
      const marker = new google.maps.Marker({
        position: { lat, lng },
      });

      marker.addListener('dragend', (event) => this.onMarkerDragend(event));

      this.positionMarkerId = id;
      this.setMarker(id, marker);
      this.setMarkerDraggable(marker);

      return { id, marker };
    },
    removePositionMarker() {
      const { positionMarkerId } = this;

      if (positionMarkerId) {
        this.deleteMaker(positionMarkerId);
        this.positionMarkerId = null;
      }
    },
    setMarkerDraggable(marker) {
      marker.setDraggable(true);
      marker.setTitle(this.draggableTitle);
    },
    setMarkerUndraggable(marker) {
      marker.setDraggable(false);
      marker.setTitle('');
    },
    getLabelMarkerId({ lat, lng }) {
      return `${this.LABEL_ID_PREFIX}_${lat}_${lng}`;
    },
    addLabelMarker(position) {
      const { lat, lng } = position;
      const id = this.getLabelMarkerId({ lat, lng });
      const marker = new google.maps.Marker({
        position: { lat, lng },
        icon: {
          url: '/thumbtack.svg',
        },
      });

      marker.addListener('click', () => this.onClickLabel(position));

      this.setMarker(id, marker);

      return { id, marker };
    },
    updateLabelMarkers(positions=[]) {
      const positionIds = positions.map((position) => this.getLabelMarkerId(position));
      const existMarkerIds = Array.from(this.markers.keys());

      positions.filter((position) => !existMarkerIds.includes(this.getLabelMarkerId(position)))
        .forEach((position) => this.addLabelMarker(position));
      existMarkerIds.filter((markerId) => !positionIds.includes(markerId))
        .forEach((markerId) => this.deleteMaker(markerId));
    },
    removeLabelMarker({ lat, lng }) {
      const id = this.getLabelMarkerId({ lat, lng });

      this.deleteMaker(id);
    },
    removeAllLabelMarker() {
      Array.from(this.markers.keys())
        .filter((labelId) => labelId !== this.positionMarkerId)
        .forEach((labelId) => this.deleteMaker(labelId));
    },
    onMapDragend() {
      const center = this.map.getCenter();

      this.$emit('center', {
        lat: center.lat(),
        lng: center.lng(),
      });
    },
    onMarkerDragend(event) {
      this.removeAllLabelMarker();
      this.$emit('position', {
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      });
    },
    onClickLabel(position) {
      this.$emit('label', position);
    },
    setMapHeight() {
      this.mapHeight = document.getElementById("map").offsetWidth + 'px';
    }
  }
};
</script>

<template>
  <div class="google-map" id="map"
    :style="{
      height: mapHeight
    }"
  ></div>
</template>

<style scoped>
.google-map {
  width: 100%;
}
</style>
