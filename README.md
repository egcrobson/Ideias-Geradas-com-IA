# 💡 Ideias Geradas com IA

Coleção de **projetos diferentes e independentes** criados com a ajuda do Claude (Anthropic). Cada projeto fica em sua própria pasta, com um `README.md` explicando o que faz e como usar.

## Projetos

| Projeto | Tipo | Descrição |
|---|---|---|
| [🛡️ Sentinela](sentinela/) | Extensão de navegador (Chrome/Edge/Brave) | Monitora a navegação em busca de phishing, malware e sites suspeitos e gera relatórios em CSV, JSON e PDF. |

## Organização

```
Ideias-Geradas-com-IA/
├── README.md        # este arquivo (índice dos projetos)
├── CLAUDE.md        # regras do repositório (lidas pelo Claude)
├── _modelo/         # modelo de README para novos projetos
├── sentinela/       # projeto 1
└── ...              # próximos projetos, cada um na sua pasta
```

### Para adicionar um projeto novo
1. Crie uma pasta na raiz com o nome do projeto (minúsculas e hífens).
2. Coloque todos os arquivos do projeto dentro dela.
3. Crie o `README.md` do projeto a partir de [`_modelo/README.md`](_modelo/README.md).
4. Adicione uma linha na tabela **Projetos** acima.

## Segurança

Nenhuma chave de API ou senha é guardada neste repositório. Quando um projeto precisa de chave, ela é configurada pelo próprio usuário (veja o README de cada projeto).
