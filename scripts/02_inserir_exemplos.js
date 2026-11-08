const banco = db.getSiblingDB("telascore");

// Limpa os documentos antigos (mantém coleções, validações e índices)
banco.avaliacoes.deleteMany({});
banco.titulos.deleteMany({});
banco.usuarios.deleteMany({});

// Retorna a data de "n" dias atrás, a partir de agora
const diasAtras = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

// -------------------------------------------------------------
// IDs gerados antes, para ligar avaliações a usuários e títulos
// -------------------------------------------------------------
const u = {
  cinefilo:   new ObjectId(),
  maratona:   new ObjectId(),
  gamerlia:   new ObjectId(),
  pipoqueiro: new ObjectId(),
  seriemania: new ObjectId(),
  controle:   new ObjectId()
};

const t = {
  odisseia:  new ObjectId(),
  duna2:     new ObjectId(),
  aindaAqui: new ObjectId(),
  dark:      new ObjectId(),
  ruptura:   new ObjectId(),
  urso:      new ObjectId(),
  minecraft: new ObjectId(),
  zelda:     new ObjectId(),
  hollow:    new ObjectId()
};

// -------------------------------------------------------------
// Usuários
// -------------------------------------------------------------
banco.usuarios.insertMany([
  { _id: u.cinefilo,   apelido: "cinefilo22",   email: "ci*******@exemplo.com", senhaHash: "HASH_FICTICIO_1", criadoEm: diasAtras(90) },
  { _id: u.maratona,   apelido: "maratonista",  email: "ma*******@exemplo.com", senhaHash: "HASH_FICTICIO_2", criadoEm: diasAtras(85) },
  { _id: u.gamerlia,   apelido: "gamerlia",     email: "ga*******@exemplo.com", senhaHash: "HASH_FICTICIO_3", criadoEm: diasAtras(80) },
  { _id: u.pipoqueiro, apelido: "pipoqueiro",   email: "pi*******@exemplo.com", senhaHash: "HASH_FICTICIO_4", criadoEm: diasAtras(75) },
  { _id: u.seriemania, apelido: "seriemaniaca", email: "se*******@exemplo.com", senhaHash: "HASH_FICTICIO_5", criadoEm: diasAtras(70) },
  { _id: u.controle,   apelido: "controle_rafa", email: "co*******@exemplo.com", senhaHash: "HASH_FICTICIO_6", criadoEm: diasAtras(65) }
]);

// -------------------------------------------------------------
// Títulos (a nota começa em 0 e é calculada no fim do script)
// -------------------------------------------------------------
banco.titulos.insertMany([
  { _id: t.odisseia,  nome: "A Odisseia",                                tipo: "filme", genero: "Aventura",          ano: 2026, notaMedia: 0, totalAvaliacoes: 0 },
  { _id: t.duna2,     nome: "Duna: Parte Dois",                          tipo: "filme", genero: "Ficção científica", ano: 2024, notaMedia: 0, totalAvaliacoes: 0 },
  { _id: t.aindaAqui, nome: "Ainda Estou Aqui",                          tipo: "filme", genero: "Drama",             ano: 2024, notaMedia: 0, totalAvaliacoes: 0 },
  { _id: t.dark,      nome: "Dark",                                      tipo: "serie", genero: "Ficção científica", ano: 2017, notaMedia: 0, totalAvaliacoes: 0 },
  { _id: t.ruptura,   nome: "Ruptura",                                   tipo: "serie", genero: "Suspense",          ano: 2022, notaMedia: 0, totalAvaliacoes: 0 },
  { _id: t.urso,      nome: "O Urso",                                    tipo: "serie", genero: "Comédia dramática", ano: 2022, notaMedia: 0, totalAvaliacoes: 0 },
  { _id: t.minecraft, nome: "Minecraft",                                 tipo: "jogo",  genero: "Sandbox",           ano: 2011, notaMedia: 0, totalAvaliacoes: 0 },
  { _id: t.zelda,     nome: "The Legend of Zelda: Tears of the Kingdom", tipo: "jogo",  genero: "Aventura",          ano: 2023, notaMedia: 0, totalAvaliacoes: 0 },
  { _id: t.hollow,    nome: "Hollow Knight",                             tipo: "jogo",  genero: "Metroidvania",      ano: 2017, notaMedia: 0, totalAvaliacoes: 0 }
]);

// -------------------------------------------------------------
// Avaliações (referenciam usuário e título pelo _id)
// Monta cada avaliação a partir de: título, usuário, apelido, nota, comentário, dias atrás
// -------------------------------------------------------------
const av = (tituloId, usuarioId, apelido, nota, comentario, dias) =>
  ({ tituloId, usuarioId, apelido, nota, comentario, data: diasAtras(dias) });

