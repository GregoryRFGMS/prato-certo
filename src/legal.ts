export const legalVersion = '2026-09-11-draft';
export const terms = [
  {
    title: '1. Sobre esta versão',
    text: 'O Prato Certo é um projeto em desenvolvimento para estimar custos de receitas, simular preços e analisar a contribuição das vendas. Esta minuta descreve a demonstração atual e a etapa de contas em preparação. Não é um contrato comercial definitivo. A identificação do responsável pelo serviço e o canal de atendimento serão incluídos antes da abertura de cadastros ao público.',
  },
  {
    title: '2. Demonstração e contas',
    text: 'A demonstração é identificada na interface, utiliza um cardápio fictício e mantém alterações apenas na memória da página. Recarregar encerra essas alterações. Login, cadastro e recuperação dependem do serviço de contas estar conectado. Uma mensagem de indisponibilidade não cria uma conta e não confirma envio de e-mail. A autenticação da plataforma que hospeda esta prévia é independente de uma conta Prato Certo.',
  },
  {
    title: '3. Uso dos cálculos',
    text: 'Os resultados dependem dos preços, unidades, quantidades, rendimento e taxas informados. A margem de contribuição representa o valor restante após custos e despesas variáveis; ainda precisa cobrir despesas fixas. Ela não equivale a lucro líquido. O preço sugerido é uma simulação e não garante procura, rentabilidade ou adequação tributária. Confira os dados antes de tomar decisões comerciais.',
  },
  {
    title: '4. Dados e responsabilidades',
    text: 'Insira somente informações que você tenha autorização para utilizar. Não use a demonstração como registro oficial de vendas, estoque ou obrigações fiscais. Não insira dados sensíveis, documentos de clientes, informações de pagamento ou segredos comerciais na prévia. No serviço de contas, utilize uma senha exclusiva e não compartilhe o acesso.',
  },
  {
    title: '5. Funcionalidades e disponibilidade',
    text: 'O escopo atual inclui insumos, fichas técnicas, simulação de preço, lançamentos manuais e indicadores demonstrativos. Gestão fiscal, pagamentos, estoque por lote e integrações não estão disponíveis. O projeto pode receber alterações e interrupções durante o desenvolvimento; nesta fase não há compromisso de disponibilidade contínua ou suporte com prazo contratado.',
  },
  {
    title: '6. Valores e contratação',
    text: 'A demonstração não cobra valores, não solicita cartão e não inicia assinatura. Não há plano pago ofertado nesta versão. Se uma modalidade comercial for criada, preço, renovação, cancelamento e condições da contratação deverão ser apresentados antes da adesão.',
  },
  {
    title: '7. Uso permitido e conteúdo',
    text: 'Não tente acessar contas de terceiros, contornar controles de acesso ou prejudicar o funcionamento do serviço. Os dados inseridos por um usuário não passam a pertencer ao projeto. Marcas e materiais de terceiros permanecem sujeitos aos direitos de seus titulares. A disponibilidade da interface não implica licença comercial sobre o código-fonte.',
  },
  {
    title: '8. Privacidade e alterações',
    text: 'Consulte a Política de Privacidade para conhecer o tratamento previsto nesta etapa. Atualizações relevantes destes textos deverão ser identificadas por versão e apresentadas antes de novas condições entrarem em vigor. Nenhuma disposição desta minuta pretende excluir direitos obrigatórios assegurados pela legislação aplicável.',
  },
  {
    title: '9. Informações pendentes',
    text: 'Antes do lançamento público, ainda precisam ser definidos: responsável legal e sua identificação, contato de suporte e privacidade, condições de encerramento e exclusão de contas, operação de backups e retenção, fornecedores efetivamente contratados e condições comerciais, se houver. Esta versão permanece para revisão do projeto.',
  },
];
export const privacy = [
  {
    title: '1. Escopo e responsável',
    text: 'Esta é uma minuta para a prévia do Prato Certo, não uma declaração de conformidade pronta para operação comercial. A identificação do controlador e um canal de privacidade ainda não foram definidos. Por esse motivo, a versão apresentada deve ser utilizada para avaliação do projeto, sem cadastro público de clientes.',
  },
  {
    title: '2. O que acontece na demonstração',
    text: 'As fichas, insumos e vendas exibidos começam com dados fictícios. As alterações feitas na demonstração permanecem na memória da página e desaparecem ao recarregar. O código da demonstração não envia esses registros à API de contas e não utiliza armazenamento local do navegador para preservá-los.',
  },
  {
    title: '3. Serviço de contas em preparação',
    text: 'Quando conectado, o serviço de contas recebe nome, e-mail, nome do estabelecimento e senha para criar e autenticar um perfil. A senha é transformada em hash; a aplicação não foi implementada para armazená-la em texto simples. São registrados a versão dos termos aceita, datas da conta e sessões de acesso. O serviço também mantém contadores de tentativas de autenticação, com identificadores derivados do endereço IP e do e-mail, para limitar abuso.',
  },
  {
    title: '4. Finalidades e fundamentos a validar',
    text: 'Os dados de conta têm a finalidade de permitir identificação, acesso e administração do perfil. Informações de sessão e de tentativas de acesso auxiliam a segurança. Antes da operação pública, o responsável deverá definir e documentar a base legal adequada de cada tratamento. A aceitação dos Termos de Serviço não será usada como consentimento genérico para publicidade ou para todas as operações com dados.',
  },
  {
    title: '5. Cookies e recursos externos',
    text: 'A demonstração não instala ferramentas de publicidade ou análise de audiência. O serviço de contas, quando conectado, utiliza um cookie de sessão necessário ao login, inacessível ao JavaScript da página. A hospedagem desta prévia pode utilizar seus próprios mecanismos de autenticação e registros técnicos. As fontes são solicitadas ao Google Fonts, o que envolve conexão do navegador aos servidores desse fornecedor. Nenhum banner de consentimento para publicidade foi incluído porque essa finalidade não foi implementada.',
  },
  {
    title: '6. Fornecedores e compartilhamento',
    text: 'A prévia usa a infraestrutura de Sites/ChatGPT e recursos de hospedagem associados, além do Google Fonts. A política desses fornecedores rege suas próprias operações. O serviço de contas precisará de hospedagem, banco de dados e, para recuperação de senha, provedor de e-mail. Esses fornecedores ainda não foram escolhidos para produção. A aplicação não implementa venda de dados nem compartilhamento para publicidade.',
  },
  {
    title: '7. Retenção e segurança',
    text: 'Na demonstração, os dados operacionais não persistem após o recarregamento. Na API de contas preparada, sessões expiram em 12 horas e links de recuperação em 30 minutos. Contadores de tentativas usam janelas de 15 minutos. A rotina de limpeza, os prazos definitivos de retenção de perfis e backups e o processo de exclusão ainda precisam ser definidos antes de receber clientes reais. Controles técnicos reduzem riscos, mas não permitem prometer segurança absoluta.',
  },
  {
    title: '8. Direitos e atendimento',
    text: 'A LGPD prevê direitos relativos aos dados pessoais, como informação, acesso e correção, sujeitos às condições legais. O responsável deverá disponibilizar um canal verificável para essas solicitações antes do lançamento público. Nesta prévia, esse canal ainda está pendente; não apresentamos um endereço fictício de atendimento.',
  },
  {
    title: '9. Atualizações e público',
    text: 'Este produto é destinado a responsáveis pela operação de pequenos negócios de alimentação. Não é direcionado a crianças e não solicita dados de menores. Esta minuta deverá ser atualizada conforme as práticas realmente adotadas, incluindo eventual transferência internacional de dados, fornecedores contratados e processos de atendimento.',
  },
];
