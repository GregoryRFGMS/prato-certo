<div align="center">
  <img src="public/favicon.svg" width="64" alt="Prato Certo" />
  <h1>Prato Certo</h1>
  <p><strong>Sabor no prato. Clareza na conta.</strong></p>
  <p>Custos de receitas e precificação para food trucks, dark kitchens e pequenas cozinhas.</p>
  <p><a href="#começar-pelo-frontend">Executar</a> · <a href="docs/ARQUITETURA.md">Arquitetura</a> · <a href="backend/README.md">API</a> · <a href="docs/ROADMAP.md">Próximas etapas</a></p>
</div>

---

## O projeto

O Prato Certo ajuda a entender quanto custa uma porção, como o aumento dos insumos afeta o cardápio e quanto cada prato contribui depois dos custos e despesas variáveis.

**Estado atual: MVP demonstrativo.** O frontend funciona com dados fictícios em memória. A API de contas foi implementada no código, mas ainda não foi validada de ponta a ponta nem hospedada. Os módulos de cozinha ainda não possuem persistência.

## Funcionalidades

| Área              | O que está disponível                                           |
| ----------------- | --------------------------------------------------------------- |
| Insumos           | Cadastro, edição, unidade de compra e histórico de preços       |
| Fichas técnicas   | Ingredientes, quantidades, rendimento e custo por porção        |
| Precificação      | Simulação com despesas variáveis, taxas e margem desejada       |
| Vendas            | Lançamentos manuais com custo preservado no momento do registro |
| Dashboard         | Receita, contribuição, popularidade e comparação por período    |
| Apresentação      | Landing page responsiva e navegação para a demonstração         |
| Acesso            | Telas de login, cadastro, recuperação de senha e perfil         |
| API de contas     | Código FastAPI, modelos SQLAlchemy e migration Alembic          |
| Documentos legais | Minutas de termos e privacidade, ainda em revisão               |

> **Contribuição não é lucro líquido.** O valor restante ainda precisa cobrir aluguel, salários e demais despesas fixas.

## Tecnologias

- **Frontend:** Vue 3, Composition API, TypeScript/JavaScript, Vite, Pinia e Vue Router.
- **Interface:** CSS responsivo com tokens próprios e ícones Lucide.
- **Backend preparado:** Python, FastAPI, SQLAlchemy, Alembic e PostgreSQL.
- **Autenticação preparada:** Argon2, sessões opacas em cookie HttpOnly e recuperação por SMTP.
- **Testes:** Node Test Runner e pytest. SQLite é usado somente na suíte isolada de contas.

## Começar pelo frontend

Requisitos: Node.js 20.19+ e npm.

```bash
npm ci
npm run dev
```

Abra a URL apresentada pelo Vite. A landing é a página inicial; a demonstração está em `/#/app`.

```bash
npm test         # Testes das regras de cálculo
npm run build    # Build para dist/
```

No Windows, se o PowerShell bloquear `npm.ps1`, use `npm.cmd ci` e `npm.cmd run dev`, ou execute os comandos no Prompt de Comando.

O frontend pode ser explorado sem iniciar o backend. Quando `/api/auth/status` não está disponível, os formulários de autenticação informam que o serviço está desconectado e não enviam senhas.

## Iniciar a API

Requisitos adicionais: Python 3.12+ e PostgreSQL.

1. Crie um ambiente virtual e instale `backend/requirements.txt`.
2. Copie `backend/.env.example` para `backend/.env` e configure o banco.
3. Aplique a migration e inicie o Uvicorn.
4. Execute o frontend em outro terminal; o Vite encaminha `/api` para `http://127.0.0.1:8000`.

O passo a passo está em [backend/README.md](backend/README.md). **Não versione o arquivo `.env` real.**

## Estrutura

| Caminho                        | Responsabilidade                          |
| ------------------------------ | ----------------------------------------- |
| `src/PublicPages.vue`          | Landing, acesso, perfil e páginas legais  |
| `src/App.vue`                  | Área de demonstração da cozinha           |
| `src/Root.vue` / `src/main.ts` | Entrada e roteamento da aplicação         |
| `src/store.ts`                 | Dados de demonstração e estado em memória |
| `src/domain.js`                | Fórmulas de custos e contribuição         |
| `src/api.ts`                   | Comunicação com a API de contas           |
| `src/legal.ts`                 | Textos legais e versão documental         |
| `public/`                      | Favicon e imagem da landing               |
| `backend/`                     | API, modelos, migration e testes          |
| `docs/`                        | Arquitetura e plano de continuidade       |
| `.github/workflows/ci.yml`     | Build e testes automatizados              |

## Validação e limitações

- Os seis testes de domínio do frontend passaram após a formatação.
- O frontend foi compilado com sucesso.
- Os sete testes HTTP da API passaram com SQLite isolado. A formatação Python preservou a árvore sintática (AST) do código.
- Prettier e Black verificaram a formatação. O workflow de CI está preparado para executar formatação, build, testes de domínio e testes de contas. Sua presença não significa que já tenha passado.
- Não foram realizados testes visuais automatizados, entrega SMTP, migrations em PostgreSQL ou testes de produção.
- Os cálculos demonstrativos usam `Number`; a API de negócio futura deverá definir precisão decimal e arredondamento.
- Atualizar a página reinicia os insumos, receitas e vendas da demonstração.
- Não há cobrança, integração com delivery, baixa de estoque, verificação de e-mail ou gestão multiusuário.

Consulte o [roadmap](docs/ROADMAP.md) antes de continuar o desenvolvimento.

## Desenvolvimento e contribuição

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para convenções, verificações e limites do escopo. Para relatar uma falha de segurança, consulte [SECURITY.md](SECURITY.md).

## Assets e distribuição

A imagem `public/cozinha-hero.png` foi gerada por IA para este projeto e não representa um estabelecimento real. As fontes são carregadas pelo Google Fonts. O repositório está destinado a uso privado; nenhuma licença de distribuição foi definida nesta etapa.
