const banco = db.getSiblingDB("telascore");

const MINIMO_AVALIACOES = 3;
const TAMANHO_TOP = 3;

const ranking = banco.titulos.aggregate([
  // 1) Mantém só os títulos com o mínimo de avaliações
  { $match: { totalAvaliacoes: { $gte: MINIMO_AVALIACOES } } },

  // 2) Ordena da maior para a menor nota (desempate: mais avaliações)
  { $sort: { notaMedia: -1, totalAvaliacoes: -1 } },

  // 3) Agrupa por tipo, montando a lista já na ordem do ranking
  { $group: {
      _id: "$tipo",
      titulos: { $push: {
        nome: "$nome",
        notaMedia: "$notaMedia",
        avaliacoes: "$totalAvaliacoes"
      } }
  } },

  // 4) Formata a saída e corta a lista nos primeiros colocados
  { $project: {
      _id: 0,
      tipo: "$_id",
      top: { $slice: ["$titulos", TAMANHO_TOP] }
  } },

  // 5) Ordena os grupos por tipo (filme, jogo, serie)
  { $sort: { tipo: 1 } }
]);

print("=== Ranking por tipo (mínimo de " + MINIMO_AVALIACOES + " avaliações) ===");
ranking.forEach((grupo) => printjson(grupo));