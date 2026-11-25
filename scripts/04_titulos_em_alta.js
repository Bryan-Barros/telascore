const banco = db.getSiblingDB("telascore");

const DIAS_PERIODO = 30;
const TAMANHO_LISTA = 5;

const emAlta = banco.titulos.aggregate([
  // 1) Descarta logo os títulos sem nenhuma avaliação nos últimos 60 dias
  //    ($max pega a data da avaliação mais recente do título)
  { $match: { $expr: { $gte: [
      { $max: "$avaliacoes.data" },
      { $dateSubtract: { startDate: "$$NOW", unit: "day", amount: DIAS_PERIODO * 2 } }
  ] } } },

  // 2) "Abre" a lista: gera um documento para cada avaliação do título
  { $unwind: "$avaliacoes" },

  // 3) Calcula, a partir da data atual ($$NOW), onde começa cada período
  { $addFields: {
      inicioAtual:    { $dateSubtract: { startDate: "$$NOW", unit: "day", amount: DIAS_PERIODO } },
      inicioAnterior: { $dateSubtract: { startDate: "$$NOW", unit: "day", amount: DIAS_PERIODO * 2 } }
  } },

  // 4) Mantém só as avaliações dos dois últimos períodos (60 dias)
  { $match: { $expr: { $gte: ["$avaliacoes.data", "$inicioAnterior"] } } },

  // 5) Marca cada avaliação como do período "atual" ou "anterior"
  { $addFields: {
      periodo: { $cond: [{ $gte: ["$avaliacoes.data", "$inicioAtual"] }, "atual", "anterior"] }
  } },

  // 6) Junta de volta por título, contando as avaliações de cada período
  { $group: {
      _id: "$_id",
      nome: { $first: "$nome" },
      tipo: { $first: "$tipo" },
      atual:    { $sum: { $cond: [{ $eq: ["$periodo", "atual"] }, 1, 0] } },
      anterior: { $sum: { $cond: [{ $eq: ["$periodo", "anterior"] }, 1, 0] } },
      // $avg ignora valores nulos: entra só a nota das avaliações recentes
      mediaRecente: { $avg: { $cond: [{ $eq: ["$periodo", "atual"] }, "$avaliacoes.nota", null] } }
  } },

  // 7) Só interessa quem recebeu avaliações no período atual
  { $match: { atual: { $gt: 0 } } },

  // 8) Monta a saída com a variação entre os períodos
  { $project: {
      _id: 0,
      nome: 1,
      tipo: 1,
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

  // 9) Ordena pelos mais avaliados recentemente (desempate: maior variação, nome)
  { $sort: { avaliacoesUltimos30Dias: -1, variacao: -1, nome: 1 } },

  // 10) Limita o tamanho da lista
  { $limit: TAMANHO_LISTA }
]);

print("=== Títulos em alta (últimos " + DIAS_PERIODO + " dias) ===");
emAlta.forEach((titulo) => printjson(titulo));