banco.avaliacoes.insertMany([
  // A Odisseia: 5 avaliações, todas recentes (em alta)
  av(t.odisseia, u.cinefilo,   "cinefilo22",    5, "Épico do começo ao fim.",              5),
  av(t.odisseia, u.maratona,   "maratonista",   4, "Longo, mas vale a pena.",              8),
  av(t.odisseia, u.gamerlia,   "gamerlia",      5, "Visual incrível no cinema.",          12),
  av(t.odisseia, u.pipoqueiro, "pipoqueiro",    5, "Saí do cinema arrepiado.",             3),
  av(t.odisseia, u.seriemania, "seriemaniaca",  4, "Trilha sonora absurda.",              20),

  // Duna: Parte Dois: mais avaliado no período anterior (esfriando)
  av(t.duna2, u.cinefilo,   "cinefilo22",    5, "Ficção científica no seu melhor.",       45),
  av(t.duna2, u.pipoqueiro, "pipoqueiro",    4, "Grandioso, um pouco arrastado.",          50),
  av(t.duna2, u.controle,   "controle_rafa", 5, "Cenas de batalha impressionantes.",      40),
  av(t.duna2, u.maratona,   "maratonista",   4, "Revi em casa e continua ótimo.",          25),

  // Ainda Estou Aqui: só 2 avaliações (fica fora do ranking, que exige no mínimo 3)
  av(t.aindaAqui, u.seriemania, "seriemaniaca", 5, "Emocionante e necessário.",           35),
  av(t.aindaAqui, u.cinefilo,   "cinefilo22",   5, "Atuação marcante.",                    38),

  // Dark: avaliações antigas (bom no ranking, mas não está em alta)
  av(t.dark, u.maratona,   "maratonista",  5, "Melhor série que já maratonei.",           55),
  av(t.dark, u.cinefilo,   "cinefilo22",   4, "Confusa no início, genial no fim.",        52),
  av(t.dark, u.seriemania, "seriemaniaca", 5, "Precisa assistir com atenção.",            48),

  // Ruptura: 4 avaliações recentes (em alta)
  av(t.ruptura, u.maratona,   "maratonista",   5, "Não consegui parar de assistir.",         2),
  av(t.ruptura, u.seriemania, "seriemaniaca",  5, "Roteiro muito original.",                 6),
  av(t.ruptura, u.gamerlia,   "gamerlia",      4, "Estranha no bom sentido.",               10),
  av(t.ruptura, u.controle,   "controle_rafa", 5, "Final de temporada insano.",             15),

  // O Urso: avaliações espalhadas entre os dois períodos
  av(t.urso, u.seriemania, "seriemaniaca", 4, "Cozinha caótica e personagens ótimos.",     28),
  av(t.urso, u.pipoqueiro, "pipoqueiro",   3, "Episódios bem irregulares.",                33),
  av(t.urso, u.maratona,   "maratonista",  4, "Ritmo intenso.",                            41),

  // Minecraft
  av(t.minecraft, u.gamerlia, "gamerlia",      4, "Criatividade sem limites.",             44),
  av(t.minecraft, u.maratona, "maratonista",   3, "Divertido com amigos.",                 47),
  av(t.minecraft, u.controle, "controle_rafa", 4, "Joguei de novo e viciei.",                9),

  // Zelda: 4 avaliações recentes (em alta)
  av(t.zelda, u.gamerlia,   "gamerlia",      5, "Liberdade total de exploração.",            4),
  av(t.zelda, u.controle,   "controle_rafa", 5, "Construir veículos é genial.",              7),
  av(t.zelda, u.pipoqueiro, "pipoqueiro",    4, "Enorme, dá para jogar meses.",             14),
  av(t.zelda, u.cinefilo,   "cinefilo22",    5, "Mesmo sem ser gamer, adorei.",             18),

  // Hollow Knight: só 2 avaliações (fica fora do ranking)
  av(t.hollow, u.controle, "controle_rafa", 5, "Difícil e recompensador.",                 22),
  av(t.hollow, u.gamerlia, "gamerlia",      4, "Arte linda.",                              58)
]);

// -------------------------------------------------------------
// Agregação: calcula média e total de avaliações por título
// e grava o resultado no documento do título (desnormalização)
// -------------------------------------------------------------
banco.avaliacoes.aggregate([
  { $group: { _id: "$tituloId", media: { $avg: "$nota" }, total: { $sum: 1 } } }
]).forEach((r) => {
  banco.titulos.updateOne(
    { _id: r._id },
    { $set: { notaMedia: Math.round(r.media * 10) / 10, totalAvaliacoes: r.total } }
  );
});

// -------------------------------------------------------------
// Resultado
// -------------------------------------------------------------
print("Usuários:   " + banco.usuarios.countDocuments());
print("Títulos:    " + banco.titulos.countDocuments());
print("Avaliações: " + banco.avaliacoes.countDocuments());