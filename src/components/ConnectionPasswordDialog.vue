<script>

export default {
  emits: ['password'],
  data() {
    return {
      showConfirmDialog: false,
      showPassword: false,
      password: null,
    };
  },
  methods: {
    show() {
      this.showConfirmDialog = true;
      this.$nextTick(() => {
        this.$refs.password.focus();
      });
    },
    onClickConnect() {
      this.$emit('password', this.password);
      this.showConfirmDialog = false;
      this.password = null;
    }
  },
}
</script>

<template>
  <v-dialog
    v-model="showConfirmDialog"
    persistent
    max-width="400px"
  >
    <v-card>
      <v-card-text>
        <v-text-field
          ref="password"
          v-model="password"
          :label="$t('Please enter the connection password')"
          :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
          :type="showPassword ? 'text' : 'password'"
          @click:append="showPassword = !showPassword"
          hide-details
        ></v-text-field>
      </v-card-text>
      <v-card-actions class="d-flex justify-end align-stretch">
        <v-spacer></v-spacer>
        <v-btn
          :text="$t('Connect')"
          color="primary"
          variant="elevated"
          @click="onClickConnect"
        ></v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>

</style>
