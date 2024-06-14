<script>
export default {
  props: {
    timeout: {
      type: Number,
      default: () => 30,  // sec
    },
  },
  data() {
    return {
      fullDashArray: 283,
      value: this.time,
      startTime: null,
    };
  },
  methods: {
    update() {
      const delta = Date.now() - this.startTime;
      const timeout = this.timeout * 1000;
      const strokeDashoffset = (timeout - delta) / timeout * this.fullDashArray;

      this.$refs.progressBar.style.strokeDashoffset = strokeDashoffset;
      this.value = this.timeout - Math.floor(delta / 1000);

      if (this.value <= 0) {
        this.$emit('timeout');
        this.stop();
      }
    },
    start() {
      this.stop();
      this.value = this.timeout;
      this.startTime = Date.now();
      this.$interval = setInterval(() => this.update(), 200);
    },
    stop() {
      if (this.$interval) {
        clearInterval(this.$interval);

        delete this.$interval;
      }
    },
  },
  mounted() {
    this.start();
  },
  unmounted() {
    this.stop();
  },
}
</script>

<template>
  <div
    class="p-absolute d-flex justify-center align-center"
  >
    <div class="p-absolute text-center w-100 h-100" style="line-height: 30px; background-color: #222;">{{ value }}</div>
    <svg class="p-absolute" viewBox="0 0 100 100"
      style="width: 100%; height: 100%; transform: rotate(-90deg);"
    >
      <circle cx="50" cy="50" r="45" stroke="#fff" stroke-width="10" fill="none"/>
      <circle ref="progressBar" cx="50" cy="50" r="45" stroke="#222" stroke-width="10" fill="none" stroke-dasharray="283" stroke-dashoffset="283"/>
    </svg>
  </div>
</template>

<style>
.p-absolute {
  position: absolute;
}
</style>
