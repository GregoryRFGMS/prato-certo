# Deploy no Vercel com Services

A configuração proposta usa `app` (Vue/Vite, raiz do repositório) e
`backend` (FastAPI, pasta `backend`, entrypoint `app:app`).

## Rotas e comunicação

- `/api/*` é encaminhado à API preservando o caminho completo.
- Os demais caminhos vão ao frontend, incluindo assets. O Vue usa hash routing.
- O navegador chama `/api` na mesma origem, com cookies de sessão.
- Não existem chamadas entre servidores: nenhum binding é necessário.
- Não configure uma URL interna como `VITE_API_BASE_URL`: bindings só estão
  disponíveis em runtime de functions, não no navegador ou no build.
- O proxy localhost em `vite.config.ts` é exclusivo de `npm run dev`.

## Variáveis de ambiente

Configure no Vercel, sem colocar credenciais no Git:

- `DATABASE_URL`: PostgreSQL acessível pela API, preferencialmente com pooler.
- `APP_ENV=production`.
- `PUBLIC_APP_URL`: URL HTTPS pública final, sem barra final.
- `ALLOWED_ORIGINS`: origens HTTPS explícitas autorizadas, separadas por vírgula.
- `REGISTRATION_ENABLED=false` até concluir a revisão dos documentos legais.
- `TERMS_VERSION`: versão correspondente a `src/legal.ts`.
- Variáveis SMTP se for habilitar recuperação por e-mail.

Previews precisam de origens explicitamente autorizadas. Não use wildcard.
Aplique as migrations separadamente, com acesso ao banco configurado:

```bash
python -m dotenv -f backend/.env run -- alembic -c backend/alembic.ini upgrade head
```

Para testar todos os serviços localmente, use `vercel dev` com as variáveis
configuradas. A origem local deve estar em `ALLOWED_ORIGINS` e
`APP_ENV=development`. O Vercel publica a API, mas não cria o PostgreSQL nem
aplica migrations automaticamente. Os módulos de cozinha continuam em memória.

## Estado da validação

Build e testes locais não substituem uma execução real no Vercel com banco,
origens e SMTP configurados. Os nomes `app` e `backend`, as rotas públicas `/` e `/api/*` e a ausência de
bindings foram confirmados. A validação de um deploy real ainda depende das
variáveis de ambiente e do banco hospedado.
