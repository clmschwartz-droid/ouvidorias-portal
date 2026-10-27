# Notícias e Cursos: publicação individual

Cada notícia, curso ou evento agora é uma entrada própria no Decap, mantida
em um arquivo de `_data/noticias/`. Rascunho, revisão e publicação pertencem
somente à matéria aberta. Não há mais uma entrada única “Itens publicados”
que reúna todas as matérias numa mesma publicação.

## Publicar, revisar e retirar do ar

1. Recarregue `/admin/` após esta atualização e abra **Notícias e Cursos**.
2. Abra a matéria desejada ou crie uma nova entrada. Salve como rascunho e
   encaminhe para revisão normalmente; as outras matérias não acompanham.
3. Para colocá-la no site, mantenha **Exibir no portal** ativado e publique
   essa entrada pelo fluxo editorial do Decap.
4. Para retirá-la temporariamente, desative **Exibir no portal**, salve e
   **publique essa alteração**. O texto, as imagens e os anexos são mantidos.
5. Para recolocar a matéria, ative a opção e publique novamente.

Voltar uma edição para rascunho ou revisão não retira a versão que já foi
publicada: esses estados controlam as alterações pendentes. Isso vale também
para a opção de visibilidade; apenas salvar a mudança não altera o site.

## Entrega pública e testes

O portal continua consumindo `conteudo/noticias.json`, com o mesmo formato
`{"items": [...]}` e a mesma filtragem por `publicado`. O arquivo-fonte desse
endereço é um template Liquid: o Jekyll que já é executado pelo GitHub Pages
reúne os JSONs de `_data/noticias/` durante o build. Não há sincronizador,
commit automático, token novo, alteração do provedor de login ou mudança
nas automações de inscrições e Fala Ouvidor.

Não edite o agregado manualmente nem publique a antiga revisão
`cms/noticias/itens`. Os sete textos da migração estão preservados em
arquivos individuais; a Rede Europeia foi ocultada a pedido da administração.
A revisão antiga está preservada no histórico do PR #101 e deve ser
substituída pela revisão individual da Rede Europeia, conservando a data
pendente de 27/10/2026.

`node automacao/noticias/testes.js` verifica isolamento editorial e
visibilidade no renderizador real do portal. O workflow também executa o
build oficial do Pages e compara o JSON gerado, campo a campo, com os
arquivos editoriais: `node automacao/noticias/testes.js --site _site`.
Previews que apenas servem arquivos crus, sem Jekyll, precisam de um build
antes de servir o agregado.
