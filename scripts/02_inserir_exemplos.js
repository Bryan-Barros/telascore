const banco = db.getSiblingDB("telascore");

// Limpa os documentos antigos (mantém coleções, validações e índices)
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
  { _id: u.cinefilo,   apelido: "cinefilo22",    email: "ci*******@exemplo.com", senhaHash: "HASH_FICTICIO_1", criadoEm: diasAtras(90) },
  { _id: u.maratona,   apelido: "maratonista",   email: "ma*******@exemplo.com", senhaHash: "HASH_FICTICIO_2", criadoEm: diasAtras(85) },
  { _id: u.gamerlia,   apelido: "gamerlia",      email: "ga*******@exemplo.com", senhaHash: "HASH_FICTICIO_3", criadoEm: diasAtras(80) },
  { _id: u.pipoqueiro, apelido: "pipoqueiro",    email: "pi*******@exemplo.com", senhaHash: "HASH_FICTICIO_4", criadoEm: diasAtras(75) },
  { _id: u.seriemania, apelido: "seriemaniaca",  email: "se*******@exemplo.com", senhaHash: "HASH_FICTICIO_5", criadoEm: diasAtras(70) },
  { _id: u.controle,   apelido: "controle_rafa", email: "co*******@exemplo.com", senhaHash: "HASH_FICTICIO_6", criadoEm: diasAtras(65) }
]);

// -------------------------------------------------------------
// Títulos (começam sem avaliações e com nota 0)
// -------------------------------------------------------------
const novoTitulo = (_id, nome, tipo, genero, ano) =>
  ({ _id, nome, tipo, genero, ano, notaMedia: 0, totalAvaliacoes: 0, avaliacoes: [] });

banco.titulos.insertMany([
  novoTitulo(t.odisseia,  "A Odisseia",                                "filme", "Aventura",          2026),
  novoTitulo(t.duna2,     "Duna: Parte Dois",                          "filme", "Ficção científica", 2024),
  novoTitulo(t.aindaAqui, "Ainda Estou Aqui",                          "filme", "Drama",             2024),
  novoTitulo(t.dark,      "Dark",                                      "serie", "Ficção científica", 2017),
  novoTitulo(t.ruptura,   "Ruptura",                                   "serie", "Suspense",          2022),
  novoTitulo(t.urso,      "O Urso",                                    "serie", "Comédia dramática", 2022),
  novoTitulo(t.minecraft, "Minecraft",                                 "jogo",  "Sandbox",           2011),
  novoTitulo(t.zelda,     "The Legend of Zelda: Tears of the Kingdom", "jogo",  "Aventura",          2023),
  novoTitulo(t.hollow,    "Hollow Knight",                             "jogo",  "Metroidvania",      2017)
]);

// -------------------------------------------------------------
// Função avaliar(): adiciona uma avaliação dentro do título
// -------------------------------------------------------------
function avaliar(tituloId, usuarioId, apelido, nota, comentario, dias) {
  const novaAvaliacao = { usuarioId, apelido, nota, comentario, data: diasAtras(dias) };

  return banco.titulos.updateOne(
    // Filtro: o título certo E que ainda NÃO tenha avaliação desse usuário.
    // Se o usuário já avaliou, nenhum documento combina e nada é alterado.
    { _id: tituloId, "avaliacoes.usuarioId": { $ne: usuarioId } },

    // Atualização em formato de pipeline (lista de etapas):
    [
      // 1) Acrescenta a nova avaliação no fim da lista
      { $set: { avaliacoes: { $concatArrays: ["$avaliacoes", { $literal: [novaAvaliacao] }] } } },
      // 2) Recalcula o total e a média a partir da lista já atualizada
      { $set: {
          totalAvaliacoes: { $size: "$avaliacoes" },
          notaMedia: { $round: [{ $avg: "$avaliacoes.nota" }, 1] }
      } }
    ]
  );
}

// -------------------------------------------------------------
// Avaliações de exemplo
// -------------------------------------------------------------
// A Odisseia: 5 avaliações, todas recentes (em alta)
avaliar(t.odisseia, u.cinefilo,   "cinefilo22",    5, "Épico do começo ao fim.",               5);
avaliar(t.odisseia, u.maratona,   "maratonista",   4, "Longo, mas vale a pena.",               8);
avaliar(t.odisseia, u.gamerlia,   "gamerlia",      5, "Visual incrível no cinema.",           12);
avaliar(t.odisseia, u.pipoqueiro, "pipoqueiro",    5, "Saí do cinema arrepiado.",              3);
avaliar(t.odisseia, u.seriemania, "seriemaniaca",  4, "Trilha sonora absurda.",               20);

