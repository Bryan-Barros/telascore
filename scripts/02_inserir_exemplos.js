const banco = db.getSiblingDB("telascore");

// Limpa os documentos antigos (mantém coleções, validações e índices)
banco.avaliacoes.deleteMany({});
banco.titulos.deleteMany({});
banco.usuarios.deleteMany({});

// -------------------------------------------------------------
// IDs gerados antes, para ligar avaliações a usuários e títulos
// -------------------------------------------------------------
const usuario1 = new ObjectId();
const usuario2 = new ObjectId();
const usuario3 = new ObjectId();

const odisseia  = new ObjectId();
const dark      = new ObjectId();
const minecraft = new ObjectId();

// -------------------------------------------------------------
// Usuários
// -------------------------------------------------------------
banco.usuarios.insertMany([
  { _id: usuario1, apelido: "cinefilo22",  email: "ci*******@exemplo.com", senhaHash: "HASH_FICTICIO_1", criadoEm: new Date("2026-10-01") },
  { _id: usuario2, apelido: "maratonista", email: "ma*******@exemplo.com", senhaHash: "HASH_FICTICIO_2", criadoEm: new Date("2026-10-02") },
  { _id: usuario3, apelido: "gamerlia",    email: "ga*******@exemplo.com", senhaHash: "HASH_FICTICIO_3", criadoEm: new Date("2026-10-03") }
]);

// -------------------------------------------------------------
// Títulos (a nota começa em 0 e é calculada no fim do script)
// -------------------------------------------------------------
banco.titulos.insertMany([
  { _id: odisseia,  nome: "A Odisseia", tipo: "filme", genero: "Aventura",          ano: 2026, notaMedia: 0, totalAvaliacoes: 0 },
  { _id: dark,      nome: "Dark",       tipo: "serie", genero: "Ficção científica", ano: 2017, notaMedia: 0, totalAvaliacoes: 0 },
  { _id: minecraft, nome: "Minecraft",  tipo: "jogo",  genero: "Sandbox",           ano: 2011, notaMedia: 0, totalAvaliacoes: 0 }
]);

// -------------------------------------------------------------
// Avaliações (referenciam usuário e título pelo _id)
// -------------------------------------------------------------
banco.avaliacoes.insertMany([
  { tituloId: odisseia,  usuarioId: usuario1, apelido: "cinefilo22",  nota: 5, comentario: "Épico do começo ao fim.",            data: new Date("2026-10-10") },
  { tituloId: odisseia,  usuarioId: usuario2, apelido: "maratonista", nota: 4, comentario: "Longo, mas vale a pena.",            data: new Date("2026-10-11") },
  { tituloId: odisseia,  usuarioId: usuario3, apelido: "gamerlia",    nota: 5, comentario: "Visual incrível no cinema.",         data: new Date("2026-10-12") },
  { tituloId: dark,      usuarioId: usuario2, apelido: "maratonista", nota: 5, comentario: "Melhor série que já maratonei.",     data: new Date("2026-10-13") },
  { tituloId: dark,      usuarioId: usuario1, apelido: "cinefilo22",  nota: 4, comentario: "Confusa no início, genial no fim.", data: new Date("2026-10-14") },
  { tituloId: minecraft, usuarioId: usuario3, apelido: "gamerlia",    nota: 4, comentario: "Criatividade sem limites.",          data: new Date("2026-10-15") },
  { tituloId: minecraft, usuarioId: usuario2, apelido: "maratonista", nota: 3, comentario: "Divertido com amigos.",              data: new Date("2026-10-16") }
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
print("\nRanking dos títulos:");
banco.titulos.find({}, { _id: 0, nome: 1, tipo: 1, notaMedia: 1, totalAvaliacoes: 1 })
  .sort({ notaMedia: -1 })
  .forEach((t) => printjson(t));