# Roadmap e continuidade

## Pronto para avaliação

- [x] Landing page e identidade visual
- [x] Dashboard, insumos, fichas, simulação e vendas em memória
- [x] Telas de acesso, cadastro, recuperação e perfil
- [x] Minutas de termos e privacidade
- [x] Código inicial de contas com migration e suíte de testes
- [x] Testes unitários de cálculo e build frontend

## Próximo passo: validar contas

- [x] Executar `python -m pytest backend/tests -q` (7 testes passaram em SQLite)
- [ ] Aplicar migrations e testar com PostgreSQL
- [ ] Validar sessão, logout, troca de senha e isolamento de perfis
- [ ] Configurar e testar SMTP em ambiente de desenvolvimento
- [ ] Validar HTTPS, cookies e proxy de mesma origem
- [ ] Revisar documentos e definir responsável e canal de privacidade

## Transformar demonstração em produto

- [ ] Modelar estabelecimentos e vínculo de usuários
- [ ] Implementar insumos, receitas, versões e vendas no servidor
- [ ] Formalizar regras de precisão e arredondamento decimal
- [ ] Substituir o store de demonstração por endpoints autenticados
- [ ] Implementar estornos e correções com histórico
- [ ] Definir backups, exclusão de contas e retenção
- [ ] Revisar acessibilidade e realizar testes completos no navegador

## Fora do MVP inicial

Controle de lote e validade, baixa automática de estoque, integrações com PDV/delivery, financeiro completo, fiscal e cobrança de assinaturas.

## Como retomar

Leia o README, `docs/ARQUITETURA.md` e `backend/README.md`. Confirme o estado atual do código e os resultados da CI. Não marque a API como funcional em produção apenas porque existem telas ou testes escritos. Não substitua o mock sem preservar o snapshot de custos históricos.
