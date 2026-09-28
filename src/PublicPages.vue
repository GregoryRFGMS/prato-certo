<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ChefHat,
  ArrowRight,
  ArrowUpRight,
  Check,
  Carrot,
  BookOpen,
  ChartNoAxesCombined,
  Calculator,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldCheck,
  LoaderCircle,
  LogOut,
  Mail,
  Info,
  Menu,
  X,
} from 'lucide-vue-next';
import { api } from './api';
import { terms, privacy, legalVersion } from './legal';
const route = useRoute(),
  router = useRouter();
const menu = ref(false),
  showPassword = ref(false),
  busy = ref(false),
  notice = ref(''),
  error = ref(''),
  availability = ref<'checking' | 'ready' | 'unavailable'>('checking'),
  user = ref<any>(null),
  resetEnabled = ref(false),
  registrationEnabled = ref(false);
const name = ref(''),
  email = ref(''),
  kitchen = ref(''),
  password = ref(''),
  confirmation = ref(''),
  accepted = ref(false);
const path = computed(() => route.path);
const legal = computed(() => (path.value === '/termos' ? terms : privacy));
const auth = computed(() =>
  ['/login', '/cadastro', '/recuperar-senha', '/redefinir-senha'].includes(path.value),
);
const legalPage = computed(() => ['/termos', '/privacidade'].includes(path.value));
const title = computed(
  () =>
    ({
      '/login': 'Bom ter você de volta.',
      '/cadastro': 'Sua cozinha começa aqui.',
      '/recuperar-senha': 'Vamos recuperar seu acesso.',
      '/redefinir-senha': 'Escolha uma nova senha.',
    })[path.value],
);
const passwordRules = computed(() => [
  { label: 'Pelo menos 12 caracteres', ok: password.value.length >= 12 },
  { label: 'Até 128 caracteres', ok: password.value.length <= 128 },
  {
    label: 'Confirmação igual à senha',
    ok: password.value.length > 0 && password.value === confirmation.value,
  },
]);
const offline = computed(() => availability.value === 'unavailable');
async function checkService() {
  availability.value = 'checking';
  try {
    const health = await api('/auth/status');
    if (health.service !== 'prato-certo-auth') throw Error();
    availability.value = 'ready';
    resetEnabled.value = health.password_reset;
    registrationEnabled.value = health.registration;
  } catch {
    availability.value = 'unavailable';
  }
}
onMounted(async () => {
  if (auth.value || path.value === '/conta') await checkService();
  if (path.value === '/conta' && availability.value === 'ready') {
    try {
      user.value = await api('/auth/me');
    } catch (e: any) {
      if (e.status === 401) {
        router.replace('/login');
        return;
      }
      error.value = e.message;
    }
  }
});
async function submit() {
  error.value = '';
  notice.value = '';
  if (availability.value !== 'ready') return;
  busy.value = true;
  try {
    if (path.value === '/login') {
      user.value = await api('/auth/login', 'POST', {
        email: email.value,
        password: password.value,
      });
      password.value = '';
      await router.push('/conta');
    } else if (path.value === '/cadastro') {
      if (!accepted.value) throw Error('Aceite os Termos de Serviço para continuar.');
      if (!passwordRules.value.every((r) => r.ok))
        throw Error('Revise os requisitos e a confirmação da senha.');
      await api('/auth/register', 'POST', {
        name: name.value,
        email: email.value,
        kitchen: kitchen.value,
        password: password.value,
        accepted_terms: true,
        terms_version: legalVersion,
      });
      password.value = '';
      confirmation.value = '';
      await router.push('/conta');
    } else if (path.value === '/recuperar-senha') {
      const res = await api('/auth/forgot-password', 'POST', { email: email.value });
      notice.value = res.message;
    } else {
      if (!passwordRules.value.every((r) => r.ok))
        throw Error('Revise a nova senha e sua confirmação.');
      const token = String(route.query.token || '');
      if (!token) throw Error('Este link está incompleto. Solicite um novo link de recuperação.');
      await api('/auth/reset-password', 'POST', { token, password: password.value });
      password.value = '';
      confirmation.value = '';
      notice.value = 'Senha atualizada. Entre novamente com sua nova senha.';
    }
  } catch (e: any) {
    error.value = e.message || 'Não foi possível concluir. Tente novamente.';
  } finally {
    busy.value = false;
  }
}
async function logout() {
  busy.value = true;
  error.value = '';
  try {
    await api('/auth/logout', 'POST', {});
    user.value = null;
    router.push('/login');
  } catch (e: any) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
function anchor(id: string) {
  menu.value = false;
  document.getElementById(id)?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  });
}
const faqs = [
  {
    q: 'Preciso cadastrar tudo antes de testar?',
    a: 'Não. A demonstração já vem com ingredientes, receitas e vendas fictícias. Você pode experimentar o fluxo e observar como os custos mudam.',
  },
  {
    q: 'O sistema calcula meu lucro líquido?',
    a: 'Nesta etapa, calculamos a margem de contribuição: o que resta depois de ingredientes, embalagens e despesas variáveis. Aluguel, salários e outras despesas fixas ainda precisam ser cobertos.',
  },
  {
    q: 'Já existe integração com delivery ou PDV?',
    a: 'Ainda não. O MVP usa lançamentos manuais. Integrações e baixa automática de estoque fazem parte de uma etapa futura.',
  },
  {
    q: 'A demonstração salva minhas alterações?',
    a: 'Não. As alterações da demonstração são reiniciadas ao recarregar a página. As contas dependem da conexão com o serviço de autenticação, e os módulos de gestão ainda não estão ligados a um banco permanente.',
  },
];
</script>
<template>
  <div class="public-site">
    <header class="public-header">
      <a class="brand" href="#/"
        ><span class="brand-icon"><ChefHat :size="23" /></span>prato<span class="brand-light"
          >certo</span
        ><span class="brand-dot">.</span></a
      >
      <nav v-if="path === '/'" class="public-nav" :class="{ expanded: menu }">
        <button @click="anchor('recursos')">O que você controla</button
        ><button @click="anchor('como-funciona')">Como funciona</button
        ><button @click="anchor('duvidas')">Dúvidas</button>
      </nav>
      <div class="public-header-actions">
        <a class="login-link" href="#/login">Entrar</a
        ><a class="primary" href="#/cadastro">Criar conta <ArrowUpRight :size="16" /></a
        ><button
          v-if="path === '/'"
          class="icon-button public-menu"
          :aria-expanded="menu"
          aria-label="Menu"
          @click="menu = !menu"
        >
          <X v-if="menu" /><Menu v-else />
        </button>
      </div>
    </header>
    <main v-if="path === '/'" class="landing-main">
      <section class="landing-hero">
        <div class="hero-copy">
          <div class="landing-kicker"><span></span>PARA QUEM VIVE A COZINHA</div>
          <h1>Sabor no prato.<br /><span>Clareza na conta.</span></h1>
          <p>
            Descubra quanto custa cada receita, encontre seu preço e veja o que sobra de cada venda.
            Do primeiro ingrediente à última porção.
          </p>
          <div class="hero-actions">
            <a class="primary large-button" href="#/app"
              >Explorar demonstração <ArrowRight :size="18" /></a
            ><a class="hero-secondary" href="#/cadastro"
              >Conhecer o cadastro <ArrowUpRight :size="17"
            /></a>
          </div>
          <div class="hero-assurances">
            <span><Check :size="15" />Sem cartão</span
            ><span><Check :size="15" />Dados de exemplo</span
            ><span><Check :size="15" />Feito para pequenas cozinhas</span>
          </div>
        </div>
        <div class="hero-visual">
          <img
            src="/cozinha-hero.png"
            width="1448"
            height="1086"
            alt="Hambúrguer artesanal e ingredientes separados em uma bancada de preparo"
            fetchpriority="high"
          /><span class="photo-label">CADA INGREDIENTE TEM SEU PESO.</span>
          <div class="hero-cost-card">
            <div class="mini-card-heading">
              <span><ChefHat :size="18" />Hambúrguer da casa</span
              ><small>Exemplo ilustrativo</small>
            </div>
            <div class="mini-cost-row"><span>Preço de venda</span><strong>R$ 30,00</strong></div>
            <div class="mini-cost-row">
              <span>Ingredientes + embalagem</span><span>− R$ 12,90</span>
            </div>
            <div class="mini-cost-row">
              <span>Taxas e outras despesas</span><span>− R$ 5,10</span>
            </div>
            <div class="mini-card-total">
              <span>Contribuição por porção<small>Antes das despesas fixas</small></span
              ><strong>R$ 12,00<small>40% da venda</small></strong>
            </div>
          </div>
        </div>
      </section>
      <section class="audience-strip">
        <span>UMA FERRAMENTA PARA SUA ROTINA</span><strong>Food trucks</strong><i></i
        ><strong>Dark kitchens</strong><i></i><strong>Pequenas cozinhas</strong>
      </section>
      <section id="recursos" class="landing-section">
        <div class="section-heading">
          <div>
            <span class="landing-kicker">MENOS ACHISMO. MAIS VISIBILIDADE.</span>
            <h2>Você cuida do preparo.<br />Enxergue também os números.</h2>
          </div>
          <p>Organize o que entra na receita e entenda o que sai de cada venda.</p>
        </div>
        <div class="features-grid">
          <article>
            <span class="feature-icon"><Carrot :size="26" /></span
            ><span class="feature-number">01 / INSUMOS</span>
            <h3>O preço mudou?<br />Seu custo acompanha.</h3>
            <p>
              Cadastre a compra em quilos, litros ou unidades. Atualize o valor e veja o impacto nas
              fichas que usam aquele ingrediente.
            </p>
            <a href="#/insumos">Conhecer os insumos <ArrowRight :size="16" /></a>
          </article>
          <article>
            <span class="feature-icon"><BookOpen :size="26" /></span
            ><span class="feature-number">02 / FICHAS TÉCNICAS</span>
            <h3>Uma receita.<br />Cada porção calculada.</h3>
            <p>
              Defina ingredientes, quantidades e rendimento. Inclua a embalagem e descubra quanto
              custa servir uma porção.
            </p>
            <a href="#/receitas">Explorar as fichas <ArrowRight :size="16" /></a>
          </article>
          <article>
            <span class="feature-icon"><ChartNoAxesCombined :size="26" /></span
            ><span class="feature-number">03 / PRECIFICAÇÃO E VENDAS</span>
            <h3>Popular no cardápio.<br />E bom para a margem?</h3>
            <p>
              Simule preços, considere taxas e compare os pratos pela contribuição que geram, além
              da quantidade vendida.
            </p>
            <a href="#/simulador">Simular um preço <ArrowRight :size="16" /></a>
          </article>
        </div>
      </section>
      <section id="como-funciona" class="how-section">
        <div class="how-copy">
          <span class="landing-kicker">DA COMPRA À DECISÃO</span>
          <h2>O caminho entre<br />“acho que sobra”<br />e <em>“agora eu sei”.</em></h2>
          <p>
            Comece com um único prato. Você não precisa organizar o cardápio inteiro de uma vez.
          </p>
          <a href="#/app" class="lime-button large-button"
            >Testar com um cardápio pronto <ArrowRight :size="18"
          /></a>
        </div>
        <ol class="steps">
          <li>
            <span>1</span>
            <div>
              <h3>Conte quanto você paga</h3>
              <p>
                Informe o valor e a quantidade da compra. Um pacote de 50 embalagens por R$ 60 vira
                R$ 1,20 por unidade.
              </p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <h3>Monte a receita como você prepara</h3>
              <p>
                Adicione ingredientes, quantidades e rendimento final. A ficha mostra o custo por
                porção.
              </p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <h3>Encontre um preço e acompanhe</h3>
              <p>
                Considere as taxas da venda, simule a margem e compare o resultado dos pratos
                vendidos.
              </p>
            </div>
          </li>
        </ol>
      </section>
      <section id="duvidas" class="landing-section faq-section">
        <div>
          <span class="landing-kicker">ANTES DE COMEÇAR</span>
          <h2>Do tamanho da<br />sua dúvida.</h2>
          <p>O que esta primeira versão faz — e o que ainda vem depois.</p>
        </div>
        <div class="faq-list">
          <details v-for="faq in faqs" :key="faq.q">
            <summary>{{ faq.q }}<span>+</span></summary>
            <p>{{ faq.a }}</p>
          </details>
        </div>
      </section>
      <section class="landing-cta">
        <span class="landing-kicker">COMECE POR UMA RECEITA</span>
        <h2>Seu próximo prato pode ter<br />uma conta mais clara.</h2>
        <p>
          Explore o Prato Certo com um cardápio de exemplo. Sem cobrança ou assinatura nesta
          demonstração.
        </p>
        <a class="primary large-button" href="#/app"
          >Abrir demonstração <ArrowRight :size="18"
        /></a>
      </section>
    </main>
    <main v-else-if="auth" class="auth-main">
      <section class="auth-story">
        <a href="#/" class="auth-back"><ArrowLeft :size="17" />Voltar ao site</a>
        <div class="auth-story-content">
          <span class="landing-kicker">SUA COZINHA MERECE CLAREZA</span>
          <h2>Uma boa receita<br />também precisa<br />de uma boa conta.</h2>
          <p>
            Organize insumos, conheça o custo por porção e acompanhe o resultado do seu cardápio.
          </p>
          <div class="auth-story-features">
            <span><Check :size="17" />Custos de receitas em um só lugar</span
            ><span><Check :size="17" />Precificação com taxas e despesas</span
            ><span><Check :size="17" />Vendas e contribuição lado a lado</span>
          </div>
        </div>
        <div class="auth-story-bottom">
          <ChefHat :size="24" /><span
            >Feito para quem transforma<br />ingredientes em negócio.</span
          >
        </div>
      </section>
      <section class="auth-form-section">
        <div class="auth-form-inner">
          <span class="landing-kicker">{{
            path === '/cadastro'
              ? 'CRIAR CONTA'
              : path === '/login'
                ? 'ACESSAR O PRATO CERTO'
                : 'SEGURANÇA DA CONTA'
          }}</span>
          <h1>{{ title }}</h1>
          <p class="auth-subtitle">
            {{
              path === '/cadastro'
                ? 'Cadastre você e seu estabelecimento.'
                : path === '/login'
                  ? 'Entre com o e-mail e a senha da sua conta.'
                  : path === '/recuperar-senha'
                    ? 'Informe seu e-mail para receber um link de recuperação.'
                    : 'Use uma senha exclusiva para o Prato Certo.'
            }}
          </p>
          <div v-if="availability === 'checking'" class="auth-state" role="status">
            <LoaderCircle class="spin" :size="18" />Verificando serviço de contas…
          </div>
          <div v-if="offline" class="auth-state" role="status">
            <Info :size="20" />
            <div>
              <strong>Contas ainda não disponíveis nesta prévia</strong>
              <p>
                Você pode conhecer as telas e explorar a demonstração. Nenhuma conta será criada e
                nenhuma senha será enviada enquanto o serviço estiver desconectado.
              </p>
              <button @click="checkService" class="text-button">Tentar conectar novamente</button>
            </div>
          </div>
          <div
            v-if="path === '/cadastro' && availability === 'ready' && !registrationEnabled"
            class="auth-state"
          >
            <Info :size="20" />
            <p>
              Novos cadastros ainda não foram abertos. A identificação do serviço e os documentos
              estão em revisão.
            </p>
          </div>
          <div
            v-if="path === '/recuperar-senha' && availability === 'ready' && !resetEnabled"
            class="auth-state"
          >
            <Mail :size="20" />
            <p>
              A recuperação por e-mail ainda não está disponível. Nenhuma mensagem será enviada.
            </p>
          </div>
          <form @submit.prevent="submit" class="auth-form">
            <template v-if="path === '/cadastro'"
              ><label for="signup-name"
                >Seu nome<input
                  id="signup-name"
                  autocomplete="name"
                  v-model.trim="name"
                  required
                  minlength="2"
                  maxlength="100"
                  placeholder="Como podemos chamar você?" /></label
              ><label for="signup-kitchen"
                >Nome do estabelecimento<input
                  id="signup-kitchen"
                  autocomplete="organization"
                  v-model.trim="kitchen"
                  required
                  minlength="2"
                  maxlength="120"
                  placeholder="Ex.: Cozinha da Vila" /></label></template
            ><label v-if="path !== '/redefinir-senha'" for="auth-email"
              >E-mail<input
                id="auth-email"
                type="email"
                autocomplete="email"
                v-model.trim="email"
                required
                maxlength="254"
                placeholder="voce@exemplo.com" /></label
            ><template v-if="path !== '/recuperar-senha'"
              ><label for="auth-password"
                ><span class="label-with-action"
                  >{{ path === '/redefinir-senha' ? 'Nova senha' : 'Senha'
                  }}<a v-if="path === '/login'" href="#/recuperar-senha"
                    >Esqueci minha senha</a
                  ></span
                ><span class="password-field"
                  ><input
                    id="auth-password"
                    :type="showPassword ? 'text' : 'password'"
                    :autocomplete="path === '/login' ? 'current-password' : 'new-password'"
                    v-model="password"
                    required
                    :minlength="path === '/login' ? 1 : 12"
                    maxlength="128"
                    :placeholder="
                      path === '/login' ? 'Sua senha' : 'Pelo menos 12 caracteres'
                    " /><button
                    class="icon-button"
                    type="button"
                    :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
                    :aria-pressed="showPassword"
                    @click="showPassword = !showPassword"
                  >
                    <EyeOff v-if="showPassword" :size="18" /><Eye
                      v-else
                      :size="18"
                    /></button></span></label
              ><template v-if="path !== '/login'"
                ><label for="auth-confirmation"
                  >Confirme a senha<input
                    id="auth-confirmation"
                    :type="showPassword ? 'text' : 'password'"
                    autocomplete="new-password"
                    v-model="confirmation"
                    required
                    minlength="12"
                    maxlength="128"
                    placeholder="Repita a senha"
                /></label>
                <div class="password-requirements" v-if="password">
                  <span
                    v-for="rule in passwordRules.filter((r) => r.label !== 'Até 128 caracteres')"
                    :class="{ met: rule.ok }"
                    ><Check :size="14" />{{ rule.label }}</span
                  >
                </div></template
              ></template
            ><label v-if="path === '/cadastro'" class="terms-checkbox"
              ><input type="checkbox" v-model="accepted" required /><span
                >Li e aceito os
                <a href="#/termos" target="_blank" rel="noopener">Termos de Serviço</a> e estou
                ciente da
                <a href="#/privacidade" target="_blank" rel="noopener">Política de Privacidade</a
                >.</span
              ></label
            >
            <p class="auth-error" v-if="error" role="alert">{{ error }}</p>
            <p class="auth-success" v-if="notice" role="status">{{ notice }}</p>
            <button
              class="primary full auth-submit"
              type="submit"
              :disabled="
                busy ||
                availability !== 'ready' ||
                (path === '/cadastro' && !registrationEnabled) ||
                (path === '/recuperar-senha' && !resetEnabled)
              "
            >
              <LoaderCircle v-if="busy" class="spin" :size="18" />{{
                busy
                  ? 'Aguarde…'
                  : path === '/cadastro'
                    ? 'Criar minha conta'
                    : path === '/login'
                      ? 'Entrar na minha conta'
                      : path === '/recuperar-senha'
                        ? 'Enviar link de recuperação'
                        : 'Salvar nova senha'
              }}<ArrowRight v-if="!busy" :size="17" />
            </button>
          </form>
          <p class="auth-switch" v-if="path === '/login'">
            Ainda não tem conta? <a href="#/cadastro">Conhecer o cadastro</a>
          </p>
          <p class="auth-switch" v-else>Já tem acesso? <a href="#/login">Voltar para entrar</a></p>
          <div class="auth-divider"><span>ou conheça o produto</span></div>
          <a href="#/app" class="secondary auth-demo"
            >Explorar demonstração sem criar conta <ArrowUpRight :size="17"
          /></a>
        </div>
      </section>
    </main>
    <main v-else-if="legalPage" class="legal-main">
      <a href="#/" class="legal-back"><ArrowLeft :size="16" />Voltar ao site</a>
      <div class="legal-heading">
        <span class="landing-kicker">TRANSPARÊNCIA DO PROJETO</span>
        <h1>{{ path === '/termos' ? 'Termos de Serviço' : 'Política de Privacidade' }}</h1>
        <p>Atualizado em 11 de setembro de 2026 · Versão de revisão</p>
      </div>
      <div class="legal-draft">
        <ShieldCheck :size="22" />
        <div>
          <strong>Minuta para revisão antes do lançamento</strong>
          <p>
            Faltam a identificação do responsável e o canal de atendimento. Este documento descreve
            a prévia atual e não substitui a revisão jurídica da operação definitiva.
          </p>
        </div>
      </div>
      <div class="legal-layout">
        <aside class="legal-index">
          <span>NESTA PÁGINA</span
          ><button v-for="(section, index) in legal" @click="anchor('legal-' + index)">
            {{ section.title }}</button
          ><a :href="path === '/termos' ? '#/privacidade' : '#/termos'"
            >{{ path === '/termos' ? 'Ver Política de Privacidade' : 'Ver Termos de Serviço' }}
            <ArrowUpRight :size="14"
          /></a>
        </aside>
        <article class="legal-content">
          <section v-for="(section, index) in legal" :id="'legal-' + index">
            <h2>{{ section.title }}</h2>
            <p>{{ section.text }}</p>
          </section>
          <div class="legal-reference">
            <h2>Referência para revisão</h2>
            <p>
              O texto deverá ser ajustado às práticas do serviço e à
              <a
                href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709compilado.htm"
                target="_blank"
                rel="noopener"
                >Lei Geral de Proteção de Dados Pessoais</a
              >. As práticas dos fornecedores também devem ser verificadas antes da operação
              pública.
            </p>
          </div>
        </article>
      </div>
    </main>
    <main v-else-if="path === '/conta'" class="account-main">
      <span class="landing-kicker">SEU ACESSO AO PRATO CERTO</span>
      <h1>Minha conta</h1>
      <div v-if="availability === 'checking'" class="auth-state">
        <LoaderCircle class="spin" />Carregando sua conta…
      </div>
      <div v-else-if="offline" class="auth-state">
        O serviço de contas não está conectado nesta versão.
        <a href="#/app">Explorar demonstração</a>
      </div>
      <section v-if="user" class="account-card">
        <div class="account-monogram">{{ user.name?.slice(0, 1) }}</div>
        <h2>Olá, {{ user.name }}.</h2>
        <p>Seu acesso está ativo.</p>
        <dl>
          <div>
            <dt>E-mail</dt>
            <dd>{{ user.email }}</dd>
          </div>
          <div>
            <dt>Estabelecimento</dt>
            <dd>{{ user.kitchen }}</dd>
          </div>
        </dl>
        <div class="auth-state">
          <Info :size="20" />
          <p>
            O cadastro da conta é permanente. Os módulos de gestão ainda estão em demonstração e não
            salvam seus insumos ou vendas na conta.
          </p>
        </div>
        <a href="#/app" class="primary">Explorar a demonstração <ArrowRight :size="17" /></a
        ><button class="text-button logout-button" @click="logout" :disabled="busy">
          <LogOut :size="16" />Sair da conta
        </button>
      </section>
      <p class="auth-error" v-if="error">{{ error }}</p>
    </main>
    <footer class="public-footer">
      <div class="footer-top">
        <a class="brand" href="#/"
          ><span class="brand-icon"><ChefHat :size="22" /></span>prato<span class="brand-light"
            >certo</span
          ><span class="brand-dot">.</span></a
        >
        <p>Da ficha técnica à decisão.<br />Mais clareza para pequenas cozinhas.</p>
        <div class="footer-links">
          <a href="#/app">Demonstração</a><a href="#/login">Entrar</a
          ><a href="#/termos">Termos de Serviço</a
          ><a href="#/privacidade">Política de Privacidade</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 Prato Certo. Projeto em desenvolvimento.</span
        ><span>Feito para quem vive a cozinha.</span>
      </div>
    </footer>
  </div>
</template>
