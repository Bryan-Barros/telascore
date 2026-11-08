const banco = db.getSiblingDB("telascore");

const DIAS_PERIODO = 30;
const TAMANHO_LISTA = 5;

const emAlta = banco.avaliacoes.aggregate([
  // 1) Calcula, a partir da data atual ($$NOW), onde começa cada período
  { $addFields: {
      inicioAtual:    { $dateSubtract: { startDate: "$$NOW", unit: "day", amount: DIAS_PERIODO } },
      inicioAnterior: { $dateSubtract: { startDate: "$$NOW", unit: "day", amount: DIAS_PERIODO * 2 } }
  } },

  // 2) Mantém só as avaliações dos dois últimos períodos (60 dias)
  { $match: { $expr: { $gte: ["$data", "$inicioAnterior"] } } },

  // 3) Marca cada avaliação como do período "atual" ou "anterior"
  { $addFields: {
      periodo: { $cond: [{ $gte: ["$data", "$inicioAtual"] }, "atual", "anterior"] }
  } },

  // 4) Agrupa por título contando as avaliações de cada período
  { $group: {
      _id: "$tituloId",
      atual:    { $sum: { $cond: [{ $eq: ["$periodo", "atual"] }, 1, 0] } },
      anterior: { $sum: { $cond: [{ $eq: ["$periodo", "anterior"] }, 1, 0] } },
      // $avg ignora valores nulos: entra só a nota das avaliações recentes
      mediaRecente: { $avg: { $cond: [{ $eq: ["$periodo", "atual"] }, "$nota", null] } }
  } },

  // 5) Só interessa quem recebeu avaliações no período atual
  { $match: { atual: { $gt: 0 } } },

  // 6) Junta com "titulos" para pegar nome e tipo
  { $lookup: { from: "titulos", localField: "_id", foreignField: "_id", as: "titulo" } },
  { $unwind: "$titulo" },

  // 7) Monta a saída com a variação entre os períodos
  { $project: {
      _id: 0,
      nome: "$titulo.nome",
      tipo: "$titulo.tipo",
      avaliacoesUltimos30Dias: "$atual",
      avaliacoes30DiasAnteriores: "$anterior",
      variacao: { $subtract: ["$atual", "$anterior"] },
      tendencia: { $switch: {
        branches: [
          { case: { $gt: ["$atual", "$anterior"] }, then: "subindo" },
          { case: { $lt: ["$atual", "$anterior"] }, then: "caindo" }
        ],
        default: "estável"
      } },
      mediaRecente: { $round: ["$mediaRecente", 1] }
  } },

  // 8) Ordena pelos mais avaliados recentemente (desempate: maior variação, nome)
  { $sort: { avaliacoesUltimos30Dias: -1, variacao: -1, nome: 1 } },

  // 9) Limita o tamanho da lista
  { $limit: TAMANHO_LISTA }
]);

print("=== Títulos em alta (últimos " + DIAS_PERIODO + " dias) ===");
emAlta.forEach((titulo) => printjson(titulo));