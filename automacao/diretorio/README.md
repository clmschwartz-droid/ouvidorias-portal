# Ouvidorias cadastradas

## Operação diária

A lista pública fica em **Dados → Ouvidorias cadastradas**, com acesso também no Inscreva-se. Ela reúne inscrições conferidas; o Mapa Interativo continua com o levantamento nacional mais amplo.

Na planilha **Respostas — Cadastro de Ouvidorias**, use a aba **Diretório — aprovação**. A sincronização está ativa: inscrições novas são preparadas automaticamente a cada cinco minutos. Os testes são ignorados. Nome, contatos institucionais e os dados identificáveis de instituição, município, UF, esfera e poder/natureza chegam pré-preenchidos para conferência. A rotina reconhece indicações explícitas nas respostas; campos ambíguos continuam vazios, sem deduzir UF por DDD nem esfera pela cidade. Rascunhos antigos recebem os campos ainda vazios; valores já revisados e registros publicados são preservados.

1. Confira nome da ouvidoria, órgão/instituição, município, UF, esfera e poder/natureza. Complete apenas o que não pôde ser identificado. Preencha o site oficial quando houver. A nota na célula do nome contém um link para o cadastro original completo, incluindo todos os campos que não fazem parte da lista pública.
2. Se quiser divulgar e-mail e telefone institucionais fornecidos pela própria ouvidoria no cadastro, marque **Divulgar contatos**. **Fonte dos contatos (opcional)** pode registrar uma página ou referência, mas não é requisito: não é preciso ter site nem comprovação externa. Nunca use o nome, celular ou e-mail pessoal do ouvidor. O e-mail público deve ser uma caixa genérica da ouvidoria; pode estar em um provedor gratuito, desde que usado pela instituição. Para publicar sem e-mail/telefone, deixe **Divulgar contatos** desmarcado.
3. Marque **Aprovar publicação** nas linhas conferidas. É possível selecionar várias células dessa coluna e preencher `TRUE` para aprovar um lote. Os dados aprovados chegam ao site no próximo ciclo; a implantação do GitHub Pages pode acrescentar alguns minutos.
4. **Fluxo site** e **Atualizado em** são automáticos. Corrija a própria fila para atualizar o diretório. Desmarque **Aprovar publicação** para retirar uma instituição da lista. Erros de validação preservam a versão já publicada até a correção.

Sete inscrições reais foram conferidas e incluídas na implantação inicial. Sete envios de teste ficaram fora da lista. Um telefone do IFPE Paulista foi omitido por falta de confirmação; os e-mails públicos da UFRJ e da Sanepar seguem as fontes oficiais atuais. As respostas originais do formulário foram preservadas.

Não ordene nem apague linhas da aba original **Form Responses 1**: o identificador mantém a referência à linha de entrada. Ordene ou filtre apenas **Diretório — aprovação**. Não altere ID ou as colunas técnicas ocultas. A aba de respostas contém dados privados e não deve ser compartilhada publicamente.

São necessárias apenas essas duas abas. **Página1** era uma aba padrão vazia, sem participação na importação ou publicação.

O site informa que os dados são fornecidos pelas ouvidorias e aprovados pela equipe. **Solicite uma correção** aparece antes dos filtros e também ao fim da lista. Solicitações chegam à caixa institucional já usada pelo portal; a equipe corrige a fila, e a sincronização atualiza a publicação.

## Ativação administrativa — uma única vez

A ativação inicial foi concluída pela conta titular. O roteiro abaixo serve para reinstalação; a implantação do site, sozinha, não instala nem atualiza o Apps Script.

1. Na conta **ouvidoriaspublicasbrasileiras@gmail.com**, abra o **mesmo projeto administrativo privado** que já processa os pedidos de envio do Fala Ouvidor. Não é o projeto vinculado à planilha nem um projeto novo. O arquivo `Código.gs` reúne o processamento central e sua configuração administrativa.
2. Ao lado de **Arquivos**, clique em **+ → Script**, dê o nome **Diretorio** e cole o conteúdo de [Diretorio.gs](Diretorio.gs). Salve. Não apague nem substitua nenhum arquivo existente. Não precisa baixar ou alterar `appsscript.json`.
3. No seletor de funções ao lado de **Executar**, selecione **ativarDiretorioCadastradas** e clique em **Executar**. Essa função instala somente o temporizador do diretório e reaproveita a credencial administrativa existente. Nenhum estagiário configura token.
4. Confira o registro **“Diretório ativado: importação e publicação a cada cinco minutos”** e, em **Acionadores**, o temporizador **sincronizarDiretorioCadastradas**. Não remova os acionadores do Fala Ouvidor.

Os escopos necessários já estão no manifesto do projeto central: planilhas, requisições externas e acionadores. Se o Google pedir autorização, confirme a conta titular e os escopos existentes. Não cole credenciais no código, na planilha, no repositório ou no chat.

## Acesso de estagiários

A delegação do Gmail não concede acesso ao Drive/Sheets. O estagiário usa sua própria conta Google, com compartilhamento explícito da planilha, para preparar e aprovar registros. O temporizador executa como a conta titular. GitHub e Decap só são necessários para quem tiver atribuição de revisar/publicar conteúdo editorial do Fala Ouvidor; a aprovação do diretório ocorre na planilha.

O Fala Ouvidor permanece separado: **planilha de moderação → rascunho oculto → revisão final no Decap**. Respostas privadas permanecem no fluxo próprio. No Decap, acompanhamento, resposta pública, data e destaque ficam em **Acompanhamento e destaque (opcional)**, recolhido por padrão. Não há cópia manual de volta para a planilha.

## Escopo técnico e verificação

A importação considera a última linha com dados de um cadastro ou rascunho em revisão. Caixas desmarcadas e células de status em linhas vazias não empurram novos registros para o fim da grade e não geram erros de ID repetido. Linhas vazias internas mantêm suas posições; dados e rascunhos do operador são preservados. A correção de registros já importados longe da tabela exige movê-los com seus IDs, aprovações e demais campos intactos, sem copiá-los como cadastros novos.

`Diretorio.gs` lê somente A:H das inscrições (identificação, localização, contatos institucionais e ato de criação) e exporta uma lista explícita de campos institucionais. Não lê os contatos pessoais do ouvidor (P:U), não envia e-mails, não cria gatilhos de formulário nem menus. Seu temporizador é idempotente e usa o mesmo bloqueio do projeto para não concorrer com o processamento do Fala Ouvidor. Publica apenas `conteudo/ouvidorias-cadastradas.json`, por PR, e só confirma o status após leitura do arquivo incorporado. A mensagem de erro lista precisamente quais campos precisam ser completados ou conferidos.

Execute `node automacao/diretorio/testes.js` para verificar importação, aprovação em lote, contatos, rejeição de duplicidades, atualizações, retirada, idempotência e proteção contra edição simultânea. Execute também os testes existentes do Fala Ouvidor ao alterar a configuração editorial.
