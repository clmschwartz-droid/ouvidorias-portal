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

Antes do merge final, testar em cada uma das três coleções o ciclo completo: ocultar um item, salvar como rascunho, conferir o Deploy Preview, publicar, reexibir o item e confirmar que nenhum arquivo ou metadado foi perdido.

Enquanto a autenticação dedicada ao endereço oficial não for concluída, a configuração existente deve permanecer intacta. A troca do provedor exige uma URL de autenticação e uma credencial OAuth válidas; não deve ser simulada com valores provisórios na versão pública.

## Fala Ouvidor: separação entre conteúdo privado e público

O relato recebido e sua versão publicada são registros diferentes.

### Registro privado

Deve ser armazenado fora deste repositório e acessível somente às pessoas responsáveis pela moderação. Pode conter nome, e-mail, relato integral, anexos, consentimentos, datas e histórico de contato.

Requisitos mínimos do serviço de recebimento:

- conexão HTTPS;
- validação dos campos no servidor;
- proteção antispam e limitação de tentativas;
- verificação da origem `https://ouvidoriasbrasileiras.com.br`;
- identificador ou protocolo para cada envio;
- registro da versão do formulário e dos consentimentos;
- controle de acesso à caixa de moderação;
- política de retenção e exclusão;
- notificação para o endereço institucional, sem expor o conteúdo completo em assunto de e-mail;
- logs sem conteúdo pessoal desnecessário.

O formulário espera um endpoint HTTPS no atributo `data-endpoint` de `#fala-ouvidor-form`. Uma resposta bem-sucedida pode retornar:

```json
{
  "ok": true,
  "protocolo": "FO-2026-0001"
}
```

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

Os integrantes são mantidos em `conteudo/conselho-curador.json`. O botão e a seção permanecem ocultos enquanto a lista estiver vazia. Assim, a estrutura pode ser preparada antes da entrega dos nomes sem produzir uma página pública incompleta.

## Itens que dependem de configuração externa

- criação e teste do e-mail institucional;
- escolha e ativação do serviço privado de recebimento;
- credenciais de autenticação do `/admin/`;
- configuração antispam;
- definição da política de privacidade e retenção;
- GoatCounter e eventual serviço de newsletter.

Esses valores não devem ser gravados diretamente em arquivos públicos quando forem secretos.
