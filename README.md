# TelaScore

Trabalho prático da disciplina de **Banco de Dados NoSQL**.

**Autores:** Bryan Silva Barros e Pedro Lucas Carvalho Mendes

## Visão do usuário

Exemplo de como o usuário vê um título no TelaScore: nome, gênero, ano, nota média, total de avaliações e as avaliações deixadas por outros usuários.

![Visão do usuário no TelaScore](docs/visao-usuario.png)

## Evidências

| Evidência | Onde está neste README | Arquivo |
|---|---|---|
| Visão do usuário | [Visão do usuário](#visão-do-usuário) | `docs/visao-usuario.png` |
| Ranking por tipo no Atlas | [Funcionalidade 1](#1-ranking-dos-melhores-títulos-por-tipo-03_ranking_por_tipojs) | `docs/atlas-ranking-pipeline.png` e `docs/atlas-ranking-resultado.png` |
| Títulos em alta no Atlas | [Funcionalidade 2](#2-títulos-em-alta-04_titulos_em_altajs) | `docs/atlas-em-alta-pipeline.png` e `docs/atlas-em-alta-resultado.png` |
| Execução do script do Redis | [Evidência de execução do Redis](#evidência-de-execução-do-redis) | `docs/redis-resultado.png` |

## Descrição do sistema

O **TelaScore** é uma aplicação de avaliações de **filmes, séries e jogos**. Qualquer usuário pode dar uma nota de 1 a 5 e escrever um comentário sobre um título. O sistema calcula a nota média e exibe as avaliações de cada título.

### Funcionalidade principal

- Avaliar um título (nota de 1 a 5 + comentário).
- Consultar a nota média e o total de avaliações de cada título.
- Listar os títulos por tipo (filme, série ou jogo) e por nota.

## Banco de dados

- **Banco principal:** MongoDB (orientado a documentos), hospedado no **MongoDB Atlas**.
- **Cache e estatísticas:** Redis (em memória), hospedado no **Redis Cloud**.
- **Nome do banco:** `telascore`

### Coleções

O banco tem **duas coleções**. As avaliações ficam **embutidas** dentro de cada título, em uma lista.

| Coleção | Conteúdo | Principais campos |
|---|---|---|
| `usuarios` | Pessoas que fazem as avaliações | `apelido`, `email`, `senhaHash`, `criadoEm` |
| `titulos` | Filmes, séries e jogos, cada um com suas avaliações | `nome`, `tipo`, `genero`, `ano`, `notaMedia`, `totalAvaliacoes`, `avaliacoes[]` |

Cada item da lista `avaliacoes` tem: `usuarioId`, `apelido`, `nota`, `comentario` e `data`.

Exemplo de documento da coleção `titulos` (resumido):

```javascript
{
  _id: ObjectId("..."),
  nome: "A Odisseia",
  tipo: "filme",
  genero: "Aventura",
  ano: 2026,
  notaMedia: 4.6,
  totalAvaliacoes: 5,
  avaliacoes: [
    { usuarioId: ObjectId("..."), apelido: "cinefilo22", nota: 5, comentario: "Épico do começo ao fim.", data: ISODate("...") },
    { usuarioId: ObjectId("..."), apelido: "maratonista", nota: 4, comentario: "Longo, mas vale a pena.", data: ISODate("...") }
    // ...
  ]
}
```

### Decisões de modelagem

- **Avaliações embutidas no título:** a principal tela do sistema mostra um título com suas avaliações (ver *Visão do usuário*). Guardando tudo no mesmo documento, essa tela é lida em **uma única consulta**, seguindo a ideia de agregado: dados lidos juntos ficam juntos.
- **Análise de `$lookup`:** na versão anterior, as avaliações ficavam em uma coleção separada e as duas funcionalidades da etapa 3 precisavam de `$lookup` (junção entre coleções) para buscar o nome e o tipo do título. Além disso, a avaliação repetia campos do título. Com as avaliações embutidas, **nenhuma consulta do sistema usa `$lookup`** e não há dados do título duplicados.
- **Desnormalização:** `notaMedia` e `totalAvaliacoes` ficam salvos no título para leitura rápida (o ranking usa esses campos direto), e o `apelido` do usuário é copiado em cada avaliação para exibição sem consultar a coleção `usuarios`.
- **Atualização atômica:** uma nova avaliação é adicionada à lista e a nota média é recalculada **no mesmo comando** (`updateOne` com pipeline), já que tudo está no mesmo documento.
- **Uma avaliação por usuário em cada título:** garantida no próprio comando de inserção, que só altera o título se ainda não existir avaliação daquele usuário (`"avaliacoes.usuarioId": { $ne: usuarioId }`).
- **Usuários em coleção separada:** o usuário existe independentemente dos títulos (faz login e avalia vários títulos), por isso não é embutido.
- **Validação de esquema (`$jsonSchema`):** campos obrigatórios, nota entre 1 e 5, tipo restrito a `filme`, `serie` ou `jogo` e estrutura de cada avaliação da lista.
- **Índices:** e-mail e apelido únicos em `usuarios`; em `titulos`, índice para ranking por tipo e nota, índice por nome e índice *multikey* em `avaliacoes.usuarioId` (encontra os títulos avaliados por um usuário).
- **Proteção de dados (LGPD):** do usuário são armazenados apenas os dados necessários (apelido, e-mail e hash da senha). A senha nunca é guardada em texto puro. Os dados de exemplo são fictícios.

### Limitações conhecidas

- **Tamanho do documento:** um documento no MongoDB tem limite de 16 MB (cerca de 60 mil avaliações por título). Para a escala do TelaScore, isso é suficiente. Se um título passasse a receber avaliações em grande volume, a evolução seria manter só as avaliações mais recentes no título e as demais em outra coleção (padrão de subconjunto).
- **Escritas simultâneas:** muitos usuários avaliando o mesmo título ao mesmo tempo atualizam o mesmo documento. Em escala muito grande, isso também levaria à mesma evolução acima.

## Funcionalidades (pipelines de agregação)

### 1. Ranking dos melhores títulos por tipo (`03_ranking_por_tipo.js`)

Mostra o top 3 de filmes, séries e jogos pela nota média, considerando apenas títulos com no mínimo 3 avaliações, para que um título com uma única nota alta não lidere o ranking.

Roda na coleção `titulos`, usando a nota média e o total de avaliações já salvos em cada título.

Pipeline: `$match` (mínimo de avaliações) → `$sort` (maior nota) → `$group` (agrupa por tipo com `$push`) → `$project` com `$slice` (primeiros colocados) → `$sort`.

**Resultado esperado:** filme: A Odisseia (4,6 · 5 avaliações) e Duna: Parte Dois (4,5 · 4); jogo: The Legend of Zelda: Tears of the Kingdom (4,8 · 4) e Minecraft (3,7 · 3); série: Ruptura (4,8 · 4), Dark (4,7 · 3) e O Urso (3,7 · 3).

**Evidência no MongoDB Atlas (aba Aggregations da coleção `titulos`):**

Pipeline com os 5 estágios:

![Pipeline do ranking por tipo no Atlas](docs/atlas-ranking-pipeline.png)

Resultado (primeiro grupo expandido):

![Resultado do ranking por tipo no Atlas](docs/atlas-ranking-resultado.png)

### 2. Títulos em alta (`04_titulos_em_alta.js`)

Lista os títulos mais avaliados nos últimos 30 dias e compara com os 30 dias anteriores, indicando se estão subindo, caindo ou estáveis, além da nota média recente.

Roda na coleção `titulos`, "abrindo" a lista de avaliações de cada título.

Pipeline: `$match` com `$max` (descarta títulos sem avaliações recentes) → `$unwind` (um documento por avaliação) → `$addFields` com `$dateSubtract` e `$$NOW` (início de cada período) → `$match` com `$expr` (últimos 60 dias) → `$addFields` com `$cond` (período atual ou anterior) → `$group` com `$first` e somas condicionais → `$match` → `$project` com `$subtract` e `$switch` (variação e tendência) → `$sort` → `$limit`.

**Resultado esperado** (com os dados de exemplo): A Odisseia (5 avaliações recentes, *subindo*), Ruptura (4, *subindo*), The Legend of Zelda: Tears of the Kingdom (4, *subindo*), Hollow Knight (1, *estável*) e Minecraft (1, *caindo*).

**Evidência no MongoDB Atlas (aba Aggregations da coleção `titulos`):**

Pipeline com os 10 estágios:

![Pipeline dos títulos em alta no Atlas](docs/atlas-em-alta-pipeline.png)

Resultado (primeiros documentos):

![Resultado dos títulos em alta no Atlas](docs/atlas-em-alta-resultado.png)

As duas funcionalidades são diferentes: o ranking trabalha com a **qualidade acumulada** de cada título, sem abrir as avaliações; o "em alta" **abre a lista de avaliações** e analisa o **movimento no tempo**.

## Camada de cache e estatísticas (Redis)

Além do MongoDB Atlas, o TelaScore usa o **Redis**, hospedado no **Redis Cloud**, como camada em memória para login e estatísticas de uso. O código está em `scripts/05_redis_cache_estatisticas.js`.

O Redis é um banco **chave-valor** que guarda os dados na memória RAM, por isso responde em menos de 1 milissegundo. Cada banco cuida do que faz melhor (**persistência poliglota**): o MongoDB guarda os dados permanentes e é a **fonte da verdade**; o Redis guarda dados temporários e métricas que precisam de velocidade.

### Cache de login e sessão

| Chave | Conteúdo | Tempo de vida (TTL) |
|---|---|---|
| `cache:usuario:<email>` | Dados de login (apelido e hash da senha) | 15 minutos |
| `sessao:<token>` | Usuário dono da sessão ativa | 1 hora |

- **TTL (*Time To Live*):** tempo de vida da chave. Quando acaba, o Redis apaga a chave sozinho; é assim que a sessão expira.
- **Padrão *cache-aside*:** o sistema procura primeiro no Redis; se não encontrar (*cache miss*), busca no MongoDB e guarda uma cópia no Redis com TTL.
- **Comandos usados:** `hSet` (guarda um objeto com vários campos), `hGetAll` (lê o objeto), `expire` (define o TTL), `ttl` (mostra o tempo restante) e `del` (apaga a chave).

### Estruturas probabilísticas

Estruturas probabilísticas trocam **exatidão** por uma **economia muito grande de memória e velocidade**: em vez de guardar os dados, guardam um resumo matemático deles. Por isso podem errar, mas de forma previsível e controlada.

| Estrutura | Chave | Pergunta que responde | Como funciona | Erro possível |
|---|---|---|---|---|
| **Bloom Filter** | `bf:usuarios:emails` e `bf:avaliacoes:pares` | "Esse item já existe?" | Cada item marca algumas posições de uma sequência de bits (definidas por funções de *hash*). Se alguma posição do item consultado estiver desmarcada, ele nunca foi adicionado. | **Falso positivo** ("talvez exista" para um item que não existe). **Nunca há falso negativo.** Configurado com 0,1% de chance de erro para até 10 mil itens. |
| **HyperLogLog** | `hll:usuarios_ativos:hoje` | "Quantos itens diferentes?" | Analisa padrões raros nos valores de *hash* dos itens para estimar quantos são distintos. Repetições não contam duas vezes. Usa no máximo 12 KB. | Erro de cerca de **0,81%** para mais ou para menos. |
| **Count-Min Sketch** | `cms:titulos:visualizacoes` | "Quantas vezes cada item apareceu?" | Tabela de contadores (2.000 colunas × 5 linhas). Cada visualização soma 1 em um contador por linha; a consulta pega o **menor** desses contadores. | Pode **superestimar** quando itens diferentes caem no mesmo contador. **Nunca subestima.** |

Comandos usados: `bf.reserve`, `bf.add` e `bf.exists` (Bloom Filter); `pfAdd` e `pfCount` (HyperLogLog); `cms.initByDim`, `cms.incrBy` e `cms.query` (Count-Min Sketch).

### O que acontece quando a estrutura probabilística responde errado?

As estruturas probabilísticas são usadas como **filtro rápido** ou **métrica aproximada**, nunca como decisão final quando a exatidão importa. Quando há dúvida, o sistema consulta o MongoDB. Os erros possíveis foram escolhidos para cair sempre **para o lado seguro**:

| Estrutura | Erro | O que o sistema faz | Impacto |
|---|---|---|---|
| Bloom Filter de e-mails | Diz "talvez exista" para um e-mail não cadastrado | Consulta o MongoDB, que responde "não encontrado", e o login falha normalmente | Apenas uma consulta a mais ao MongoDB |
| Bloom Filter de e-mails | Falso negativo | Não acontece: um usuário cadastrado nunca é barrado pelo filtro | Nenhum |
| Bloom Filter de avaliações | Diz "talvez já avaliou" para quem nunca avaliou o título | Não bloqueia: confirma no MongoDB. A decisão final é do comando de inserção, que só grava se o usuário ainda não avaliou (`$ne`) | Apenas uma verificação a mais; o usuário consegue avaliar |
| HyperLogLog | Estima, por exemplo, 1.008 usuários ativos quando foram 1.000 | Nada: o valor só é exibido em estatísticas | Métrica levemente imprecisa, sem efeito em decisões |
| Count-Min Sketch | Mostra um título com mais visualizações do que teve | Nada: o valor só indica popularidade | Um título pode parecer um pouco mais popular; o erro é limitado pelo tamanho da tabela |

Situações equivalentes no **cache de login** (que não é probabilístico):

- **Chave expirada ou inexistente:** *cache miss*; o sistema busca no MongoDB.
- **Dado desatualizado:** quando o usuário troca a senha, a chave do cache é apagada (`del`), para o hash antigo não continuar sendo usado.
- **Redis fora do ar ou reiniciado:** o sistema consulta direto o MongoDB (mais lento, mas correto), e os Bloom Filters são reconstruídos a partir dos dados do MongoDB.

Estruturas probabilísticas **não são usadas** onde a exatidão é obrigatória, como a contagem oficial de avaliações, a nota média ou o controle de acesso; esses dados vêm do MongoDB.

> O script `05_redis_cache_estatisticas.js` demonstra cada estrutura isoladamente. O fluxo de confirmação no MongoDB descrito acima é o comportamento previsto para o sistema completo.

## Estrutura do repositório

```
telascore/
├── README.md
├── docs/
│   ├── visao-usuario.png              # visão do usuário
│   ├── atlas-ranking-pipeline.png     # evidência: pipeline do ranking no Atlas
│   ├── atlas-ranking-resultado.png    # evidência: resultado do ranking no Atlas
│   ├── atlas-em-alta-pipeline.png     # evidência: pipeline dos títulos em alta no Atlas
│   ├── atlas-em-alta-resultado.png    # evidência: resultado dos títulos em alta no Atlas
│   └── redis-resultado.png            # evidência: execução do script do Redis
├── package.json             # dependências do Node.js (biblioteca redis)
├── package-lock.json        # versões exatas instaladas (gerado pelo npm)
└── scripts/
    ├── 01_criar_colecoes.js    # cria o banco, as coleções (com validação) e os índices
    ├── 02_inserir_exemplos.js  # insere usuários, títulos e avaliações embutidas de exemplo
    ├── 03_ranking_por_tipo.js  # funcionalidade 1: ranking dos melhores títulos por tipo
    ├── 04_titulos_em_alta.js   # funcionalidade 2: títulos em alta nos últimos 30 dias
    └── 05_redis_cache_estatisticas.js  # cache de login e estatísticas com Redis
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

Resultado esperado do script 02: 6 usuários, 9 títulos (3 filmes, 3 séries e 3 jogos) e 30 avaliações embutidas nos títulos, com a nota média de cada título calculada. O script também testa a regra de uma avaliação por usuário: a segunda avaliação do mesmo usuário no mesmo título é recusada.

### Como executar o script do Redis

Pré-requisitos: [Node.js](https://nodejs.org/) instalado e um banco gratuito no **Redis Cloud**.

1. Na pasta do projeto, instale as dependências:
   ```
   npm install
   ```
2. Defina a URL de conexão do Redis como variável de ambiente (no PowerShell). A senha **nunca** deve ser escrita no código nem enviada ao repositório:
   ```
   $env:REDIS_URI = "redis://default:SUA_SENHA@ENDERECO_DO_REDIS:PORTA"
   ```
3. Execute o script:
   ```
   node scripts/05_redis_cache_estatisticas.js
   ```

Resultado esperado: o Bloom Filter identifica o e-mail cadastrado e recusa o inexistente, o cache de login e a sessão aparecem com o tempo restante (TTL), o HyperLogLog estima 6 usuários únicos, o Count-Min Sketch mostra as visualizações por título e o Bloom Filter de avaliações aponta a avaliação duplicada.

### Evidência de execução do Redis

Execução do script no Redis Cloud, com todos os resultados esperados:

![Resultado da execução do script do Redis](docs/redis-resultado.png)