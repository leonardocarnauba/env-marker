# Contribuindo com o Env Marker

## Carregando em modo dev

1. Clone o repositório ou baixe a pasta `env-marker`
2. Abra `chrome://extensions/`
3. Ative **Modo de desenvolvedor** (canto superior direito)
4. Clique em **Carregar sem compactação** e selecione a pasta `env-marker`
5. A extensão aparecerá na barra do Chrome — clique no ícone e depois em **Configurar regras**

Qualquer edição nos arquivos fonte fica ativa após clicar em **Atualizar** (ícone 🔄) na página de extensões. Para mudanças no `content.js` ou `content.css`, recarregue também a aba onde está testando.

## Teste manual

Antes de abrir um PR, verifique:

- [ ] Barra aparece na URL que casa com a regra
- [ ] Barra some ao desativar a extensão pelo popup
- [ ] Barra atualiza sem reload ao salvar alterações nas configurações
- [ ] Quick-add pelo popup cria a regra corretamente
- [ ] Export → Import mantém as configurações intactas
- [ ] Drag & drop reordena as regras
- [ ] Botão **Testar** retorna o resultado correto para a aba ativa

## Estrutura do projeto

```
env-marker/
├── manifest.json       # MV3 — permissões e pontos de entrada
├── content.js          # injetado em todas as páginas — renderiza a barra
├── content.css         # estilos da barra (usa CSS custom properties)
├── popup.html/js       # popup do ícone — toggle + quick-add
├── options.html/css/js # página de configuração completa
└── icons/              # 16, 48, 128 px
```

## Padrões de código

- Sem dependências externas e sem build step — o projeto roda direto do fonte
- `testPattern` existe em `content.js`, `options.js` e `popup.js` — ao alterar a lógica de matching, atualize os três
- Não use `innerHTML` para inserir conteúdo vindo do usuário
- Mantenha compatibilidade com Chrome MV3

## Reportando bugs

Abra uma issue descrevendo: URL que causou o problema, regra configurada, e comportamento esperado vs. observado.
