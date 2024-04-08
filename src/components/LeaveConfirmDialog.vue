<script>

export default {
  emits: ['confirm'],
  data() {
    return {
      showConfirmDialog: false,
    };
  },
  methods: {
    show() {
      this.showConfirmDialog = true;
    },
    onClickConfirm() {
      this.$emit('confirm');
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
        {{ $t('The content has been modified.') }}
        <br>
        {{ $t('Are you sure you want to leave?') }}
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
          :text="$t('Confirm')"
          color="red"
          variant="elevated"
          @click="onClickConfirm"
        ></v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>

</style>
