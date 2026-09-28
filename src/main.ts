import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHashHistory } from 'vue-router';
import Root from './Root.vue';
import './style.css';
import './public.css';
const pages: { [key: string]: string } = {
  '/': 'Sua cozinha, com margem',
  '/app': 'Visão geral',
  '/insumos': 'Insumos',
  '/receitas': 'Fichas técnicas',
  '/simulador': 'Precificação',
  '/vendas': 'Vendas',
  '/login': 'Entrar',
  '/cadastro': 'Criar conta',
  '/recuperar-senha': 'Recuperar senha',
  '/redefinir-senha': 'Nova senha',
  '/termos': 'Termos de Serviço',
  '/privacidade': 'Política de Privacidade',
  '/conta': 'Minha conta',
};
const routes = Object.entries(pages).map(([path, title]) => ({
  path,
  component: { template: '<div />' },
  meta: { title },
}));
const router = createRouter({
  history: createWebHashHistory(),
  routes: [...routes, { path: '/:pathMatch(.*)*', redirect: '/' }],
});
createApp(Root).use(createPinia()).use(router).mount('#app');
