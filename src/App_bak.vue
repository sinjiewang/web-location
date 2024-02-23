<script>
import InteractionGoogleMap from './components/InteractionGoogleMap.vue';
import coordinate from './utils/coordinate';
import { mapGetters, mapActions } from 'vuex';

export default {
  components: {
    InteractionGoogleMap,
  },
  data() {
    return {
      center: coordinate.transform({
        'lat': 24.944716936535976,
        'lng': 121.38289496216872,
      }),
      component: null,
    };
  },
  computed: {
    ...mapGetters('Geopositioning', ['labels']),
  },
  methods: {
    ...mapActions('Geopositioning', ['getLabels', 'getUserPosition']),
    ...mapActions('CloudTunnel', ['clientConnect', 'updateClientPosition']),
    onPosition(position) {
      console.log('position', position)

      this.getLabels(position);
    },
    onCenter(position) {
      console.log('center', position)

      this.center = position;
      this.getLabels(this.center);
      this.updateClientPosition(position);
    },
    onLabel(position) {
      console.log('label', position)
    },
  },
  watch: {
    labels(value) {
      const { googleMap } = this.$refs;

      googleMap.updateLabelMarkers(value);
    },
  },
  async mounted() {
    this.center = await this.getUserPosition();
    await this.clientConnect(this.center);
    console.log('this.center', this.center)
    this.getLabels(this.center);
    this.component = 'InteractionGoogleMap';
  },
}
</script>

<template>
  <component
    ref="googleMap"
    :is="component"
    class="map"
    :center="center"
    :minZoom="16"
    @center="onCenter"
    @position="onPosition"
    @label="onLabel"
  />
</template>

<style scoped>
.map {
  width: 100%;
}
</style>