// Duna: Parte Dois: mais avaliado no período anterior (esfriando)
avaliar(t.duna2, u.cinefilo,   "cinefilo22",    5, "Ficção científica no seu melhor.",       45);
avaliar(t.duna2, u.pipoqueiro, "pipoqueiro",    4, "Grandioso, um pouco arrastado.",          50);
avaliar(t.duna2, u.controle,   "controle_rafa", 5, "Cenas de batalha impressionantes.",      40);
avaliar(t.duna2, u.maratona,   "maratonista",   4, "Revi em casa e continua ótimo.",          25);

// Ainda Estou Aqui: só 2 avaliações (fica fora do ranking, que exige no mínimo 3)
avaliar(t.aindaAqui, u.seriemania, "seriemaniaca", 5, "Emocionante e necessário.",           35);
avaliar(t.aindaAqui, u.cinefilo,   "cinefilo22",   5, "Atuação marcante.",                    38);

// Dark: avaliações antigas (bom no ranking, mas não está em alta)
avaliar(t.dark, u.maratona,   "maratonista",  5, "Melhor série que já maratonei.",           55);
avaliar(t.dark, u.cinefilo,   "cinefilo22",   4, "Confusa no início, genial no fim.",        52);
avaliar(t.dark, u.seriemania, "seriemaniaca", 5, "Precisa assistir com atenção.",            48);

// Ruptura: 4 avaliações recentes (em alta)
avaliar(t.ruptura, u.maratona,   "maratonista",   5, "Não consegui parar de assistir.",         2);
avaliar(t.ruptura, u.seriemania, "seriemaniaca",  5, "Roteiro muito original.",                 6);
avaliar(t.ruptura, u.gamerlia,   "gamerlia",      4, "Estranha no bom sentido.",               10);
avaliar(t.ruptura, u.controle,   "controle_rafa", 5, "Final de temporada insano.",             15);

// O Urso: avaliações espalhadas entre os dois períodos
avaliar(t.urso, u.seriemania, "seriemaniaca", 4, "Cozinha caótica e personagens ótimos.",     28);
avaliar(t.urso, u.pipoqueiro, "pipoqueiro",   3, "Episódios bem irregulares.",                33);
avaliar(t.urso, u.maratona,   "maratonista",  4, "Ritmo intenso.",                            41);

// Minecraft
avaliar(t.minecraft, u.gamerlia, "gamerlia",      4, "Criatividade sem limites.",             44);
avaliar(t.minecraft, u.maratona, "maratonista",   3, "Divertido com amigos.",                 47);
avaliar(t.minecraft, u.controle, "controle_rafa", 4, "Joguei de novo e viciei.",                9);

// Zelda: 4 avaliações recentes (em alta)
avaliar(t.zelda, u.gamerlia,   "gamerlia",      5, "Liberdade total de exploração.",            4);
avaliar(t.zelda, u.controle,   "controle_rafa", 5, "Construir veículos é genial.",              7);
avaliar(t.zelda, u.pipoqueiro, "pipoqueiro",    4, "Enorme, dá para jogar meses.",             14);
avaliar(t.zelda, u.cinefilo,   "cinefilo22",    5, "Mesmo sem ser gamer, adorei.",             18);

// Hollow Knight: só 2 avaliações (fica fora do ranking)
avaliar(t.hollow, u.controle, "controle_rafa", 5, "Difícil e recompensador.",                 22);
avaliar(t.hollow, u.gamerlia, "gamerlia",      4, "Arte linda.",                              58);

// -------------------------------------------------------------
// Teste da regra "uma avaliação por usuário por título":
// cinefilo22 tenta avaliar A Odisseia de novo
// -------------------------------------------------------------
const tentativa = avaliar(t.odisseia, u.cinefilo, "cinefilo22", 1, "Tentando avaliar de novo.", 0);

// -------------------------------------------------------------
// Resultado
// -------------------------------------------------------------
const totalAvaliacoes = banco.titulos.aggregate([
  { $group: { _id: null, total: { $sum: "$totalAvaliacoes" } } }
]).toArray()[0].total;

print("Usuários:   " + banco.usuarios.countDocuments());
print("Títulos:    " + banco.titulos.countDocuments());
print("Avaliações: " + totalAvaliacoes + " (embutidas nos títulos)");
print("Segunda avaliação de cinefilo22 em A Odisseia: " +
      (tentativa.modifiedCount === 0 ? "RECUSADA (usuário já avaliou)" : "aceita"));

print("\nExemplo de documento (A Odisseia):");
printjson(banco.titulos.findOne({ _id: t.odisseia }, { _id: 0, nome: 1, tipo: 1, notaMedia: 1, totalAvaliacoes: 1, avaliacoes: { $slice: 2 } }));