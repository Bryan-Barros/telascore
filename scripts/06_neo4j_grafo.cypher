// 1) Apaga todos os nós e relacionamentos existentes
MATCH (n) DETACH DELETE n;

// 2) Restrições: apelido e nome do título não podem se repetir
CREATE CONSTRAINT usuario_apelido IF NOT EXISTS
FOR (u:Usuario) REQUIRE u.apelido IS UNIQUE;

CREATE CONSTRAINT titulo_nome IF NOT EXISTS
FOR (t:Titulo) REQUIRE t.nome IS UNIQUE;

// 3) Vértices: Usuario
UNWIND ["cinefilo22", "maratonista", "gamerlia", "pipoqueiro", "seriemaniaca", "controle_rafa"] AS apelido
CREATE (:Usuario {apelido: apelido});

// 4) Vértices: Titulo
UNWIND [
  {nome: "A Odisseia",                                tipo: "filme", ano: 2026},
  {nome: "Duna: Parte Dois",                          tipo: "filme", ano: 2024},
  {nome: "Ainda Estou Aqui",                          tipo: "filme", ano: 2024},
  {nome: "Dark",                                      tipo: "serie", ano: 2017},
  {nome: "Ruptura",                                   tipo: "serie", ano: 2022},
  {nome: "O Urso",                                    tipo: "serie", ano: 2022},
  {nome: "Minecraft",                                 tipo: "jogo",  ano: 2011},
  {nome: "The Legend of Zelda: Tears of the Kingdom", tipo: "jogo",  ano: 2023},
  {nome: "Hollow Knight",                             tipo: "jogo",  ano: 2017}
] AS t
CREATE (:Titulo {nome: t.nome, tipo: t.tipo, ano: t.ano});

// 5) Relacionamentos: AVALIOU (usuário -> título), com nota e data
//    "dias" = quantos dias atrás a avaliação foi feita
UNWIND [
  {u: "cinefilo22",    t: "A Odisseia",       nota: 5, dias: 5},
  {u: "maratonista",   t: "A Odisseia",       nota: 4, dias: 8},
  {u: "gamerlia",      t: "A Odisseia",       nota: 5, dias: 12},
  {u: "pipoqueiro",    t: "A Odisseia",       nota: 5, dias: 3},
  {u: "seriemaniaca",  t: "A Odisseia",       nota: 4, dias: 20},
  {u: "cinefilo22",    t: "Duna: Parte Dois", nota: 5, dias: 45},
  {u: "pipoqueiro",    t: "Duna: Parte Dois", nota: 4, dias: 50},
  {u: "controle_rafa", t: "Duna: Parte Dois", nota: 5, dias: 40},
  {u: "maratonista",   t: "Duna: Parte Dois", nota: 4, dias: 25},
  {u: "seriemaniaca",  t: "Ainda Estou Aqui", nota: 5, dias: 35},
  {u: "cinefilo22",    t: "Ainda Estou Aqui", nota: 5, dias: 38},
  {u: "maratonista",   t: "Dark",             nota: 5, dias: 55},
  {u: "cinefilo22",    t: "Dark",             nota: 4, dias: 52},
  {u: "seriemaniaca",  t: "Dark",             nota: 5, dias: 48},
  {u: "maratonista",   t: "Ruptura",          nota: 5, dias: 2},
  {u: "seriemaniaca",  t: "Ruptura",          nota: 5, dias: 6},
  {u: "gamerlia",      t: "Ruptura",          nota: 4, dias: 10},
  {u: "controle_rafa", t: "Ruptura",          nota: 5, dias: 15},
  {u: "seriemaniaca",  t: "O Urso",           nota: 4, dias: 28},
  {u: "pipoqueiro",    t: "O Urso",           nota: 3, dias: 33},
  {u: "maratonista",   t: "O Urso",           nota: 4, dias: 41},
  {u: "gamerlia",      t: "Minecraft",        nota: 4, dias: 44},
  {u: "maratonista",   t: "Minecraft",        nota: 3, dias: 47},
  {u: "controle_rafa", t: "Minecraft",        nota: 4, dias: 9},
  {u: "gamerlia",      t: "The Legend of Zelda: Tears of the Kingdom", nota: 5, dias: 4},
  {u: "controle_rafa", t: "The Legend of Zelda: Tears of the Kingdom", nota: 5, dias: 7},
  {u: "pipoqueiro",    t: "The Legend of Zelda: Tears of the Kingdom", nota: 4, dias: 14},
  {u: "cinefilo22",    t: "The Legend of Zelda: Tears of the Kingdom", nota: 5, dias: 18},
  {u: "controle_rafa", t: "Hollow Knight",    nota: 5, dias: 22},
  {u: "gamerlia",      t: "Hollow Knight",    nota: 4, dias: 58}
] AS a
MATCH (u:Usuario {apelido: a.u})
MATCH (t:Titulo {nome: a.t})
CREATE (u)-[:AVALIOU {nota: a.nota, data: date() - duration({days: a.dias})}]->(t);

// 6) Relacionamentos: SEGUE (usuário -> usuário)
UNWIND [
  ["cinefilo22",    "maratonista"],
  ["cinefilo22",    "gamerlia"],
  ["maratonista",   "cinefilo22"],
  ["maratonista",   "seriemaniaca"],
  ["gamerlia",      "controle_rafa"],
  ["pipoqueiro",    "cinefilo22"],
  ["seriemaniaca",  "maratonista"],
  ["controle_rafa", "gamerlia"]
] AS s
MATCH (a:Usuario {apelido: s[0]})
MATCH (b:Usuario {apelido: s[1]})
CREATE (a)-[:SEGUE]->(b);

// 7) Conferência: quantidade de vértices e de relacionamentos por tipo
MATCH (n)
RETURN labels(n)[0] AS tipo, count(*) AS quantidade
UNION ALL
MATCH ()-[r]->()
RETURN type(r) AS tipo, count(*) AS quantidade;
