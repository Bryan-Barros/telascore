// Consulta 1: Recomendação de títulos para "cinefilo22"
//
// Ideia: "quem gostou do que você gostou, também gostou de..."
//  1) Títulos que o cinefilo22 avaliou com nota 4 ou 5
//  2) Outros usuários que também deram 4 ou 5 para esses títulos
//     (usuários com gosto parecido)
//  3) Títulos que esses usuários avaliaram com 4 ou 5 e que o
//     cinefilo22 ainda não avaliou
// -------------------------------------------------------------
MATCH (eu:Usuario {apelido: "cinefilo22"})-[a1:AVALIOU]->(t:Titulo)<-[a2:AVALIOU]-(parecido:Usuario)
WHERE a1.nota >= 4 AND a2.nota >= 4
WITH DISTINCT eu, parecido
MATCH (parecido)-[a3:AVALIOU]->(recomendado:Titulo)
WHERE a3.nota >= 4 AND NOT (eu)-[:AVALIOU]->(recomendado)
RETURN recomendado.nome AS titulo,
       recomendado.tipo AS tipo,
       count(DISTINCT parecido) AS usuariosComGostoParecido,
       round(avg(a3.nota), 1) AS notaMediaDeles
ORDER BY usuariosComGostoParecido DESC, notaMediaDeles DESC, titulo
LIMIT 5;

// -------------------------------------------------------------
// Consulta 2: Feed de quem o "cinefilo22" segue
//
// Mostra as avaliações mais recentes dos usuários que ele segue.
// -------------------------------------------------------------
MATCH (eu:Usuario {apelido: "cinefilo22"})-[:SEGUE]->(seguido:Usuario)-[a:AVALIOU]->(t:Titulo)
RETURN seguido.apelido AS quemAvaliou,
       t.nome AS titulo,
       a.nota AS nota,
       a.data AS data
ORDER BY a.data DESC
LIMIT 5;

// -------------------------------------------------------------
// Consulta 3 (visualização): grafo de recomendação do cinefilo22
//
// Desenha o caminho usado na recomendação: cinefilo22 -> títulos
// que ele gostou <- usuários parecidos -> títulos recomendados.
// Use a aba "Graph" do resultado.
// -------------------------------------------------------------
MATCH caminho = (eu:Usuario {apelido: "cinefilo22"})-[a1:AVALIOU]->(:Titulo)<-[a2:AVALIOU]-(parecido:Usuario)-[a3:AVALIOU]->(recomendado:Titulo)
WHERE a1.nota >= 4 AND a2.nota >= 4 AND a3.nota >= 4
  AND NOT (eu)-[:AVALIOU]->(recomendado)
RETURN caminho;
