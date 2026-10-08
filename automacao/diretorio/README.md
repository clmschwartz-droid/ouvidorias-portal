# Ouvidorias cadastradas

## Operação diária

A lista pública fica em **Dados → Ouvidorias cadastradas**, com acesso também no Inscreva-se. Ela reúne inscrições conferidas; o Mapa Interativo continua com o levantamento nacional mais amplo.

Na planilha **Respostas — Cadastro de Ouvidorias**, use a aba **Diretório — aprovação**. Após a ativação administrativa abaixo, inscrições novas são preparadas automaticamente a cada cinco minutos. Os testes são ignorados. Os campos de localização e classificação ficam para conferência, sem inferências a partir de endereços livres.

1. Confira nome da ouvidoria, órgão/instituição, município, UF, esfera e poder/natureza. Preencha o site oficial quando houver.
2. Se quiser divulgar e-mail e telefone, confira-os em fonte oficial, preencha **Fonte dos contatos** e marque **Contato conferido**. Nunca use o nome, celular ou e-mail pessoal do ouvidor. O e-mail público deve ser um endereço genérico da ouvidoria em domínio institucional. Para publicar a instituição sem e-mail/telefone, deixe **Contato conferido** desmarcado.
3. Marque **Aprovar publicação** nas linhas conferidas. É possível selecionar várias células dessa coluna e preencher `TRUE` para aprovar um lote. Os dados aprovados chegam ao site no próximo ciclo; a implantação do GitHub Pages pode acrescentar alguns minutos.
4. **Fluxo site** e **Atualizado em** são automáticos. Corrija a própria fila para atualizar o diretório. Desmarque **Aprovar publicação** para retirar uma instituição da lista. Erros de validação preservam a versão já publicada até a correção.

Sete inscrições reais foram conferidas e incluídas na implantação inicial. Sete envios de teste ficaram fora da lista. Um telefone do IFPE Paulista foi omitido por falta de confirmação; os e-mails públicos da UFRJ e da Sanepar seguem as fontes oficiais atuais. As respostas originais do formulário foram preservadas.

Não ordene nem apague linhas da aba original **Form Responses 1**: o identificador mantém a referência à linha de entrada. Ordene ou filtre apenas **Diretório — aprovação**. Não altere ID ou as colunas técnicas ocultas. A aba de respostas contém dados privados e não deve ser compartilhada publicamente.

## Ativação administrativa — uma única vez

O módulo está pronto, mas a instalação no projeto privado precisa ser concluída pela conta titular. Não foi ativado por uma implantação do site.

1. Na conta **ouvidoriaspublicasbrasileiras@gmail.com**, abra o **mesmo projeto administrativo privado** que já processa os pedidos de envio do Fala Ouvidor. Não é o projeto vinculado à planilha nem um projeto novo. Ele contém `Central.gs`, `Processador.gs` e a configuração administrativa já usada.
2. Ao lado de **Arquivos**, clique em **+ → Script**, dê o nome **Diretorio** e cole o conteúdo de [Diretorio.gs](Diretorio.gs). Salve. Não apague nem substitua nenhum arquivo existente. Não precisa baixar ou alterar `appsscript.json`.
3. No seletor de funções ao lado de **Executar**, selecione **ativarDiretorioCadastradas** e clique em **Executar**. Essa função instala somente o temporizador do diretório e reaproveita a credencial administrativa existente. Nenhum estagiário configura token.
4. Confira o registro **“Diretório ativado: importação e publicação a cada cinco minutos”** e, em **Acionadores**, o temporizador **sincronizarDiretorioCadastradas**. Não remova os acionadores do Fala Ouvidor.

Os escopos necessários já estão no manifesto do projeto central: planilhas, requisições externas e acionadores. Se o Google pedir autorização, confirme a conta titular e os escopos existentes. Não cole credenciais no código, na planilha, no repositório ou no chat.

## Acesso de estagiários

A delegação do Gmail não concede acesso ao Drive/Sheets. O estagiário usa sua própria conta Google, com compartilhamento explícito da planilha, para preparar e aprovar registros. O temporizador executa como a conta titular. GitHub e Decap só são necessários para quem tiver atribuição de revisar/publicar conteúdo editorial do Fala Ouvidor; a aprovação do diretório ocorre na planilha.

O Fala Ouvidor permanece separado: **planilha de moderação → rascunho oculto → revisão final no Decap**. Respostas privadas permanecem no fluxo próprio. No Decap, acompanhamento, resposta pública, data e destaque ficam em **Acompanhamento e destaque (opcional)**, recolhido por padrão. Não há cópia manual de volta para a planilha.

## Escopo técnico e verificação

`Diretorio.gs` lê somente A:F das inscrições e exporta uma lista explícita de campos institucionais. Não lê os contatos pessoais do ouvidor (P:U), não envia e-mails, não cria gatilhos de formulário nem menus. Seu temporizador é idempotente e usa o mesmo bloqueio do projeto para não concorrer com o processamento do Fala Ouvidor. Publica apenas `conteudo/ouvidorias-cadastradas.json`, por PR, e só confirma o status após leitura do arquivo incorporado.

Execute `node automacao/diretorio/testes.js` para verificar importação, aprovação em lote, contatos, rejeição de duplicidades, atualizações, retirada, idempotência e proteção contra edição simultânea. Execute também os testes existentes do Fala Ouvidor ao alterar a configuração editorial.
