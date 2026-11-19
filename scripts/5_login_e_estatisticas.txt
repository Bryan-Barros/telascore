const { createClient } = require("redis");

// Usa a URL passada por variável de ambiente ou conecta no Redis local/Cloud
const REDIS_URI = process.env.REDIS_URI || "redis://localhost:6379";

async function executar() {
  const redis = createClient({ url: REDIS_URI });
  redis.on("error", (err) => console.error("Erro no Redis:", err));

  await redis.connect();
  console.log("Conectado ao Redis com sucesso!\n");

  // =============================================================
  // PARTE 1: CACHE DE LOGIN E BLOOM FILTER DE USUÁRIOS
  // =============================================================
  const BF_USUARIOS = "bf:usuarios:emails";
  const CACHE_LOGIN = "cache:usuario:ci*******@exemplo.com";
  const SESSAO_KEY  = "sessao:token_abc123";

  // Limpa chaves anteriores para a demonstração
  await redis.del([BF_USUARIOS, CACHE_LOGIN, SESSAO_KEY]);

  // 1.1 Bloom Filter: evita consultar o MongoDB para e-mails inexistentes
  // Taxa de falso positivo: 0.1% (0.001) | Capacidade: 10.000 e-mails
  await redis.bf.reserve(BF_USUARIOS, 0.001, 10000);

  const emailsCadastrados = [
    "ci*******@exemplo.com",
    "ma*******@exemplo.com",
    "ga*******@exemplo.com",
    "pi*******@exemplo.com",
    "se*******@exemplo.com",
    "co*******@exemplo.com"
  ];

  for (const email of emailsCadastrados) {
    await redis.bf.add(BF_USUARIOS, email);
  }

  console.log("=== 1. Bloom Filter de E-mails (Login) ===");
  console.log("E-mail inexistente ('invasor@exemplo.com'):", await redis.bf.exists(BF_USUARIOS, "invasor@exemplo.com")); // false
  console.log("E-mail cadastrado ('ci*******@exemplo.com'):", await redis.bf.exists(BF_USUARIOS, "ci*******@exemplo.com")); // true

  // 1.2 Cache-Aside de Credenciais (TTL de 15 min = 900s)
  await redis.hSet(CACHE_LOGIN, {
    apelido: "cinefilo22",
    senhaHash: "HASH_FICTICIO_1"
  });
  await redis.expire(CACHE_LOGIN, 900);

  // 1.3 Cache de Sessão Ativa após Login (TTL de 1 hora = 3600s)
  await redis.hSet(SESSAO_KEY, {
    apelido: "cinefilo22",
    email: "ci*******@exemplo.com",
    perfil: "usuario"
  });
  await redis.expire(SESSAO_KEY, 3600);

  console.log("\n=== 2. Cache de Login e Sessão ===");
  console.log("Dados em cache:", await redis.hGetAll(CACHE_LOGIN));
  console.log("Sessão ativa:", await redis.hGetAll(SESSAO_KEY));
  console.log("Tempo restante da sessão (TTL):", await redis.ttl(SESSAO_KEY), "segundos");

  // =============================================================
  // PARTE 2: ESTATÍSTICAS DE USO (ESTRUTURAS PROBABILÍSTICAS)
  // =============================================================
  const HLL_ATIVOS    = "hll:usuarios_ativos:hoje";
  const CMS_TITULOS   = "cms:titulos:visualizacoes";
  const BF_AVALIACOES = "bf:avaliacoes:pares";

  await redis.del([HLL_ATIVOS, CMS_TITULOS, BF_AVALIACOES]);

  // 2.1 HyperLogLog: conta usuários únicos ativos (usa até 12 KB de memória)
  await redis.pfAdd(HLL_ATIVOS, [
    "cinefilo22", "maratonista", "gamerlia",
    "cinefilo22", "pipoqueiro", "gamerlia",   // repetidos são ignorados
    "seriemaniaca", "controle_rafa", "cinefilo22"
  ]);

  console.log("\n=== 3. HyperLogLog (Usuários Únicos Ativos) ===");
  console.log("Usuários únicos estimados hoje:", await redis.pfCount(HLL_ATIVOS)); // 6

  // 2.2 Count-Min Sketch: estima visualizações por título em tempo real
  await redis.cms.initByDim(CMS_TITULOS, 2000, 5);

  await redis.cms.incrBy(CMS_TITULOS, [
    { item: "A Odisseia", incrementBy: 8 },
    { item: "Ruptura", incrementBy: 5 },
    { item: "The Legend of Zelda: Tears of the Kingdom", incrementBy: 4 },
    { item: "Dark", incrementBy: 2 },
    { item: "Hollow Knight", incrementBy: 1 }
  ]);

  const titulosConsulta = ["A Odisseia", "Ruptura", "Dark", "Hollow Knight", "Minecraft"];
  const contagens = await redis.cms.query(CMS_TITULOS, titulosConsulta);

  console.log("\n=== 4. Count-Min Sketch (Visualizações por Título) ===");
  titulosConsulta.forEach((titulo, idx) => {
    console.log(`- ${titulo}: ~${contagens[idx]} visualizações`);
  });

  // 2.3 Bloom Filter: pré-checagem rápida de avaliações duplicadas
  await redis.bf.reserve(BF_AVALIACOES, 0.001, 50000);
  await redis.bf.add(BF_AVALIACOES, "A Odisseia:cinefilo22");
  await redis.bf.add(BF_AVALIACOES, "Ruptura:maratonista");

  console.log("\n=== 5. Bloom Filter (Avaliações Duplicadas) ===");
  console.log("'cinefilo22' já avaliou 'A Odisseia'?", await redis.bf.exists(BF_AVALIACOES, "A Odisseia:cinefilo22")); // true
  console.log("'cinefilo22' já avaliou 'Dark'?", await redis.bf.exists(BF_AVALIACOES, "Dark:cinefilo22"));             // false

  await redis.quit();
}

executar().catch(console.error);
