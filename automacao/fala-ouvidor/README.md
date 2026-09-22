# Automação do Fala Ouvidor

Este fluxo mantém as respostas originais no Google e envia ao repositório apenas a versão pública já moderada.

## Fluxo operacional

1. O Google Forms grava a resposta privada.
2. O gatilho `aoReceberManifestacao` cria automaticamente uma linha na aba `Moderação` e envia um aviso para `ouvidoriaspublicasbrasileiras@gmail.com`.
3. A pessoa moderadora edita apenas os campos públicos e seleciona `Aprovado para Decap`.
4. O menu **Fala Ouvidor → Enviar linha selecionada ao Decap** chama um evento protegido no GitHub.
5. O GitHub valida o conteúdo, cria um pull request com `[skip netlify]`, incorpora o rascunho com `publicado: false` e o torna disponível no Decap sem exibi-lo no portal.
6. A publicação efetiva continua exigindo a conferência final no Decap.

## Instalação única no Google

1. Na planilha `Fala Ouvidor — respostas privadas`, abra **Extensões → Apps Script**.
2. Substitua o conteúdo de `Code.gs` pelo arquivo desta pasta e salve.
3. Execute `instalarAutomacao` uma vez e autorize os acessos solicitados usando a conta administrativa.
4. Crie um token GitHub *fine-grained* com:
   - proprietário `clmschwartz-droid`;
   - acesso somente a `ouvidorias-portal`;
   - permissão de repositório **Contents: Read and write**;
   - prazo de expiração definido.
5. Na planilha, use **Fala Ouvidor → Configurar credencial GitHub**. A credencial fica em `UserProperties`, acessível somente ao usuário que a cadastrou.
6. Em Gmail → Configurações → Contas e importação → Enviar e-mail como, adicione e valide `ouvidorias@camargoegomes.com`. A automação se recusa a preparar respostas pelo Gmail administrativo enquanto esse endereço não estiver habilitado.

Nunca compartilhe o token GitHub por e-mail, chat ou células da planilha.

