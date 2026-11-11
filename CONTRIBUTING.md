# Contribuindo com o Env Marker

## Fluxo de branches

- `main` — versão estável (o que os usuários instalam)
- `development` — integração; **abra seus PRs contra `development`**
- Crie sua branch a partir de `development` (`feat/...`, `fix/...`)
- Quando `development` estiver estável, ela é mesclada em `main` junto com o bump de versão no `manifest.json`

## Carregando em modo dev

1. Clone o repositório ou baixe a pasta `env-marker`
2. Abra `chrome://extensions/`
3. Ative **Modo de desenvolvedor** (canto superior direito)
4. Clique em **Carregar sem compactação** e selecione a pasta `env-marker`
5. A extensão aparecerá na barra do Chrome — clique no ícone e depois em **Configurar regras**

Qualquer edição nos arquivos fonte fica ativa após clicar em **Atualizar** (ícone 🔄) na página de extensões. Para mudanças no `content.js`, `content.css` ou `shared.js`, recarregue também a aba onde está testando.

## Testes automatizados

A lógica de match e validação (`shared.js`) tem testes sem dependências:

```
node --test tests/*.test.js
```

## Teste manual

Antes de abrir um PR, verifique:

- [ ] Instalação nova já mostra a barra **LOCAL** em `localhost` (regras padrão gravadas)
- [ ] Barra aparece na URL que casa com a regra
- [ ] Barra some ao desativar a extensão pelo popup ou pelas configurações
- [ ] Barra atualiza sem reload ao salvar alterações nas configurações
- [ ] Headers fixos do site descem com a barra no topo; rodapés fixos sobem com a barra no rodapé
- [ ] Prefixo do título aparece e some ao navegar para uma URL sem a regra
- [ ] Quick-add pelo popup cria a regra corretamente
- [ ] Export → Import mantém as configurações intactas
- [ ] Drag & drop pelo handle ⋮⋮ reordena as regras
- [ ] Botão **Testar** retorna o resultado correto

## Estrutura do projeto

```
env-marker/
├── manifest.json       # MV3 — permissões e pontos de entrada
├── shared.js           # match de URL, regras padrão e validação — fonte única
├── background.js       # service worker — grava as regras padrão na instalação
├── content.js          # injetado em todas as páginas — renderiza a barra
├── content.css         # estilos da barra (usa CSS custom properties)
├── popup.html/js       # popup do ícone — toggle + quick-add
├── options.html/css/js # página de configuração completa
├── tests/              # testes de shared.js (node --test)
└── icons/              # 16, 48, 128 px
```

## Padrões de código

- Sem dependências externas e sem build step — o projeto roda direto do fonte
- Toda lógica de matching e validação fica em `shared.js` (global `EnvMarker`); não duplique nos outros arquivos
- Não use `innerHTML` para inserir conteúdo vindo do usuário
- Mantenha compatibilidade com Chrome MV3

## Reportando bugs

Abra uma issue descrevendo: URL que causou o problema, regra configurada, e comportamento esperado vs. observado.
