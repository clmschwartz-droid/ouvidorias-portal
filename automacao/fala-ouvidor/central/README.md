# Envio central do Fala Ouvidor — versão preparada, NÃO ativada

Esta ponte é adicional. Não substitui `../Code.gs`, não reinstala a automação de recebimento e não altera Forms, notificações, respostas privadas, Decap ou o portal publicado.

## Operação do estagiário, depois da ativação

1. Revisar os campos públicos e manter a identificação autorizada pelo manifestante.
2. Selecionar **Aprovado para Decap** na coluna B.
3. Marcar a caixa **Solicitar envio central ao Decap** na nova coluna AC.
4. Aguardar a coluna O mostrar **Disponível no Decap**. O processamento verifica pedidos aproximadamente a cada minuto; filas e falhas podem prolongar o prazo.
5. A administração revisa e publica no Decap. O envio não publica a manifestação no portal.

O estagiário não executa scripts, não autoriza acessos técnicos e não recebe/configura token. Para a fila bastam a própria conta Google e o acesso de editor concedido pela administração. A conta GitHub continua servindo para o acesso ao Decap, quando autorizado.

Não usar o envio antigo pelo menu para a mesma linha simultaneamente. Não ordenar, mover ou editar uma linha durante seu processamento. Não ocultar a coluna AC junto com os campos privados ao preparar a visualização de trabalho.

## Separação obrigatória da credencial

Instalar **somente `Central.gs` e `appsscript.json`**, em um projeto Apps Script autônomo, privado e pertencente a `ouvidoriaspublicasbrasileiras@gmail.com`. Não colar esse pacote no projeto vinculado à planilha. Editores da planilha também podem editar seu script vinculado; armazenar uma credencial compartilhada ali não cria uma fronteira segura.

O projeto administrativo separado NÃO deve ser compartilhado com estagiários, colocado em uma pasta compartilhada ou publicado como aplicativo web público. A credencial fica nas propriedades desse projeto, nunca em células, código-fonte, e-mail ou chat.

A configuração abaixo é feita UMA VEZ pela administração, com manutenção de expiração/rotação sob responsabilidade administrativa — não uma vez por estagiário.

## Primeiro teste no Google, sem qualquer envio externo

1. Criar uma planilha **nova de teste**, privada e sem formulário vinculado, com dados fictícios. Reproduzir as duas abas, os 10/28 cabeçalhos e dropdowns/checkboxes definidos em `../Code.gs`. Não copiar respostas reais nem compartilhar a planilha de teste.
2. **Não usar os menus antigos numa cópia integral da planilha real:** um script vinculado copiado pode continuar apontando para o ID real. Os testes desta ponte são feitos exclusivamente pelo projeto privado novo.
3. No projeto privado, cadastrar as propriedades `CENTRAL_PLANILHA_ID` com o ID da planilha fictícia e `CENTRAL_MODO` com `SIMULACAO`. Não cadastrar token nesta etapa.
4. Executar `prepararColunaDePedidosCentral`, pela conta administrativa. Ela acrescenta somente AC e recusa sobrescrever colunas/dados existentes.
5. Marcar pedidos fictícios e executar `simularPedidosCentrais`. A rotina apenas lê e valida: não grava células, não acessa GitHub e não instala temporizador.
6. Conferir casos válidos, consentimento ausente, identificação incompatível, dados privados em campos públicos e pedido sem aprovação.

O pacote bloqueia testes contra o ID da planilha real. Os testes locais de envio/PR são totalmente simulados e não substituem a conferência administrativa no Google.

## Ativação posterior, somente após conferir os testes

1. Na conta GitHub proprietária `clmschwartz-droid`, gerar uma credencial administrativa fine-grained, com expiração definida, acesso somente a `ouvidorias-portal` e **Contents / Pull requests: read and write**. A administração pode usar uma credencial dedicada a essa ponte; não é necessário transferir nem ler a credencial do script antigo. Não revogar a credencial antiga durante a implantação.
2. Conferir visualmente que o projeto Apps Script novo permanece privado. Nas propriedades desse projeto, cadastrar:

| Propriedade | Valor |
|---|---|
| `CENTRAL_PLANILHA_ID` | `10LjwNEblKPbqYZokshSbRxAZKt7BmjidEL4Vb9a66ac` |
| `CENTRAL_GITHUB_TOKEN` | credencial administrativa, inserida diretamente no Google |
| `CENTRAL_PROJETO_PRIVADO` | `CONFERIDO` |
| `CENTRAL_CONFIRMAR_ATIVACAO` | `ATIVAR_ENVIO_CENTRAL_OCULTO` |
| `CENTRAL_MODO` | `PRODUCAO` |

3. Executar `prepararColunaDePedidosCentral`. Apenas AC é acrescentada; as 28 colunas atuais não são movidas nem renomeadas. Nenhuma aprovação antiga é enviada automaticamente: o pedido exige AC marcada.
4. Executar `instalarTemporizadorCentral` uma vez. Ele cria somente o temporizador da ponte no projeto privado. Não remove ou recria gatilhos de formulários/notificações.
5. Acompanhar um primeiro pedido real autorizado, conferir a entrada oculta no Decap e sua ausência no portal. Não usar um formulário real para gerar testes.

Não prometer uma restrição técnica de publicação por usuário: os acessos de escrita GitHub já concedidos não equivalem a um papel exclusivamente de envio. Esta ponte mantém novas entradas `publicado: false`; a revisão final pela administração é o procedimento editorial atual.

## Falhas e pausa

- Erros ficam na coluna Q; o pedido AC é desmarcado. Corrigir/revisar antes de fazer novo pedido. Não há repetição automática de falhas.
- IDs existentes não são duplicados nem republicados. Uma entrada já publicada não é ocultada pela ponte.
- Um ramo determinístico evita vários PRs para o mesmo pedido após falha parcial. Se o PR ficou pendente, conferir/incorporar ou encerrar manualmente antes de repetir; a rotina não sobrescreve esse ramo.
- Alterações na linha antes do envio bloqueiam a chamada ao GitHub; alterações durante o envio exigem conferência do rascunho oculto. Reorganização da fila impede que o retorno seja gravado em outra manifestação.
- Para pausar, executar `pausarEnvioCentral` ou definir `CENTRAL_MODO=SIMULACAO` nas propriedades privadas. O temporizador fica inerte. Formulários, avisos, respostas e envio administrativo antigo continuam intactos. Deixar AC no lugar evita apagar pedidos ou dados.

## Verificação local

```sh
node automacao/fala-ouvidor/central/gerar-pacote.js
node automacao/fala-ouvidor/central/testes.js
node automacao/fala-ouvidor/testes.js
```

O gerador copia os validadores originais e registra o SHA-256 da base. Falha explicitamente se os trechos adaptados mudarem. A ponte não inclui `GmailApp`, o instalador antigo, gatilhos de Forms nem os menus vinculados à planilha.

Referências: [execução dos gatilhos](https://developers.google.com/apps-script/guides/triggers/installable), [scripts vinculados e acessos](https://developers.google.com/apps-script/guides/bound), [propriedades por projeto/usuário](https://developers.google.com/apps-script/guides/properties).
