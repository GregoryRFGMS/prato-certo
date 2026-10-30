<script setup lang="ts">
import { computed, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import App from './App.vue';
import PublicPages from './PublicPages.vue';
function documentFocus() {
  document.getElementById('main-content')?.focus();
}
const route = useRoute();
const isApp = computed(() =>
  ['/app', '/insumos', '/receitas', '/simulador', '/vendas'].includes(route.path),
);
watch(
  () => route.path,
  async (_, previous) => {
    window.scrollTo(0, 0);
    const name = (route.meta.title as string) || 'Custos e precificação para sua cozinha';
    document.title = `${name} · Prato Certo`;
    if (previous !== undefined) {
      await nextTick();
      (
        document.querySelector<HTMLElement>('main h1') ||
        document.querySelector<HTMLElement>('main')
      )?.focus();
    }
  },
  { immediate: true },
);
</script>
<template>
  <a class="skip-link" href="#main-content" @click.prevent="documentFocus">Ir para o conteúdo</a
  ><App v-if="isApp" /><PublicPages v-else :key="$route.path" />
</template>
