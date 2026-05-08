# Env Marker

Extensão Chrome que adiciona uma barra colorida fixa no topo (ou rodapé) de qualquer página, baseada em regras de URL configuráveis. Ideal para distinguir ambientes de produção, staging e desenvolvimento de relance, evitando operações no ambiente errado.

---

## Funcionalidades

- Barra colorida fixa com pontinho indicador
- Altura, fonte e posição ajustáveis (topo ou rodapé)
- Borda lateral sutil na cor do ambiente ativo
- Regras por substring, wildcard (`*`) ou regex (`/pattern/`)
- Prefixo automático no título da aba (ex: `[PRODUÇÃO] Dashboard`)
- Funciona em SPAs — detecta mudanças de URL sem reload
- Sincronização de regras entre dispositivos via `chrome.storage.sync`
- Exportar e importar configuração em JSON
- Quick-add: cria uma regra para a aba atual com um clique no popup
- Suporte a aba anônima (requer habilitação manual)

---

## Instalação

1. Baixe ou clone este repositório e mantenha a pasta em um local permanente
2. Abra `chrome://extensions/`
3. Ative o **Modo de desenvolvedor** no canto superior direito
4. Clique em **Carregar sem compactação** e selecione a pasta `env-marker`
5. Clique no ícone da extensão na barra do Chrome e acesse **Configurar regras**

### Aba anônima

Por padrão o Chrome bloqueia extensões em modo anônimo. Para habilitar:

1. Acesse `chrome://extensions/`
2. Encontre **Env Marker** e clique em **Detalhes**
3. Ative **Permitir em modo anônimo**

---

## Padrões de URL

| Tipo | Exemplo | Comportamento |
|------|---------|---------------|
| Substring | `app.example.com` | Match em qualquer parte da URL (case-insensitive) |
| Wildcard | `*.example.com/project/*` | `*` substitui qualquer sequência de caracteres |
| Regex | `/-prd\b\|production/` | Expressão regular JS entre barras |

A primeira regra que casar com a URL vence. Ordene da mais específica para a mais genérica usando o handle ⋮⋮ para arrastar.

---

## Regras padrão

Incluídas no primeiro acesso como ponto de partida — ajuste para os domínios da sua organização:

| Padrão | Label | Cor |
|--------|-------|-----|
| `/-prd\b\|\bprod\b\|production/` | PRODUÇÃO | Vermelho |
| `/-stg\b\|staging\|-snb\b\|sandbox/` | STAGING | Amarelo |
| `/-dev\b\|-hml\b\|homolog/` | DEV / HOMOLOG | Verde |
| `localhost` | LOCAL | Azul |

---

## Dicas de uso

- Coloque regras de produção no topo da lista com padrões específicos (domínios exatos)
- Use o botão **Testar** em cada regra para verificar o match contra a aba ativa
- Ative **Prefixar título** para produção: facilita identificar a aba ao alternar com `Cmd/Ctrl+Tab`
- Para serviços com múltiplos projetos, crie regras por path: `dashboard.example.com/project/abc123`

---

## Estrutura do projeto

```
env-marker/
├── manifest.json
├── content.js          # injeta a barra nas páginas
├── content.css         # estilos da barra
├── options.html/css/js # página de configuração
├── popup.html/js       # popup do ícone
└── icons/
```

---

## Limitações

- Não funciona em páginas internas do Chrome (`chrome://`, `chrome-extension://`) — restrição da plataforma
- Em sites com Content Security Policy restrita a barra pode não renderizar; a borda lateral ainda é aplicada nesses casos

---

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Licença

MIT

---

Desenvolvido por **Leonardo Carnauba**
