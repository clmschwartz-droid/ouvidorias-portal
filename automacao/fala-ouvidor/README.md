# Automação do Fala Ouvidor

Este fluxo mantém as respostas originais no Google e envia ao repositório apenas a versão pública já moderada.

## Fluxo operacional

1. O Google Forms grava a resposta privada.
2. O gatilho `aoReceberManifestacao` cria automaticamente uma linha na aba `Moderação`, converte a preferência de identificação (`Identidade preservada`, iniciais ou nome completo) para o padrão público correspondente e envia um aviso para `ouvidoriaspublicasbrasileiras@gmail.com`.
3. A coluna `Observações internas` registra se o aviso automático foi enviado ou falhou. A pessoa moderadora edita apenas os campos públicos e seleciona `Aprovado para Decap`.
4. O menu **Fala Ouvidor → Enviar linha selecionada ao Decap** cria e incorpora um pull request protegido no GitHub.
5. Somente os campos públicos moderados entram no pull request; o rascunho recebe `publicado: false` e fica disponível no Decap sem aparecer no portal.
6. A publicação efetiva continua exigindo a conferência final no Decap.

## Instalação única no Google

1. Na planilha `Fala Ouvidor — respostas privadas`, abra **Extensões → Apps Script**.
2. Substitua o conteúdo de `Code.gs` pelo arquivo desta pasta e salve.
3. Execute `instalarAutomacao` uma vez e autorize os acessos solicitados usando a conta administrativa.
4. Crie um token GitHub *fine-grained* com:
   - proprietário `clmschwartz-droid`;
   - acesso somente a `ouvidorias-portal`;
   - permissão de repositório **Contents: Read and write**;
   - permissão de repositório **Pull requests: Read and write**;
   - prazo de expiração definido.
5. Na planilha, use **Fala Ouvidor → Configurar credencial GitHub**. A credencial fica em `UserProperties`, acessível somente ao usuário que a cadastrou.
6. Em Gmail → Configurações → Contas e importação → Enviar e-mail como, adicione e valide `ouvidorias@camargoegomes.com`. A automação se recusa a preparar respostas pelo Gmail administrativo enquanto esse endereço não estiver habilitado.

## Proteções de privacidade

- `Identidade preservada` permanece obrigatoriamente anônima na versão pública.
- `Somente iniciais` é convertido automaticamente a partir do nome privado, ignorando partículas como `de`, `da`, `do` e `e` (por exemplo, `João da Silva` vira `J. S.`). A moderação ainda pode optar pela proteção mais forte, `Identidade preservada`, mas nunca pelo nome completo.
- O envio ao Decap é bloqueado se a identificação pública contrariar a preferência registrada, ou se algum campo público contiver o e-mail ou o nome completo do manifestante quando não houver autorização para publicá-lo.
- Nome, e-mail, preferência original e confirmações permanecem exclusivamente na planilha privada e nunca entram no repositório.

## Integridade do mapeamento

- A automação confere os 10 cabeçalhos da aba de respostas e os 28 cabeçalhos da aba `Moderação` antes da instalação, da verificação, da recuperação e dos comandos editoriais. Mudanças de ordem ou nome interrompem o fluxo com erro explícito, evitando deslocamento silencioso de dados.
- Antes de escrever uma linha, a automação também confere os dropdowns de decisão, categoria, situação e fluxo, além das duas caixas de seleção. Se uma validação for alterada, o processamento é interrompido antes de gravar um registro parcial.
- As sete categorias atuais do formulário são convertidas para as seis categorias aceitas pelo Decap. Uma categoria futura ou desconhecida cai preventivamente em `Outro` e gera alerta em `Observações internas`.
- Uma preferência de identificação futura ou desconhecida cai preventivamente em `Identidade preservada` e também gera alerta interno.
- O payload é validado antes de qualquer chamada ao GitHub: chaves inesperadas, categoria, situação, datas, consentimentos ou identificação incompatíveis bloqueiam o envio.
- Se um aviso falhar por cota ou indisponibilidade temporária, selecione a manifestação e use **Fala Ouvidor → Reenviar aviso da linha selecionada**. Cada tentativa fica registrada em `Observações internas`.

### Matriz automatizada

Execute na raiz do repositório:

```sh
node automacao/fala-ouvidor/testes.js
```

O teste percorre 567 combinações (7 categorias × 27 UFs × 3 preferências de identificação), além de consentimentos, vazamentos de nome/e-mail, opções desconhecidas, alterações de cabeçalhos/dropdowns e compatibilidade com o esquema do Decap.

## Recuperação de uma resposta pendente

Se uma resposta aparecer na aba `Respostas ao formulário 1`, mas não entrar em `Moderação`, use **Fala Ouvidor → Recuperar manifestações pendentes**. A rotina localiza as respostas pela coluna `Linha da resposta privada`, cria apenas as linhas ausentes e tenta reenviar o aviso por e-mail. Ela não duplica manifestações já processadas e não exige copiar e colar dados privados.

Nunca compartilhe o token GitHub por e-mail, chat ou células da planilha.
