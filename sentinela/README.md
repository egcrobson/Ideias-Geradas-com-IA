# 🛡️ Sentinela — Monitor de Navegação Segura

Extensão para **Chrome, Edge e Brave** (Manifest V3) que verifica cada site visitado, redirecionamento e download em busca de **phishing, malware e sites suspeitos**, e gera **relatórios exportáveis** (CSV, JSON e PDF).

Todos os dados ficam apenas no seu navegador.

---

## ✨ Funcionalidades

- **Monitoramento automático** de sites visitados, redirecionamentos, downloads e de scripts/iframes carregados de endereços perigosos.
- **Listas públicas de ameaças**, atualizadas a cada 6 horas e consultadas localmente:
  - [URLhaus](https://urlhaus.abuse.ch/) (abuse.ch) — malware *(precisa de chave gratuita)*
  - [OpenPhish](https://openphish.com/) — phishing
  - [Phishing Army](https://phishing.army/) — phishing
- **Regras próprias (heurísticas)**:
  - sites que imitam marcas: `g00gle.com`, `paypa1.com`, `nubank-seguranca.com`… (inclui bancos e lojas brasileiras)
  - domínios registrados há poucos dias (consulta RDAP)
  - endereço IP no lugar do domínio, `@` na URL, extensões de domínio muito usadas em golpes
  - arquivos executáveis disfarçados (`fatura.pdf.exe`, caractere invisível no nome)
  - páginas que pedem senha sem HTTPS ou em domínio suspeito
- **Google Safe Browsing** *(opcional)*.
- **Proteção**: bloqueia sites listados com uma página de aviso, cancela downloads perigosos e mostra notificações.
- **Relatório**: filtros por período, risco, tipo e busca; gráfico de alertas por dia; domínios e motivos mais frequentes; exportação em **CSV** (abre no Excel), **JSON** e **PDF**.

---

## 📁 Estrutura do projeto

```
sentinela/
├── manifest.json        # Configuração da extensão
├── background.js        # Service worker: monitora navegação e downloads
├── content.js           # Detecta campos de senha nas páginas
├── README.md
├── icons/               # Ícones da extensão
├── lib/                 # Lógica (sem interface)
│   ├── rules.js         # Heurísticas de análise de URLs e arquivos
│   ├── feeds.js         # Download e consulta das listas de ameaças
│   ├── idb.js           # Armazenamento do histórico (IndexedDB)
│   └── settings.js      # Configurações padrão
├── pages/               # Páginas da extensão
│   ├── popup.html       # Janela do ícone
│   ├── report.html      # Relatório
│   ├── options.html     # Configurações
│   └── warning.html     # Aviso de site bloqueado
└── ui/                  # Scripts e estilos das páginas
    ├── popup.js
    ├── report.js / report.css
    ├── options.js
    ├── warning.js
    └── styles.css
```

---

## 🚀 Instalação

1. Baixe esta pasta (**Code › Download ZIP** no GitHub) e descompacte num lugar fixo.
2. Abra `chrome://extensions` (no Edge: `edge://extensions`).
3. Ative o **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação** e selecione a pasta `sentinela` (a que contém o `manifest.json`).
5. Clique no ícone de quebra-cabeça da barra e **fixe** o Sentinela.

Para atualizar depois de mudar os arquivos, clique em **recarregar** (seta circular) no cartão da extensão.

---

## 🔑 Chaves de API (opcionais)

**Nenhuma chave fica no código.** Elas são digitadas na página de Configurações e salvas só no navegador (`chrome.storage.local`).

| Chave | Para quê | Como conseguir |
|---|---|---|
| abuse.ch Auth-Key | Liberar a lista URLhaus | Entre em [auth.abuse.ch](https://auth.abuse.ch/) com Google/GitHub/X/LinkedIn e gere a chave |
| Google Safe Browsing API | Consultar a base de ameaças do Google | [Google Cloud Console](https://console.cloud.google.com/) › ative *Safe Browsing API* › *Credenciais › Chave de API* |

Sem as chaves, as outras listas e as regras próprias funcionam normalmente.

---

## 🔒 Privacidade

- O histórico fica só no navegador (IndexedDB) e é apagado automaticamente após o período escolhido (padrão: 30 dias).
- Saem do computador apenas:
  - o download das listas de ameaças;
  - o **nome do domínio** para `rdap.org` (idade do domínio — por padrão, só para sites já suspeitos);
  - a URL visitada para o Google Safe Browsing, **se** você configurar a chave.

---

## ⚠️ Limitações

- Não substitui um antivírus.
- As heurísticas podem gerar falsos positivos — use **"Adicionar à lista de confiança"** no ícone ou nas Configurações.

---

*Projeto criado com a ajuda do Claude (Anthropic).*
