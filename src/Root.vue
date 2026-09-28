<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import App from './App.vue';
import PublicPages from './PublicPages.vue';
const route = useRoute();
const isApp = computed(() =>
  ['/app', '/insumos', '/receitas', '/simulador', '/vendas'].includes(route.path),
);
watch(
  () => route.path,
  () => {
    window.scrollTo(0, 0);
    const name = (route.meta.title as string) || 'Custos e precificação para sua cozinha';
    document.title = `${name} · Prato Certo`;
  },
  { immediate: true },
);
</script>
<template><App v-if="isApp" /><PublicPages v-else :key="$route.path" /></template>
