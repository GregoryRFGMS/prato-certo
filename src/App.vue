<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  LayoutDashboard,
  Carrot,
  BookOpen,
  Calculator,
  ReceiptText,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Search,
  ChevronDown,
  X,
  Check,
  ChefHat,
  TrendingUp,
  Info,
  ArrowLeft,
  Pencil,
  Trash2,
  Package,
  Menu,
} from 'lucide-vue-next';
import { useKitchen, today } from './store';
import { money, pct, recipeCost, contribution, suggested, unitCost, baseUnit } from './domain';
const clone = (value: any) => JSON.parse(JSON.stringify(value));
const store = useKitchen(),
  route = useRoute(),
  router = useRouter();
const nav = [
  { path: '/app', label: 'Visão geral', icon: LayoutDashboard },
  { path: '/insumos', label: 'Insumos', icon: Carrot },
  { path: '/receitas', label: 'Fichas técnicas', icon: BookOpen },
  { path: '/simulador', label: 'Precificação', icon: Calculator },
  { path: '/vendas', label: 'Vendas', icon: ReceiptText },
];
const mobile = ref(false),
  search = ref(''),
  period = ref('30'),
  toast = ref(''),
  modal = ref(''),
  error = ref(''),
  form = ref<any>({}),
  editRecipe = ref<any>(null),
  ingredientToAdd = ref(1),
  simId = ref(2),
  target = ref(35),
  simPrice = ref(34),
  simFee = ref(12);
