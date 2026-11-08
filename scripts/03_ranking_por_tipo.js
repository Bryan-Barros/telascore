const banco = db.getSiblingDB("telascore");

const MINIMO_AVALIACOES = 3;
const TAMANHO_TOP = 3;

const ranking = banco.avaliacoes.aggregate([
  // 1) Agrupa as avaliações por título: média das notas e quantidade
  { $group: {
      _id: "$tituloId",
      media: { $avg: "$nota" },
      total: { $sum: 1 }
  } },

  // 2) Mantém só os títulos com o mínimo de avaliações
  { $match: { total: { $gte: MINIMO_AVALIACOES } } },

  // 3) Junta com a coleção "titulos" para pegar nome e tipo
  { $lookup: {
      from: "titulos",
      localField: "_id",
      foreignField: "_id",
      as: "titulo"
  } },

  // 4) O $lookup devolve uma lista; $unwind transforma em um objeto
  { $unwind: "$titulo" },

  // 5) Ordena da maior para a menor média (desempate: mais avaliações)
  { $sort: { media: -1, total: -1 } },

  // 6) Agrupa de novo, agora por tipo, montando a lista já ordenada
  { $group: {
      _id: "$titulo.tipo",
      titulos: { $push: {
        nome: "$titulo.nome",
        notaMedia: { $round: ["$media", 1] },
        avaliacoes: "$total"
      } }
  } },

  // 7) Formata a saída e corta a lista nos primeiros colocados
  { $project: {
      _id: 0,
      tipo: "$_id",
      top: { $slice: ["$titulos", TAMANHO_TOP] }
  } },

  // 8) Ordena os grupos por tipo (filme, jogo, serie)
  { $sort: { tipo: 1 } }
]);

print("=== Ranking por tipo (mínimo de " + MINIMO_AVALIACOES + " avaliações) ===");
ranking.forEach((grupo) => printjson(grupo));