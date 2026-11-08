# TelaScore

Trabalho prático da disciplina de **Banco de Dados NoSQL**.

**Autores:** Bryan Silva Barros e Pedro Lucas

## Descrição do sistema

O **TelaScore** é uma aplicação de avaliações de **filmes, séries e jogos**. Qualquer usuário pode dar uma nota de 1 a 5 e escrever um comentário sobre um título. O sistema calcula a nota média e exibe as avaliações de cada título.

### Funcionalidade principal

- Avaliar um título (nota de 1 a 5 + comentário).
- Consultar a nota média e o total de avaliações de cada título.
- Listar os títulos por tipo (filme, série ou jogo) e por nota.

## Banco de dados

- **Banco:** MongoDB (orientado a documentos), hospedado no **MongoDB Atlas**.
- **Nome do banco:** `telascore`

### Coleções

| Coleção | Conteúdo | Principais campos |
|---|---|---|
| `usuarios` | Pessoas que fazem as avaliações | `apelido`, `email`, `senhaHash`, `criadoEm` |
| `titulos` | Filmes, séries e jogos | `nome`, `tipo`, `genero`, `ano`, `notaMedia`, `totalAvaliacoes` |
| `avaliacoes` | Notas e comentários | `tituloId`, `usuarioId`, `apelido`, `nota`, `comentario`, `data` |

### Decisões de modelagem

- **Referência em vez de documento embutido:** as avaliações ficam em uma coleção própria e apontam para o título e o usuário pelo `_id`, porque podem crescer sem limite (um documento no MongoDB tem limite de 16 MB).
- **Desnormalização:** `notaMedia` e `totalAvaliacoes` ficam salvos no título para leitura rápida, e o `apelido` é copiado na avaliação para exibição sem consultar outra coleção.
- **Validação de esquema (`$jsonSchema`):** campos obrigatórios, nota entre 1 e 5 e tipo restrito a `filme`, `serie` ou `jogo`.
- **Índices:** e-mail e apelido únicos; índice único em `tituloId + usuarioId` (cada usuário avalia um título apenas uma vez); índice para ranking por tipo e nota.
- **Proteção de dados (LGPD):** do usuário são armazenados apenas os dados necessários (apelido, e-mail e hash da senha). A senha nunca é guardada em texto puro. Os dados de exemplo são fictícios.

## Funcionalidades (pipelines de agregação)

### 1. Ranking dos melhores títulos por tipo (`03_ranking_por_tipo.js`)

Mostra o top 3 de filmes, séries e jogos pela nota média, considerando apenas títulos com no mínimo 3 avaliações, para que um título com uma única nota alta não lidere o ranking.

Pipeline: `$group` (média e total por título) → `$match` (mínimo de avaliações) → `$lookup` + `$unwind` (nome e tipo do título) → `$sort` (maior média) → `$group` (agrupa por tipo com `$push`) → `$project` com `$slice` (primeiros colocados) → `$sort`.

Foco: **dois agrupamentos em sequência**, junção entre coleções e ordenação.

### 2. Títulos em alta (`04_titulos_em_alta.js`)

Lista os títulos mais avaliados nos últimos 30 dias e compara com os 30 dias anteriores, indicando se estão subindo, caindo ou estáveis, além da nota média recente.

Pipeline: `$addFields` com `$dateSubtract` e `$$NOW` (início de cada período) → `$match` com `$expr` (últimos 60 dias) → `$addFields` com `$cond` (classifica em período atual ou anterior) → `$group` com somas condicionais → `$match` → `$lookup` + `$unwind` → `$project` com `$subtract` e `$switch` (variação e tendência) → `$sort` → `$limit`.

Foco: **análise temporal**, com datas calculadas a partir do momento da consulta e contagens condicionais.

## Estrutura do repositório

```
telascore/
├── README.md
└── scripts/
    ├── 01_criar_colecoes.js    # cria o banco, as coleções (com validação) e os índices
    ├── 02_inserir_exemplos.js  # insere documentos de exemplo e calcula a nota média
    ├── 03_ranking_por_tipo.js  # funcionalidade 1: ranking dos melhores títulos por tipo
    └── 04_titulos_em_alta.js   # funcionalidade 2: títulos em alta nos últimos 30 dias
```

## Como executar

Pré-requisitos: [mongosh](https://www.mongodb.com/try/download/shell) instalado e acesso a um cluster no MongoDB Atlas (com o IP liberado em *Network Access*).

Na pasta do projeto, execute os scripts em ordem. A senha é pedida no terminal e **não fica salva em nenhum arquivo**:

```
mongosh "mongodb+srv://ENDERECO_DO_CLUSTER/" --apiVersion 1 --username SEU_USUARIO --file scripts/01_criar_colecoes.js
mongosh "mongodb+srv://ENDERECO_DO_CLUSTER/" --apiVersion 1 --username SEU_USUARIO --file scripts/02_inserir_exemplos.js
mongosh "mongodb+srv://ENDERECO_DO_CLUSTER/" --apiVersion 1 --username SEU_USUARIO --file scripts/03_ranking_por_tipo.js
mongosh "mongodb+srv://ENDERECO_DO_CLUSTER/" --apiVersion 1 --username SEU_USUARIO --file scripts/04_titulos_em_alta.js
```

> Atenção: os scripts apagam os dados existentes nas coleções antes de recriá-los.

> As datas das avaliações de exemplo são relativas ao dia da execução do script 02. Para os títulos em alta refletirem os dados de exemplo, execute o script 02 novamente antes do 04 se tiver passado muito tempo.

Resultado esperado do script 02: 6 usuários, 9 títulos (3 filmes, 3 séries e 3 jogos) e 30 avaliações, com a nota média de cada título calculada.