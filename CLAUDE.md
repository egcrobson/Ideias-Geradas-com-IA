# Instruções para o Claude neste repositório

Este repositório reúne **vários projetos diferentes e independentes** criados com IA (extensões, sites, scripts, ferramentas etc.). Ao adicionar ou alterar um projeto, siga estas regras:

## Estrutura
- **Cada projeto fica na sua própria pasta na raiz**, com nome curto em minúsculas e hífens (ex.: `sentinela/`, `controle-financeiro/`).
- Nunca misture arquivos de projetos diferentes, nem coloque arquivos de projeto soltos na raiz.
- Dentro de cada projeto, organize o código em subpastas por função (ex.: `lib/`, `pages/`, `ui/`, `assets/`, `src/`), conforme fizer sentido para o tipo de projeto.
- Cada projeto é autocontido: tem suas próprias dependências e configurações dentro da pasta dele.

## Documentação (obrigatória)
- Todo projeto tem um `README.md` na sua pasta, em português, com: o que faz, funcionalidades, estrutura de pastas, como instalar/usar, chaves necessárias (se houver), privacidade e limitações.
- Ao criar um projeto novo, **adicione uma linha na tabela "Projetos" do `README.md` da raiz** (nome com link para a pasta, tipo, descrição curta).
- Use o modelo em `_modelo/README.md` como ponto de partida.

## Segurança
- **Nunca** coloque chaves de API, tokens, senhas ou dados pessoais no código. Antes de cada commit, procure por chaves e remova.
- Chaves devem ser configuradas pelo usuário (tela de configurações, variável de ambiente ou arquivo `.env` ignorado pelo git) e documentadas no README do projeto.
- O repositório é **público**.

## Commits
- Mensagens de commit em português, citando o projeto: `sentinela: corrige download da lista URLhaus`.
- Não versionar arquivos gerados: `.zip`, `node_modules/`, builds, `.env`.
