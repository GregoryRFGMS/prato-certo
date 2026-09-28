# API de contas — Prato Certo

Implementação preparada para FastAPI, SQLAlchemy, Alembic e PostgreSQL. Esta API **não é executada pela publicação estática no Sites**. Deve ser hospedada em um serviço Python e ligada ao frontend por proxy HTTP de mesma origem em `/api`. A versão atual do frontend detecta a ausência da API e impede submissão das senhas.

## Rodar localmente

Na raiz do repositório:

```sh
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
```

Copie `backend/.env.example` para `backend/.env`, configure um banco PostgreSQL existente para executar as migrations. Para facilitar a execução local, o Uvicorn também lê `--env-file` (python-dotenv é incluído por uvicorn[standard]). No desenvolvimento, `REGISTRATION_ENABLED=true` permite avaliar o cadastro com a versão de termos de rascunho. O padrão é false.

```sh
# Carregando as variáveis de backend/.env:
python -m dotenv -f backend/.env run -- alembic -c backend/alembic.ini upgrade head
uvicorn backend.app:app --env-file backend/.env --reload
```

Em outro terminal, `npm run dev`. O Vite já encaminha `/api` para `127.0.0.1:8000`. Documentação local: `http://127.0.0.1:8000/api/docs`.

## Endpoints

- GET `/api/auth/status`: recursos habilitados, sem dados pessoais.
- POST `/api/auth/register`: nome, e-mail, estabelecimento, senha e versão aceita dos termos.
- POST `/api/auth/login`: e-mail e senha.
- GET `/api/auth/me`: perfil da sessão autenticada.
- POST `/api/auth/logout`: revoga a sessão no banco.
- POST `/api/auth/forgot-password`: recuperação via SMTP STARTTLS, se configurado.
- POST `/api/auth/reset-password`: token de uso único e nova senha, com revogação das sessões anteriores.

## Decisões

Sessões opacas em cookie HttpOnly, SameSite=Lax, Secure em produção; somente o digest da sessão permanece no banco. A escolha permite revogação no logout e troca de senha sem manter JWT no localStorage. Senhas usam Argon2 via pwdlib. Expiração de sessão: 12h. Recuperação: 30min. Contadores de abuso são compartilhados no banco, por ação, IP e e-mail normalizados; o limite é por janela de 15min. Contadores antigos e sessões/tokens expirados são limpos oportunisticamente nas ações de autenticação.

Origem permitida é obrigatória em métodos que modificam estado. Use um proxy de mesma origem. Cabeçalhos encaminhados do cliente não são usados diretamente pela aplicação; configure a lista de proxies confiáveis no Uvicorn, evitando confiar em X-Forwarded-For de origem arbitrária. Os endpoints não oferecem credenciais em respostas JSON. Erros de validação não ecoam os inputs de senha.

E-mails ainda **não são verificados** no cadastro. Não use o campo de e-mail como prova de identidade para autorizar acesso externo. O estabelecimento é somente um atributo de perfil nesta etapa, não um módulo multiusuário de gestão.

## Preparação para ativação

1. Definir responsável legal e canal de privacidade e concluir a revisão dos documentos em `src/legal.ts`.
2. Atualizar a versão simultaneamente no frontend e em `TERMS_VERSION`; produção não habilita cadastros com versão terminada em `-draft`.
3. Hospedar PostgreSQL e a API, aplicar migrations, configurar HTTPS e proxy `/api` de mesma origem.
4. Definir `APP_ENV=production`, `PUBLIC_APP_URL`, `ALLOWED_ORIGINS` explícitas e `REGISTRATION_ENABLED=true` apenas quando pronto.
5. Configurar provedor SMTP e testar a entrega real antes de oferecer recuperação.
6. Definir backups, exclusão de contas, limpeza periódica de expirados e retenção antes do lançamento público. O produto ainda não implementa cobrança, verificação de e-mail, MFA ou persistência dos módulos de cozinha.

## Verificação

`python -m pytest backend/tests -q` usa bancos SQLite isolados em diretórios temporários, não o banco real. A suíte cobre sessão, logout, hashes, origem, duplicidade normalizada, isolamento de perfis, expiração, limite de tentativas e recuperação de uso único. Execute também contra PostgreSQL antes de produção: os testes SQLite não validam particularidades desse servidor.

**Validação local:** os sete testes HTTP passaram em SQLite isolado após a formatação. Black verificou os arquivos Python. Migrations em PostgreSQL, SMTP e autenticação no navegador ainda precisam de validação integrada.
