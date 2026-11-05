// Seleciona (ou cria) o banco "telascore".
// No MongoDB, o banco só passa a existir de fato quando recebe a primeira coleção.
const banco = db.getSiblingDB("telascore");

// Remove as coleções antigas, se existirem
["usuarios", "titulos", "avaliacoes"].forEach((nome) => banco.getCollection(nome).drop());

// -------------------------------------------------------------
// Coleção: usuarios
// Guarda só o necessário (minimização de dados - LGPD).
// -------------------------------------------------------------
banco.createCollection("usuarios", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["apelido", "email", "senhaHash", "criadoEm"],
      properties: {
        apelido:   { bsonType: "string", minLength: 3, maxLength: 30, description: "apelido público" },
        email:     { bsonType: "string", pattern: "^.+@.+\\..+$", description: "e-mail para login" },
        senhaHash: { bsonType: "string", description: "hash da senha, nunca a senha em texto puro" },
        criadoEm:  { bsonType: "date" }
      }
    }
  }
});

// -------------------------------------------------------------
// Coleção: titulos (filmes, séries e jogos)
// notaMedia e totalAvaliacoes são desnormalizados para leitura rápida.
// -------------------------------------------------------------
banco.createCollection("titulos", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["nome", "tipo", "ano", "notaMedia", "totalAvaliacoes"],
      properties: {
        nome:            { bsonType: "string" },
        tipo:            { enum: ["filme", "serie", "jogo"], description: "tipo do título" },
        genero:          { bsonType: "string" },
        ano:             { bsonType: "number", minimum: 1880 },
        notaMedia:       { bsonType: "number", minimum: 0, maximum: 5 },
        totalAvaliacoes: { bsonType: "number", minimum: 0 }
      }
    }
  }
});

// -------------------------------------------------------------
// Coleção: avaliacoes
// Referencia o título e o usuário pelos seus _id.
// -------------------------------------------------------------
banco.createCollection("avaliacoes", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["tituloId", "usuarioId", "apelido", "nota", "data"],
      properties: {
        tituloId:   { bsonType: "objectId" },
        usuarioId:  { bsonType: "objectId" },
        apelido:    { bsonType: "string", description: "cópia do apelido para exibição" },
        nota:       { bsonType: "number", minimum: 1, maximum: 5 },
        comentario: { bsonType: "string", maxLength: 500 },
        data:       { bsonType: "date" }
      }
    }
  }
});

// -------------------------------------------------------------
// Índices
// -------------------------------------------------------------
banco.usuarios.createIndex({ email: 1 }, { unique: true });
banco.usuarios.createIndex({ apelido: 1 }, { unique: true });

banco.titulos.createIndex({ tipo: 1, notaMedia: -1 }); // ranking por tipo
banco.titulos.createIndex({ nome: 1 });                // busca por nome

// Um usuário só pode avaliar cada título uma vez
banco.avaliacoes.createIndex({ tituloId: 1, usuarioId: 1 }, { unique: true });
banco.avaliacoes.createIndex({ usuarioId: 1 });       // avaliações de um usuário

print("Banco 'telascore' criado com as coleções:");
printjson(banco.getCollectionNames());