let toastTimer: any;
function notify(s: string) {
  toast.value = s;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.value = ''), 4500);
}
const cost = (r: any) => recipeCost(r, store.ingredients);
const margin = (r: any) => contribution(r.price, cost(r), r.fee, r.extra);
const selected = computed(
  () => store.recipes.find((r) => r.id === simId.value) || store.recipes[0],
);
function seed() {
  if (store.sales.length) return;
  const quantities = [10, 7, 5, 4];
  for (let day = 0; day < 20; day++) {
    let d = new Date();
    d.setDate(d.getDate() - day);
    store.recipes.forEach((r, j) => {
      store.sales.push({
        id: store.sales.length + 1,
        recipeId: r.id,
        name: r.name,
        date: d.toLocaleDateString('en-CA'),
        qty: quantities[j],
        price: r.price,
        cost: cost(r),
        fee: r.fee,
        extra: r.extra,
      });
    });
  }
}
seed();
const sales = computed(() => {
  const d = new Date();
  d.setDate(d.getDate() - Number(period.value) + 1);
  return store.sales
    .filter((s) => s.date >= d.toLocaleDateString('en-CA'))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
});
const revenue = computed(() => sales.value.reduce((s, v) => s + v.price * v.qty, 0));
const totalContribution = computed(() =>
  sales.value.reduce((s, v) => s + contribution(v.price, v.cost, v.fee, v.extra) * v.qty, 0),
);
const sold = computed(() => sales.value.reduce((s, v) => s + v.qty, 0));
const ranking = computed(() =>
  store.recipes
    .map((r) => {
      const ss = sales.value.filter((s) => s.recipeId === r.id);
      return {
        ...r,
        qty: ss.reduce((a, s) => a + s.qty, 0),
        total: ss.reduce((a, s) => a + contribution(s.price, s.cost, s.fee, s.extra) * s.qty, 0),
      };
    })
    .sort((a, b) => b.total - a.total),
);
const maxTotal = computed(() => Math.max(1, ...ranking.value.map((r) => r.total)));
const best = computed(() => ranking.value[0]);
const popular = computed(() => [...ranking.value].sort((a, b) => b.qty - a.qty)[0]);
const trend = computed(() => {
  let a = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toLocaleDateString('en-CA');
    const ss = sales.value.filter((s) => s.date === ds);
    a.push({
      date: ds.slice(8),
      value: ss.reduce((a, s) => a + s.qty * s.price, 0),
      c: ss.reduce((a, s) => a + contribution(s.price, s.cost, s.fee, s.extra) * s.qty, 0),
    });
  }
  return a;
});
const filteredIngredients = computed(() =>
  store.ingredients.filter((i) => i.name.toLowerCase().includes(search.value.toLowerCase())),
);
const filteredRecipes = computed(() =>
  store.recipes.filter((i) => i.name.toLowerCase().includes(search.value.toLowerCase())),
);
const simResult = computed(() => {
  try {
    return {
      price: suggested(cost(selected.value), selected.value.extra, simFee.value, target.value),
      error: '',
    };
  } catch (e: any) {
    return { price: 0, error: e.message };
  }
});
function navigate(p: string) {
  router.push(p);
  search.value = '';
  editRecipe.value = null;
  mobile.value = false;
}
function openIngredient(i?: any) {
  form.value = i
    ? clone(i)
    : {
        name: '',
        category: 'Proteínas',
        unit: 'kg',
        amount: 1,
        price: 0,
        supplier: '',
        history: [],
      };
  error.value = '';
  modal.value = 'ingredient';
}
function saveIngredient() {
  let f = form.value;
  if (!f.name.trim() || !(f.amount > 0) || !(f.price > 0)) {
    error.value = 'Preencha nome, quantidade e preço maiores que zero.';
    return;
  }
  const old = store.ingredients.find((i) => i.id === f.id);
  if (old && old.unit !== f.unit && store.recipes.some((r) => r.items.some((i) => i.id === f.id))) {
    error.value =
      'Este insumo está em uso. Mantenha a unidade de compra para preservar as receitas.';
    return;
  }
  if (!old || old.price !== f.price || old.amount !== f.amount || old.unit !== f.unit)
    f.history.push({ date: today(), price: f.price, amount: f.amount, unit: f.unit });
  if (old) Object.assign(old, clone(f));
  else store.ingredients.push({ ...clone(f), id: Date.now() });
  modal.value = '';
  notify('Insumo salvo. Os custos atuais foram recalculados.');
}
function openRecipe(r?: any) {
  editRecipe.value = r
    ? clone(r)
    : {
        name: '',
        category: 'Hambúrgueres',
        price: 25,
        fee: 12,
        extra: 0,
        yield: 1,
        items: [],
        color: '#b5cdb5',
      };
  error.value = '';
}
function addItem() {
  if (editRecipe.value.items.some((i: any) => i.id === ingredientToAdd.value)) return;
  editRecipe.value.items.push({ id: ingredientToAdd.value, qty: 1 });
}
function saveRecipe() {
  const r = editRecipe.value;
  try {
    if (
      !r.name.trim() ||
      !r.items.length ||
      !(r.price > 0) ||
      r.extra < 0 ||
      r.fee < 0 ||
      r.fee >= 100
    )
      throw Error('Revise nome, ingredientes, preço, despesas e taxa (0 a 99,99%).');
    cost(r);
    const old = store.recipes.find((i) => i.id === r.id);
    if (old) Object.assign(old, clone(r));
    else store.recipes.push({ ...clone(r), id: Date.now() });
    editRecipe.value = null;
    notify('Ficha técnica salva.');
  } catch (e: any) {
    error.value = e.message;
  }
}
const draftCost = computed(() => {
  try {
    return editRecipe.value ? cost(editRecipe.value) : 0;
  } catch {
    return 0;
  }
});
function openSale() {
  form.value = {
    recipeId: store.recipes[0].id,
    qty: 1,
    date: today(),
    price: store.recipes[0].price,
  };
  error.value = '';
  modal.value = 'sale';
}
function saleRecipeChange() {
  form.value.price = store.recipes.find((r) => r.id === form.value.recipeId)?.price || 0;
}
function saveSale() {
  const f = form.value,
    r = store.recipes.find((r) => r.id === f.recipeId);
  if (!r || !Number.isInteger(f.qty) || f.qty <= 0 || f.price <= 0 || !f.date || f.date > today()) {
    error.value = 'Informe quantidade inteira positiva, preço positivo e data até hoje.';
    return;
  }
  store.sales.push({
    ...clone(f),
    id: Date.now(),
    name: r.name,
    cost: cost(r),
    fee: r.fee,
    extra: r.extra,
  });
  modal.value = '';
  notify('Venda registrada com o custo atual preservado.');
}
function selectSimulation() {
  simPrice.value = selected.value.price;
  simFee.value = selected.value.fee;
}
const lifecycle = new AbortController();
onMounted(() => {
  const ctx = (document as any).modelContext;
  if (ctx?.registerTool)
    try {
      Promise.resolve(
        ctx.registerTool(
          {
            name: 'get_recipe_costs',
            description:
              'Consulta os custos atuais e a contribuição estimada das fichas técnicas da demonstração.',
            inputSchema: { type: 'object', properties: {}, additionalProperties: false },
            annotations: { readOnlyHint: true },
            execute: (input: any) => {
              if (!input || Object.keys(input).length) throw Error('Nenhum parâmetro é aceito.');
              return store.recipes.map((r) => ({
                name: r.name,
                cost: cost(r),
                price: r.price,
                contribution: margin(r),
              }));
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
});
onUnmounted(() => {
  lifecycle.abort();
  clearTimeout(toastTimer);
});
</script>

<template>
  <div class="app-shell">
    <aside :class="['sidebar', { open: mobile }]">
      <a class="brand" href="#/app" @click.prevent="navigate('/app')"
        ><span class="brand-icon"><ChefHat :size="23" /></span>prato<span class="brand-light"
          >certo</span
        ><span class="brand-dot">.</span></a
      >
      <div class="workspace">
        <span class="workspace-avatar">C</span>
        <div><strong>Cozinha do Gregory</strong><small>Meu estabelecimento</small></div>
      </div>
      <span class="nav-caption">GESTÃO DA COZINHA</span>
      <nav>
        <button
          v-for="n in nav"
          :key="n.path"
          :class="{ active: route.path === n.path }"
          @click="navigate(n.path)"
        >
          <component :is="n.icon" :size="19" />{{ n.label
          }}<span v-if="route.path === n.path" class="active-dot"></span>
        </button>
      </nav>
      <div class="sidebar-tip">
        <span class="tip-icon"><TrendingUp :size="20" /></span
        ><strong>Cada ingrediente conta.</strong>
        <p>Preços atualizados, decisões mais certeiras.</p>
        <button @click="navigate('/insumos')">
          Revisar meus insumos <ArrowUpRight :size="16" />
        </button>
      </div>
      <a class="website-back" href="#/">← Voltar ao site</a>
      <div class="profile">
        <span class="profile-avatar">G</span>
        <div><strong>Gregory</strong><small>Proprietário</small></div>
        <span class="version">MVP</span>
      </div>
    </aside>
    <div class="main-shell">
      <header class="topbar">
        <div class="breadcrumb">
          <button
            class="mobile-toggle icon-button"
            aria-label="Abrir navegação"
            @click="mobile = !mobile"
          >
            <Menu /></button
          ><span>Minha cozinha</span><span class="slash">/</span
          ><strong>{{ nav.find((n) => n.path === route.path)?.label }}</strong>
        </div>
        <span class="demo-badge"><span></span>Ambiente de demonstração</span>
      </header>
      <main>
        <div class="page-title">
          <div>
            <div class="eyebrow">
              {{ route.path === '/app' ? 'COZINHA EM NÚMEROS' : 'SUA OPERAÇÃO, ORGANIZADA' }}
            </div>
            <h1>
              {{
                editRecipe
                  ? editRecipe.id
                    ? 'Editar ficha técnica'
                    : 'Nova ficha técnica'
                  : route.path === '/app'
                    ? 'Uma visão clara do seu negócio.'
                    : nav.find((n) => n.path === route.path)?.label
              }}
            </h1>
            <p>
              {{
                route.path === '/app'
                  ? 'Entenda o que vende, o que custa e o que realmente sobra.'
                  : route.path === '/insumos'
                    ? 'O custo de cada prato começa aqui.'
                    : route.path === '/receitas'
                      ? 'Ingredientes na medida. Custo por porção na ponta do lápis.'
                      : route.path === '/simulador'
                        ? 'Encontre um preço que faça sentido para a sua cozinha.'
                        : 'Acompanhe suas vendas e preserve o custo de cada lançamento.'
              }}
            </p>
          </div>
          <div class="title-actions">
            <select
              v-if="route.path === '/app' || route.path === '/vendas'"
              v-model="period"
              aria-label="Período"
            >
              <option value="30">Últimos 30 dias</option>
              <option value="7">Últimos 7 dias</option>
              <option value="1">Hoje</option></select
            ><button
              v-if="route.path === '/app' || route.path === '/vendas'"
              class="primary"
              @click="openSale"
            >
              <Plus :size="17" />Registrar venda</button
            ><button v-if="route.path === '/insumos'" class="primary" @click="openIngredient()">
              <Plus :size="17" />Novo insumo</button
            ><button
              v-if="route.path === '/receitas' && !editRecipe"
              class="primary"
              @click="openRecipe()"
            >
              <Plus :size="17" />Nova ficha
            </button>
          </div>
        </div>
        <template v-if="route.path === '/app'">
          <div class="stats">
            <article class="stat">
              <div class="stat-label">Receita de vendas <ReceiptText :size="18" /></div>
              <strong>{{ money(revenue) }}</strong
              ><span>{{ sold }} porções vendidas no período</span>
            </article>
            <article class="stat featured">
              <div class="stat-label">Contribuição total <TrendingUp :size="18" /></div>
              <strong>{{ money(totalContribution) }}</strong
              ><span>Para despesas fixas e resultado</span>
            </article>
            <article class="stat">
              <div class="stat-label">Margem de contribuição <Calculator :size="18" /></div>
              <strong>{{ pct(revenue ? (totalContribution / revenue) * 100 : 0) }}</strong
              ><span>Sobre a receita do período</span>
            </article>
            <article class="stat">
              <div class="stat-label">Contribuição por porção <ChefHat :size="18" /></div>
              <strong>{{ money(sold ? totalContribution / sold : 0) }}</strong
              ><span>Média ponderada pelas vendas</span>
            </article>
          </div>
          <div class="dashboard-grid">
            <section class="panel chart-panel">
              <div class="panel-title">
                <div>
                  <h2>Vendas e contribuição</h2>
                  <p>O movimento da sua cozinha, dia a dia</p>
                </div>
                <span class="muted-label">14 dias</span>
              </div>
              <div class="legend">
                <span><i class="legend-green"></i>Receita de vendas</span
                ><span><i class="legend-lime"></i>Contribuição</span>
              </div>
              <div class="chart">
                <div class="chart-y">
                  <span>{{ money(Math.max(1, ...trend.map((t) => t.value))) }}</span
                  ><span>{{ money(Math.max(1, ...trend.map((t) => t.value)) / 2) }}</span
                  ><span>R$ 0</span>
                </div>
                <div class="bars">
                  <div
                    class="bar-group"
                    v-for="(t, index) in trend"
                    :key="index"
                    :title="`${t.date}: receita ${money(t.value)}, contribuição ${money(t.c)}`"
                  >
                    <div class="bar-track">
                      <div
                        class="bar revenue-bar"
                        :style="{
                          height: (t.value / Math.max(1, ...trend.map((t) => t.value))) * 100 + '%',
                        }"
                      ></div>
                      <div
                        class="bar contribution-bar"
                        :style="{
                          height:
                            (Math.max(0, t.c) / Math.max(1, ...trend.map((t) => t.value))) * 100 +
                            '%',
                        }"
                      ></div>
                    </div>
                    <span>{{ t.date }}</span>
                  </div>
                </div>
              </div>
              <div class="chart-note">Valores estimados a partir das vendas registradas.</div>
            </section>
            <section class="insight">
              <div class="insight-tag"><TrendingUp :size="16" />UM OLHAR ALÉM DAS VENDAS</div>
              <h2>Vender mais nem sempre<br />é render mais.</h2>
              <p v-if="sold && best?.id !== popular?.id">
                O <strong>{{ popular?.name }}</strong> lidera em vendas. Mas o
                <strong>{{ best?.name }}</strong> deixa mais dinheiro na cozinha.
              </p>
              <p v-else>
                Acompanhe quantidade vendida e contribuição total para entender o papel de cada
                prato.
              </p>
              <div class="insight-comparison" v-for="r in [popular, best]" :key="r?.id">
                <span
                  >{{ r?.name }}<small>{{ r?.qty }} porções</small></span
                ><strong>{{ money(r?.total || 0) }}<small>contribuição</small></strong>
              </div>
              <button @click="navigate('/simulador')">
                Revisar minha precificação <ArrowRight :size="17" />
              </button>
            </section>
          </div>
          <section class="panel ranking">
            <div class="panel-title">
              <div>
                <h2>Seu cardápio, por resultado</h2>
                <p>Compare popularidade e contribuição no período</p>
              </div>
              <button class="text-button" @click="navigate('/receitas')">
                Ver fichas técnicas <ArrowUpRight :size="16" />
              </button>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>PRATO</th>
                    <th>PORÇÕES VENDIDAS</th>
                    <th>PREÇO ATUAL</th>
                    <th>CONTRIBUIÇÃO TOTAL</th>
                    <th>PARTICIPAÇÃO NO RESULTADO</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in ranking" :key="r.id">
                    <td>
                      <div class="dish-name">
                        <span class="dish-number">0{{ i + 1 }}</span
                        ><span class="dish-avatar" :style="{ background: r.color }"
                          ><ChefHat :size="20" /></span
                        ><strong>{{ r.name }}</strong>
                      </div>
                    </td>
                    <td>{{ r.qty }} <span class="cell-muted">porções</span></td>
                    <td>{{ money(r.price) }}</td>
                    <td class="green-value">{{ money(r.total) }}</td>
                    <td>
                      <div class="progress-cell">
                        <div>
                          <span
                            :style="{ width: Math.max(0, (r.total / maxTotal) * 100) + '%' }"
                          ></span>
                        </div>
                        {{ pct(totalContribution ? (r.total / totalContribution) * 100 : 0) }}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <div class="notice">
            <Info :size="17" /><span
              >A contribuição ainda precisa cobrir aluguel, salários e outras despesas fixas. Ela
              não representa lucro líquido.</span
            >
          </div>
        </template>
        <template v-if="route.path === '/insumos'"
          ><section class="panel">
            <div class="list-toolbar">
              <div class="search">
                <Search :size="18" /><input
                  v-model="search"
                  placeholder="Buscar insumo pelo nome"
                  aria-label="Buscar insumo"
                />
              </div>
              <span class="muted-label">{{ filteredIngredients.length }} insumos</span>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>INSUMO / FORNECEDOR</th>
                    <th>CATEGORIA</th>
                    <th>COMPRA</th>
                    <th>PREÇO DE COMPRA</th>
                    <th>CUSTO BASE</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="i in filteredIngredients" :key="i.id">
                    <td>
                      <strong>{{ i.name }}</strong
                      ><small class="block-muted">{{ i.supplier || 'Sem fornecedor' }}</small>
                    </td>
                    <td>
                      <span class="tag">{{ i.category }}</span>
                    </td>
                    <td>{{ i.amount }} {{ i.unit }}</td>
                    <td>
                      {{ money(i.price)
                      }}<small v-if="i.history.length > 1" class="block-muted"
                        >Anterior: {{ money(i.history[i.history.length - 2].price) }}</small
                      >
                    </td>
                    <td>
                      {{
                        unitCost(i).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })
                      }}
                      / {{ baseUnit(i.unit) }}
                    </td>
                    <td>
                      <button
                        class="icon-button"
                        :aria-label="`Editar ${i.name}`"
                        @click="openIngredient(i)"
                      >
                        <Pencil :size="17" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="!filteredIngredients.length" class="empty">
              Nenhum insumo encontrado. Experimente outro nome ou cadastre um novo.
            </div>
          </section>
          <div class="notice">
            <Info :size="17" />Ao atualizar um preço, as fichas técnicas são recalculadas. Vendas
            anteriores mantêm o custo registrado.
          </div></template
        >
        <template v-if="route.path === '/receitas'">
          <template v-if="!editRecipe"
            ><div class="list-toolbar standalone">
              <div class="search">
                <Search :size="18" /><input
                  v-model="search"
                  placeholder="Buscar ficha técnica"
                  aria-label="Buscar ficha técnica"
                />
              </div>
              <span class="muted-label">{{ filteredRecipes.length }} pratos no cardápio</span>
            </div>
            <div class="recipe-grid">
              <article class="panel recipe-card" v-for="r in filteredRecipes" :key="r.id">
                <div class="recipe-card-top">
                  <span class="large-dish" :style="{ background: r.color }"
                    ><ChefHat :size="30" /></span
                  ><span class="tag">{{ r.category }}</span>
                </div>
                <h2>{{ r.name }}</h2>
                <p>{{ r.items.length }} ingredientes · Rende {{ r.yield }} porção(ões)</p>
                <div class="recipe-numbers">
                  <div>
                    <span>Custo por porção</span><strong>{{ money(cost(r)) }}</strong>
                  </div>
                  <div>
                    <span>Preço de venda</span><strong>{{ money(r.price) }}</strong>
                  </div>
                </div>
                <div class="recipe-margin">
                  <span>Contribuição por porção</span
                  ><strong
                    >{{ money(margin(r)) }}
                    <small>({{ pct((margin(r) / r.price) * 100) }})</small></strong
                  >
                </div>
                <button class="secondary full" @click="openRecipe(r)">
                  Abrir ficha técnica <ArrowRight :size="17" />
                </button>
              </article>
            </div>
            <div v-if="!filteredRecipes.length" class="empty">
              Nenhuma ficha encontrada.
            </div></template
          >
          <div v-else class="editor-grid">
            <section class="panel form-panel">
              <button class="text-button" @click="editRecipe = null">
                <ArrowLeft :size="16" />Voltar às fichas
              </button>
              <h2>Informações do prato</h2>
              <div class="form-grid">
                <label class="span-two"
                  >Nome do prato<input
                    v-model="editRecipe.name"
                    placeholder="Ex.: Hambúrguer da casa" /></label
                ><label>Categoria<input v-model="editRecipe.category" /></label
                ><label
                  >Rendimento em porções<input
                    type="number"
                    min="0.01"
                    step="0.01"
                    v-model.number="editRecipe.yield"
                /></label>
              </div>
              <h2 class="section-space">Ingredientes e embalagem</h2>
              <div class="add-ingredient">
                <select v-model="ingredientToAdd" aria-label="Ingrediente para adicionar">
                  <option v-for="i in store.ingredients" :value="i.id">{{ i.name }}</option></select
                ><button class="secondary" @click="addItem"><Plus :size="16" />Adicionar</button>
              </div>
              <div class="ingredient-line" v-for="(it, index) in editRecipe.items" :key="it.id">
                <span>{{ store.ingredients.find((i) => i.id === it.id)?.name }}</span
                ><input
                  aria-label="Quantidade utilizada"
                  type="number"
                  min="0.01"
                  step="0.01"
                  v-model.number="it.qty"
                /><small>{{ baseUnit(store.ingredients.find((i) => i.id === it.id)?.unit) }}</small
                ><button
                  class="icon-button"
                  aria-label="Remover ingrediente"
                  @click="editRecipe.items.splice(index, 1)"
                >
                  <Trash2 :size="16" />
                </button>
              </div>
              <p class="helper">
                Informe as quantidades totais da receita. Use o rendimento final após o preparo para
                considerar as perdas uma única vez.
              </p>
              <h2 class="section-space">Venda e despesas variáveis</h2>
              <div class="form-grid">
                <label
                  >Preço por porção (R$)<input
                    type="number"
                    min="0.01"
                    step="0.01"
                    v-model.number="editRecipe.price" /></label
                ><label
                  >Taxas sobre a venda (%)<input
                    type="number"
                    min="0"
                    max="99.99"
                    step="0.01"
                    v-model.number="editRecipe.fee" /></label
                ><label
                  >Outras despesas por porção (R$)<input
                    type="number"
                    min="0"
                    step="0.01"
                    v-model.number="editRecipe.extra"
                /></label>
              </div>
              <p class="helper">
                Não repita a embalagem nas despesas se ela já estiver entre os ingredientes.
              </p>
              <p class="error" v-if="error">{{ error }}</p>
              <button class="primary" @click="saveRecipe">
                <Check :size="17" />Salvar ficha técnica
              </button>
            </section>
            <aside class="panel cost-summary">
              <span class="eyebrow">CUSTO DA RECEITA</span>
              <h2>{{ money(draftCost) }}</h2>
              <p>por porção</p>
              <hr />
              <div>
                <span>Receita completa</span
                ><strong>{{ money(draftCost * editRecipe.yield) }}</strong>
              </div>
              <div>
                <span>Rendimento</span><strong>{{ editRecipe.yield }} porções</strong>
              </div>
              <div>
                <span>Contribuição por porção</span
                ><strong>{{
                  money(contribution(editRecipe.price, draftCost, editRecipe.fee, editRecipe.extra))
                }}</strong>
              </div>
              <p class="helper">Estimativa calculada com os preços atuais dos insumos.</p>
            </aside>
          </div>
        </template>
        <template v-if="route.path === '/simulador'"
          ><div class="sim-grid">
            <section class="panel form-panel">
              <h2>Qual prato vamos precificar?</h2>
              <label
                >Ficha técnica<select v-model="simId" @change="selectSimulation">
                  <option v-for="r in store.recipes" :value="r.id">{{ r.name }}</option>
                </select></label
              >
              <div class="sim-cost">
                <span>Custo da ficha / porção</span><strong>{{ money(cost(selected)) }}</strong>
              </div>
              <div class="sim-cost">
                <span>Outras despesas / porção</span><strong>{{ money(selected.extra) }}</strong>
              </div>
              <label class="section-space"
                >Taxas sobre a venda (%)<input
                  type="number"
                  min="0"
                  max="99"
                  v-model.number="simFee"
              /></label>
              <p class="helper">
                Ex.: comissão do delivery e taxa do cartão. Use o total aplicável a esta venda.
              </p>
              <label class="section-space"
                >Margem de contribuição desejada <strong>{{ target }}%</strong
                ><input
                  class="range"
                  type="range"
                  min="5"
                  max="80"
                  step="1"
                  v-model.number="target"
              /></label>
              <div class="range-labels"><span>5%</span><span>80%</span></div>
              <label class="section-space"
                >Preço para comparação (R$)<input
                  type="number"
                  min="0.01"
                  step="0.01"
                  v-model.number="simPrice"
              /></label>
            </section>
            <div>
              <section class="suggestion">
                <span class="insight-tag"><Calculator :size="17" />PREÇO SUGERIDO</span>
                <h2 v-if="!simResult.error">{{ money(simResult.price) }}</h2>
                <p v-else class="error">{{ simResult.error }}</p>
                <p>Para alcançar {{ target }}% de contribuição com os custos e taxas informados.</p>
                <div class="suggestion-detail">
                  <span>Custo + despesas por porção</span
                  ><strong>{{ money(cost(selected) + selected.extra) }}</strong>
                </div>
                <div class="suggestion-detail">
                  <span>Contribuição estimada no preço sugerido</span
                  ><strong>{{
                    money(contribution(simResult.price, cost(selected), simFee, selected.extra))
                  }}</strong>
                </div>
                <button
                  class="lime-button full"
                  :disabled="!!simResult.error"
                  @click="
                    selected.price = simResult.price;
                    selected.fee = simFee;
                    notify('Preço e taxa atualizados na ficha técnica.');
                  "
                >
                  Aplicar preço e taxa à ficha <ArrowRight :size="17" />
                </button>
              </section>
              <section class="panel comparison">
                <h2>E no preço de {{ money(simPrice) }}?</h2>
                <strong
                  :class="{
                    negative: contribution(simPrice, cost(selected), simFee, selected.extra) < 0,
                  }"
                  >{{
                    money(contribution(simPrice, cost(selected), simFee, selected.extra))
                  }}</strong
                >
                <p>
                  de contribuição por porção ·
                  {{
                    pct(
                      simPrice > 0
                        ? (contribution(simPrice, cost(selected), simFee, selected.extra) /
                            simPrice) *
                            100
                        : 0,
                    )
                  }}
                </p>
                <p
                  v-if="contribution(simPrice, cost(selected), simFee, selected.extra) < 0"
                  class="error"
                >
                  Este preço não cobre os custos e despesas variáveis.
                </p>
              </section>
            </div>
          </div>
          <div class="notice">
            <Info :size="17" />Preço sugerido = (custo + despesas por porção) ÷ (1 − taxas − margem
            desejada). A simulação não garante demanda ou lucro.
          </div></template
        >
        <template v-if="route.path === '/vendas'"
          ><section class="panel">
            <div class="panel-title">
              <div>
                <h2>Vendas registradas</h2>
                <p>{{ sold }} porções · {{ money(revenue) }} em receita</p>
              </div>
              <span class="tag">Custos históricos preservados</span>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>DATA</th>
                    <th>PRATO</th>
                    <th>QUANTIDADE</th>
                    <th>PREÇO UNITÁRIO</th>
                    <th>RECEITA</th>
                    <th>CONTRIBUIÇÃO</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="s in sales" :key="s.id">
                    <td>{{ s.date.split('-').reverse().join('/') }}</td>
                    <td>
                      <strong>{{ s.name }}</strong>
                    </td>
                    <td>{{ s.qty }} porções</td>
                    <td>{{ money(s.price) }}</td>
                    <td>{{ money(s.price * s.qty) }}</td>
                    <td class="green-value">
                      {{ money(contribution(s.price, s.cost, s.fee, s.extra) * s.qty) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="empty" v-if="!sales.length">
              Nenhuma venda neste período. Registre uma venda para começar.
            </div>
          </section></template
        >
        <footer>
          <a href="#/" class="footer-brand">pratocerto.</a><a href="#/termos">Termos</a
          ><a href="#/privacidade">Privacidade</a
          ><span
            >Dados fictícios para explorar o MVP. Alterações duram até recarregar a página.</span
          >
        </footer>
      </main>
    </div>
    <div class="modal-backdrop" v-if="modal" @click.self="modal = ''">
      <section
        class="modal"
        role="dialog"
        aria-modal="true"
        :aria-label="modal === 'ingredient' ? 'Cadastro de insumo' : 'Registrar venda'"
        @keydown.esc="modal = ''"
      >
        <div class="panel-title">
          <h2>
            {{
              modal === 'ingredient'
                ? form.id
                  ? 'Editar insumo'
                  : 'Novo insumo'
                : 'Registrar venda'
            }}
          </h2>
          <button class="icon-button" aria-label="Fechar" @click="modal = ''">
            <X :size="22" />
          </button>
        </div>
        <form @submit.prevent="modal === 'ingredient' ? saveIngredient() : saveSale()">
          <template v-if="modal === 'ingredient'"
            ><div class="form-grid">
              <label class="span-two"
                >Nome do insumo<input
                  autofocus
                  required
                  v-model="form.name"
                  placeholder="Ex.: Queijo cheddar" /></label
              ><label
                >Categoria<select v-model="form.category">
                  <option>Proteínas</option>
                  <option>Panificação</option>
                  <option>Laticínios</option>
                  <option>Molhos</option>
                  <option>Embalagens</option>
                  <option>Hortifruti</option>
                  <option>Outros</option>
                </select></label
              ><label
                >Unidade de compra<select v-model="form.unit">
                  <option>kg</option>
                  <option>g</option>
                  <option>L</option>
                  <option>ml</option>
                  <option>un</option>
                </select></label
              ><label
                >Quantidade na compra<input
                  type="number"
                  min="0.001"
                  step="0.001"
                  required
                  v-model.number="form.amount" /></label
              ><label
                >Preço total da compra (R$)<input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  v-model.number="form.price" /></label
              ><label class="span-two"
                >Fornecedor<input v-model="form.supplier" placeholder="Opcional"
              /></label>
            </div>
            <p class="helper">
              Exemplo: pacote de 50 caixas por R$ 60 → unidade “un”, quantidade 50, preço 60.
            </p>
            <div v-if="form.history?.length" class="history">
              <strong>Histórico de preço de compra</strong>
              <div v-for="(h, index) in form.history" :key="index">
                <span
                  >{{ h.date.split('-').reverse().join('/') }} · {{ h.amount }} {{ h.unit }}</span
                ><span>{{ money(h.price) }}</span>
              </div>
            </div></template
          ><template v-else
            ><label
              >Prato<select v-model="form.recipeId" @change="saleRecipeChange">
                <option v-for="r in store.recipes" :value="r.id">{{ r.name }}</option>
              </select></label
            >
            <div class="form-grid section-space">
              <label
                >Quantidade de porções<input
                  type="number"
                  min="1"
                  step="1"
                  required
                  v-model.number="form.qty" /></label
              ><label
                >Preço por porção (R$)<input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  v-model.number="form.price" /></label
              ><label class="span-two"
                >Data da venda<input type="date" required :max="today()" v-model="form.date"
              /></label>
            </div>
            <p class="helper">
              O lançamento usa os custos e taxas atuais da ficha, inclusive para datas anteriores.
              Esses valores ficam preservados nesta venda.
            </p></template
          >
          <p class="error" v-if="error" role="alert">{{ error }}</p>
          <div class="modal-actions">
            <button type="button" class="secondary" @click="modal = ''">Cancelar</button
            ><button type="submit" class="primary">
              <Check :size="17" />{{ modal === 'ingredient' ? 'Salvar insumo' : 'Registrar venda' }}
            </button>
          </div>
        </form>
      </section>
    </div>
    <div class="toast" v-if="toast" role="status"><Check :size="19" />{{ toast }}</div>
  </div>
</template>
