# Implementação final do portal

Este documento registra os limites técnicos e os testes necessários para concluir o portal sem expor dados pessoais ou segredos no repositório público.

## Administração pelo Decap

Endereço editorial canônico:

`https://ouvidoriasbrasileiras.com.br/admin/`

Critérios de aceite antes do merge final:

1. autenticação concluída a partir do endereço canônico, sem depender do usuário navegar pelo endereço de preview;
2. acesso testado com pelo menos duas contas individuais do GitHub;
3. criação de rascunho, revisão e publicação testadas na `main` protegida;
4. funcionamento verificado em computador, Android e iPad;
5. credenciais OAuth e outros segredos mantidos somente no serviço de autenticação, nunca no GitHub;
6. procedimento de migração documentado para futura transferência do repositório à conta institucional.
7. opção **“Exibir no portal”** acrescentada a Notícias, Documentos e Multimídia, ativada por padrão, para permitir ocultação reversível sem excluir o conteúdo; o “x” do widget de lista deve ficar reservado à exclusão permanente.

O mesmo princípio vale para manifestações públicas e integrantes do Conselho: use primeiro os controles **“Publicado”** ou **“Exibir no portal”**. A remoção pelo “x” só se torna pública depois de salvar/publicar a alteração e ainda pode ser recuperada pelo histórico do Git, mas não deve ser usada como rotina editorial.

Antes do merge final, testar em cada uma das três coleções o ciclo completo: ocultar um item, salvar como rascunho, conferir o Deploy Preview, publicar, reexibir o item e confirmar que nenhum arquivo ou metadado foi perdido.

Enquanto a autenticação dedicada ao endereço oficial não for concluída, a configuração existente deve permanecer intacta. A troca do provedor exige uma URL de autenticação e uma credencial OAuth válidas; não deve ser simulada com valores provisórios na versão pública.

## Fala Ouvidor: separação entre conteúdo privado e público

O relato recebido e sua versão publicada são registros diferentes.

### Registro privado

O recebimento é feito pelo Google Forms incorporado à seção. As respostas são vinculadas a uma planilha separada e restrita, sob a conta administrativa do portal. Nome, e-mail, relato integral, consentimentos, datas e histórico de contato permanecem fora deste repositório.

Requisitos operacionais:

- manter formulário e planilha sob controle da conta administrativa;
- conceder acesso somente às pessoas responsáveis pela moderação;
- não tornar pública a planilha de respostas;
- conservar a validação de e-mail, o limite de 6.000 caracteres e as duas confirmações obrigatórias;
- revisar, editar ou anonimizar cada relato antes de eventual publicação;
- definir política de retenção e exclusão dos dados privados;
- manter notificações sem expor conteúdo pessoal desnecessário no assunto do e-mail.

### Versão pública moderada

Somente a versão revisada e aprovada entra em `conteudo/manifestacoes.json`. O Decap apresenta essa coleção como **Fala Ouvidor — publicações**.

Nunca registrar nesse arquivo:

- e-mail ou telefone do manifestante;
- documentos de identidade;
- anexos privados;
- endereço pessoal;
- o texto original ainda não moderado;
- qualquer informação que não deva aparecer publicamente no GitHub e no portal.

## Conselho Curador

Os integrantes são mantidos em `conteudo/conselho-curador.json`. Além do controle individual de cada integrante, existe a trava geral **“Publicar Conselho Curador”** em **Configuração do portal**. Enquanto essa trava estiver desativada, o botão e a seção permanecem ocultos mesmo que nomes já tenham sido cadastrados. Assim, a estrutura pode ser preparada antes das autorizações sem produzir uma página pública incompleta.

## Métricas com GoatCounter

O portal carrega o contador público associado ao site code `ouvidoriasbrasileiras`, por meio de `https://gc.zgo.at/count.js`. Não há senha, token ou outro segredo no código do site. A conta administrativa precisa manter o e-mail verificado e o acesso ao painel protegido.

O contador só é carregado em `ouvidoriasbrasileiras.com.br` e `www.ouvidoriasbrasileiras.com.br`; previews, `raw.githack.com` e testes locais não contaminam os dados. Além das visitas às seções, o portal registra como eventos:

- abertura e download de documentos;
- cliques em links externos;
- reprodução e tela cheia de vídeos;
- abertura de estados e painéis auxiliares do mapa.

Os envios dos Google Forms não podem ser lidos pelo site por serem iframes de outra origem. A conclusão de **Inscreva-se** e **Fala Ouvidor** deve ser acompanhada nas respectivas planilhas de respostas; o GoatCounter registra o acesso às seções que contêm os formulários.

Após a publicação, abrir o portal em uma janela sem bloqueador de conteúdo e confirmar no painel do GoatCounter o recebimento da primeira visita. Bloqueadores podem impedir a contagem no navegador usado para o teste.

## Newsletter preparada e desativada

A estrutura do pop-up está pronta, mas nasce invisível. Em **Configuração do portal**, o recurso só aparece quando **Ativar pop-up da newsletter** estiver ligado e uma URL pública válida tiver sido informada. Título, texto, botão, atraso e versão do aviso podem ser alterados no Decap. A versão permite reapresentar o aviso a quem já o dispensou depois de uma mudança editorial relevante.

## Itens que dependem de configuração externa

- criação e teste do e-mail institucional;
- definição das pessoas autorizadas a acessar a planilha privada de respostas;
- ativação das notificações de novas respostas para a conta administrativa;
- credenciais de autenticação do `/admin/`;
- definição da política de privacidade e retenção;
- verificação do e-mail da conta GoatCounter e teste da primeira visita;
- eventual serviço de newsletter.

Esses valores não devem ser gravados diretamente em arquivos públicos quando forem secretos.
