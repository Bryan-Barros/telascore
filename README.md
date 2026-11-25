# TelaScore

Trabalho prático da disciplina de **Banco de Dados NoSQL**.

**Autores:** Bryan Silva Barros e Pedro Lucas Carvalho Mendes

## Visão do usuário

Exemplo de como o usuário vê um título no TelaScore: nome, gênero, ano, nota média, total de avaliações e as avaliações deixadas por outros usuários.

![Visão do usuário no TelaScore](docs/visao-usuario.png)

## Descrição do sistema

O **TelaScore** é uma aplicação de avaliações de **filmes, séries e jogos**. Qualquer usuário pode dar uma nota de 1 a 5 e escrever um comentário sobre um título. O sistema calcula a nota média e exibe as avaliações de cada título.

## Banco de dados

- **MongoDB Atlas:** banco principal, com os dados permanentes (banco `telascore`).
- **Redis Cloud:** cache de login e estatísticas de uso, em memória.

### Coleções

| Coleção | Conteúdo | Principais campos |
|---|---|---|
| `usuarios` | Pessoas que fazem as avaliações | `apelido`, `email`, `senhaHash`, `criadoEm` |
| `titulos` | Filmes, séries e jogos, com suas avaliações embutidas | `nome`, `tipo`, `genero`, `ano`, `notaMedia`, `totalAvaliacoes`, `avaliacoes[]` |

Cada item da lista `avaliacoes` tem `usuarioId`, `apelido`, `nota`, `comentario` e `data`.

```javascript
{
  nome: "A Odisseia",
  tipo: "filme",
  genero: "Aventura",
  ano: 2026,
  notaMedia: 4.6,
  totalAvaliacoes: 5,
  avaliacoes: [
    { usuarioId: ObjectId("..."), apelido: "cinefilo22", nota: 5, comentario: "Épico do começo ao fim.", data: ISODate("...") }
    // ...
  ]
}
```

### Decisões de modelagem

- **Avaliações embutidas no título:** a tela do título, com suas avaliações, é lida em uma única consulta, e nenhuma consulta do sistema precisa de `$lookup`.
- **Nota média e total salvos no título:** evitam recalcular a média a cada leitura; são atualizados no mesmo comando que insere a avaliação.
- **Uma avaliação por usuário em cada título:** o comando de inserção só altera o título se o usuário ainda não o avaliou.
- **Validação e índices:** `$jsonSchema` garante campos obrigatórios, nota de 1 a 5 e tipo `filme`, `serie` ou `jogo`; há índices para e-mail e apelido únicos, ranking por tipo e busca por nome.
- **LGPD:** do usuário são guardados apenas apelido, e-mail e hash da senha. Os dados de exemplo são fictícios.

## Funcionalidades (pipelines de agregação)

### 1. Ranking dos melhores títulos por tipo

Top 3 de filmes, séries e jogos pela nota média, considerando títulos com pelo menos 3 avaliações.

Pipeline: `$match` → `$sort` → `$group` → `$project` (`$slice`) → `$sort`.

![Pipeline do ranking por tipo no Atlas](docs/atlas-ranking-pipeline.png)

![Resultado do ranking por tipo no Atlas](docs/atlas-ranking-resultado.png)

### 2. Títulos em alta

Títulos mais avaliados nos últimos 30 dias, comparados aos 30 dias anteriores, com a tendência (subindo, caindo ou estável).

Pipeline: `$match` → `$unwind` → `$addFields` → `$match` → `$addFields` → `$group` → `$match` → `$project` → `$sort` → `$limit`.

![Pipeline dos títulos em alta no Atlas](docs/atlas-em-alta-pipeline.png)

![Resultado dos títulos em alta no Atlas](docs/atlas-em-alta-resultado.png)

## Cache e estatísticas (Redis)

- **Cache de login e sessão:** dados de login com validade de 15 minutos e sessão ativa com validade de 1 hora (TTL).
- **Bloom Filter:** verifica rapidamente se um e-mail está cadastrado e se um usuário já avaliou um título.
- **HyperLogLog:** estima quantos usuários únicos acessaram o sistema no dia.
- **Count-Min Sketch:** estima quantas vezes cada título foi visualizado.

![Resultado da execução do script do Redis](docs/redis-resultado.png)

## Estrutura do repositório

```
telascore/
├── README.md
├── docs/                              # imagens usadas neste README
├── package.json                       # dependência do Node.js (biblioteca redis)
├── package-lock.json
└── scripts/
    ├── 01_criar_colecoes.js           # cria o banco, as coleções e os índices
    ├── 02_inserir_exemplos.js         # insere usuários, títulos e avaliações de exemplo
    ├── 03_ranking_por_tipo.js         # funcionalidade 1
    ├── 04_titulos_em_alta.js          # funcionalidade 2
    └── 05_redis_cache_estatisticas.js # cache de login e estatísticas com Redis
```

## Como executar

**MongoDB** (requer [mongosh](https://www.mongodb.com/try/download/shell) e IP liberado no Atlas). Execute os scripts em ordem; a senha é pedida no terminal:

```
mongosh "mongodb+srv://ENDERECO_DO_CLUSTER/" --apiVersion 1 --username SEU_USUARIO --file scripts/01_criar_colecoes.js
```

Repita trocando o arquivo por `02_inserir_exemplos.js`, `03_ranking_por_tipo.js` e `04_titulos_em_alta.js`.

**Redis** (requer [Node.js](https://nodejs.org/) e um banco no Redis Cloud). A senha fica só na variável de ambiente, nunca no código:

```
npm install
$env:REDIS_URI = "redis://default:SUA_SENHA@ENDERECO_DO_REDIS:PORTA"
node scripts/05_redis_cache_estatisticas.js
```