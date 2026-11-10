# Ouvidorias cadastradas

## Operação diária

A lista pública fica em **Dados → Ouvidorias cadastradas**, com acesso também no Inscreva-se. Ela reúne inscrições conferidas; o Mapa Interativo continua com o levantamento nacional mais amplo.

Na planilha **Respostas — Cadastro de Ouvidorias**, use a aba **Diretório — aprovação**. A sincronização está ativa: inscrições novas são preparadas automaticamente a cada cinco minutos. Os testes são ignorados. Nome, contatos institucionais e os dados identificáveis de instituição, município, UF, esfera e poder/natureza chegam pré-preenchidos para conferência. A rotina reconhece indicações explícitas nas respostas; campos ambíguos continuam vazios, sem deduzir UF por DDD nem esfera pela cidade. Nos rascunhos, os campos de classificação vazios podem ser complementados. O site é importado apenas ao criar a linha: pode ser corrigido ou apagado antes da primeira aprovação.

1. O mínimo é **C — Nome da ouvidoria** e ao menos um contato institucional válido: **I — Site**, **J — E-mail** ou **K — Telefone**. Órgão/instituição, município, UF, esfera e poder/natureza são opcionais; campos vazios não impedem a aprovação. Quando informados, UF, esfera e poder devem corresponder às opções da planilha. Não invente dados para completar a classificação. O site informado no formulário é importado automaticamente, sem conferência externa; complementos anteriores são preservados. A nota em C abre o cadastro original completo.
2. Para divulgar os contatos institucionais J/K, marque **L — Divulgar contatos**. O site I é publicado independentemente dessa caixa. Fonte dos contatos M é opcional: não é preciso ter página web nem comprovação externa. Nunca copie contatos pessoais do ouvidor. O e-mail público deve ser uma caixa genérica da ouvidoria e pode usar provedor gratuito. Se L ficar desmarcada, e-mail/telefone servem somente como referência interna e não são publicados.
3. Marque **B — Aprovar publicação**, na mesma linha, e aguarde até cinco minutos mais a implantação do site. Confira **N — Fluxo site**: deve indicar Publicado. Exemplo: cadastro na linha 14 → confira C14 e I14/J14/K14, marque L14 se for divulgar contatos e então B14. Não há botão de envio no menu nem etapa no Decap. Para aprovar um lote, selecione as células B correspondentes e preencha `TRUE`.
4. **Fluxo site** e **Atualizado em** são automáticos. Corrija a própria fila para atualizar o diretório. Desmarque **Aprovar publicação** para retirar uma instituição da lista. Erros de validação preservam a versão já publicada até a correção.

5. **Telefone (coluna K):** deixe na célula todos os telefones institucionais que devem ser publicados, separados por ponto e vírgula, barra ou quebra de linha. Use DDD em cada número comum, 0800 completo quando couber e `ramal 123` ao lado do número correspondente. Se houver um número completo junto de um incompleto, a coluna **N — Fluxo site** indica qual posição conferir. Corrija o número ou retire da coluna K apenas o que não deve aparecer; a resposta original fica na aba do formulário. Um 800 inequívoco recupera o zero inicial. Quando nenhum telefone for válido, a publicação pode prosseguir com outro contato válido e uma nota em N informa a omissão. Cada número aprovado aparece em sua própria linha no portal. A sincronização não acrescenta telefones antes omitidos de cadastros publicados quando a coluna K ainda coincide com a resposta original; para acrescentá-los, revise e padronize a célula K.
6. **Duplicidade:** a mensagem aponta o ID correspondente. Nome genérico ou telefone compartilhado, isoladamente, não bloqueiam. Coincidências fracas aparecem em nota de N. Se for repetição, preserve a linha original publicada e desmarque a aprovação da nova, sem apagar a resposta do formulário.

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

`Diretorio.gs` lê A:H das inscrições (identificação, localização, contatos institucionais e ato de criação) e, separadamente, a coluna identificada pelo cabeçalho **Site da ouvidoria**. A posição dessa coluna não é fixa. Exporta uma lista explícita de campos institucionais e não lê as respostas com contatos pessoais do ouvidor, não envia e-mails, não cria gatilhos de formulário nem menus. Seu temporizador é idempotente e usa o mesmo bloqueio do projeto para não concorrer com o processamento do Fala Ouvidor. Publica apenas `conteudo/ouvidorias-cadastradas.json`, por PR, e só confirma o status após leitura do arquivo incorporado. A mensagem de erro lista precisamente quais campos precisam ser completados ou conferidos.

Execute `node automacao/diretorio/testes.js` para verificar importação, aprovação em lote, contatos, rejeição de duplicidades, atualizações, retirada, idempotência e proteção contra edição simultânea. Execute também os testes existentes do Fala Ouvidor ao alterar a configuração editorial.

O Google Forms inclui **Site da ouvidoria** na primeira seção, depois do e-mail institucional: resposta curta e opcional. O endereço segue para a coluna I da fila e é publicado ao marcar **Aprovar publicação**, independentemente de **Divulgar contatos** (controle de e-mail/telefone). Não se exige comprovação externa; verifica-se apenas o formato HTTP/HTTPS. Um e-mail no campo site nunca é publicado como link; o valor original permanece na aba de respostas. Uma célula de site apagada na fila não é preenchida novamente.

Para implantar as novas regras, substitua apenas o conteúdo de **Diretorio.gs** no projeto administrativo que já executa o gatilho. Salve; não reinstale o gatilho, nem altere as permissões. A publicação no GitHub não atualiza o Apps Script instalado.

No formulário ativo, mantenha os títulos das perguntas para preservar os cabeçalhos da planilha. Em **Telefone da Ouvidoria**, acrescente: “Informe um ou mais telefones institucionais com DDD, como (41) 3333-4444, ou um 0800 completo. Separe os números por ponto e vírgula. Se houver ramal, escreva ‘ramal 123’ após o número correspondente.” Em **Site da ouvidoria**, mantenha a resposta curta opcional, com validação de URL HTTP/HTTPS e mensagem “Informe o endereço do site começando por https:// ou http://, ou deixe em branco. E-mail deve ser informado no campo próprio.”
