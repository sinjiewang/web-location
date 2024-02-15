<script>
import InteractionGoogleMap from './components/InteractionGoogleMap.vue';
import coordinate from './utils/coordinate';
import { mapActions } from 'vuex';

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
    };
  },
  methods: {
    ...mapActions('MapLabel', ['getLabels']),
    onMarker(position) {
      console.log('marker', position)
    },
    onCenter(position) {
      console.log('center', position)
    },
    onLabel(position) {
      console.log('label', position)
    },
  },
  mounted() {
    this.getLabels(this.center);
  },
}
</script>

<template>
  <InteractionGoogleMap
    class="map"
    :center="center"
    @center="onCenter"
    @marker="onMarker"
    @label="onLabel"
  />
</template>

<style scoped>
.map {
  width: 90vh;
}
</style>
