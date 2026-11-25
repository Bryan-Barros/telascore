// Seleciona (ou cria) o banco "telascore".
// No MongoDB, o banco só passa a existir de fato quando recebe a primeira coleção.
const banco = db.getSiblingDB("telascore");

// Remove as coleções antigas, se existirem
// ("avaliacoes" era uma coleção separada na versão anterior do modelo)
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
// Cada título guarda a lista das suas avaliações (documentos embutidos).
// notaMedia e totalAvaliacoes ficam salvos para leitura rápida.
// -------------------------------------------------------------
banco.createCollection("titulos", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["nome", "tipo", "ano", "notaMedia", "totalAvaliacoes", "avaliacoes"],
      properties: {
        nome:            { bsonType: "string" },
        tipo:            { enum: ["filme", "serie", "jogo"], description: "tipo do título" },
        genero:          { bsonType: "string" },
        ano:             { bsonType: "number", minimum: 1880 },
        notaMedia:       { bsonType: "number", minimum: 0, maximum: 5 },
        totalAvaliacoes: { bsonType: "number", minimum: 0 },

        // Lista de avaliações embutidas no título
        avaliacoes: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["usuarioId", "apelido", "nota", "data"],
            properties: {
              usuarioId:  { bsonType: "objectId", description: "referência ao usuário que avaliou" },
              apelido:    { bsonType: "string", description: "cópia do apelido para exibição" },
              nota:       { bsonType: "number", minimum: 1, maximum: 5 },
              comentario: { bsonType: "string", maxLength: 500 },
              data:       { bsonType: "date" }
            }
          }
        }
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

// Índice "multikey" (em campo dentro de lista): encontra rápido
// os títulos avaliados por um usuário ("minhas avaliações")
banco.titulos.createIndex({ "avaliacoes.usuarioId": 1 });

print("Banco 'telascore' criado com as coleções:");
printjson(banco.getCollectionNames());