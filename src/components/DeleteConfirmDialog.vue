<script>

export default {
  emits: ['delete'],
  props: {
    name: {
      type: String,
      default: () => null,
    },
  },
  data() {
    return {
      showConfirmDialog: false,
    };
  },
  methods: {
    show() {
      this.showConfirmDialog = true;
    },
    onClickDelete() {
      this.$emit('delete');
      this.showConfirmDialog = false;
    }
  },
}
</script>

<template>
  <v-dialog
    v-model="showConfirmDialog"
    persistent
    max-width="400px"
    @click:outside="showConfirmDialog = false"
  >
    <v-card>
      <v-card-text>
        "{{ name }}"
        <br>
        {{ $t('Are you sure you want to remove?') }}
      </v-card-text>
      <v-card-actions class="d-flex justify-end align-stretch">
        <v-spacer></v-spacer>
        <v-btn
          class="bg-primary"
          :text="$t('Cancel')"
          variant="elevated"
          @click="showConfirmDialog = false"
        ></v-btn>
        <v-btn
          class="bg-red"
          :text="$t('Delete')"
          color="red"
          variant="elevated"
          @click="onClickDelete"
        ></v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>

</style>
