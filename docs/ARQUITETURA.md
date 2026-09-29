# Arquitetura

## Dois fluxos independentes

O frontend compartilha a identidade visual, mas separa a demonstração de cozinha do fluxo de contas:

- **Demonstração:** estado Pinia em memória; cálculos em `src/domain.js`; nenhum dado de cozinha enviado à API.
- **Contas:** `src/api.ts` chama `/api/auth/*` com cookies; perfis e sessões precisam de FastAPI e banco. Não há simulação de login em localStorage.

| Camada           | Implementação atual                               | Evolução prevista                         |
| ---------------- | ------------------------------------------------- | ----------------------------------------- |
| Interface        | Vue, Vite, hash routing                           | Manter os fluxos e substituir o mock      |
| Dados da cozinha | Pinia com seed fictício                           | API autenticada e PostgreSQL              |
| Cálculos         | JavaScript Number                                 | Decimal no backend e política documentada |
| Contas           | Código FastAPI e SQLAlchemy                       | Validar e hospedar                        |
| Esquema          | Migration Alembic para contas                     | Migrations incrementais para o domínio    |
| Sessões          | Cookie HttpOnly, token aleatório, digest no banco | Testar com proxy e HTTPS reais            |

## Rotas do frontend

`/#/`, `/#/app`, `/#/insumos`, `/#/receitas`, `/#/simulador`, `/#/vendas`, `/#/login`, `/#/cadastro`, `/#/recuperar-senha`, `/#/redefinir-senha`, `/#/conta`, `/#/termos`, `/#/privacidade`.

## Execução e hospedagem

O build frontend é estático. Ele não executa Python, cria PostgreSQL ou instala a API. Em desenvolvimento, o proxy do Vite encaminha `/api` para o Uvicorn. Em produção, o alvo é uma origem HTTPS com proxy `/api` para o serviço Python.

A exportação para GitHub não inclui a identidade interna do site (`.openai/hosting.json`). O site já publicado possui seu próprio fluxo de publicação; um push neste repositório não altera automaticamente essa publicação.

## Regras a preservar

- Unidade de compra e de uso precisam ser compatíveis.
- O custo total da receita é dividido pelo rendimento final.
- Não contabilizar a mesma perda ou embalagem duas vezes.
- Margem de contribuição e markup são conceitos diferentes.
- Vendas preservam um snapshot do custo, taxa e despesas no lançamento.
- Lançamentos retroativos atualmente usam os custos atuais, e a interface informa essa limitação.
- Autorizações reais devem existir no servidor; esconder um botão não protege registros.

## Dados pessoais e documentos

O serviço de contas ainda não está habilitado na demonstração hospedada. Os textos legais são minutas. Antes do lançamento público, definir responsável, canais de atendimento, retenção, backups e fornecedores. Não confundir autenticação do site privado com uma conta do produto.
