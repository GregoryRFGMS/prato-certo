# Desenvolvimento

1. Crie uma branch a partir de `main`, por exemplo `feat/insumos-api`.
2. Mantenha cada mudança focada em um fluxo e explique seu comportamento no commit ou PR.
3. Use Conventional Commits: `feat:`, `fix:`, `docs:`, `test:` ou `chore:`.
4. Rode `npm test` e `npm run build` quando alterar frontend ou domínio.
5. Rode `python -m pytest backend/tests -q` quando alterar contas. Valide mudanças de banco também com PostgreSQL.
6. Atualize a documentação quando o fluxo, ambiente ou limitação mudar.

Não inclua senhas, tokens, `.env` real, bancos locais, `node_modules`, `dist` ou ambientes virtuais. Preserve os exemplos de configuração sem valores reais.

As funcionalidades de cozinha são demonstrativas. As páginas de acesso não provam que a API esteja hospedada. Ao testar ou apresentar, diferencie código implementado, testes executados e recursos conectados.

## Formatação

Use `npm run format` para formatar Vue, TypeScript, JavaScript, CSS e documentação.
Confira o resultado com `npm run format:check`.

Para Python, instale `pip install -r backend/requirements-dev.txt` e execute
`python -m black backend`. Para verificar sem alterar: `python -m black --check backend`.
