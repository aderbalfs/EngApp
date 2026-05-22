import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
});

export async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS convenios (
        id TEXT PRIMARY KEY,
        objeto TEXT NOT NULL,
        numero_convenio TEXT NOT NULL,
        data_convenio TEXT,
        processo_licitatorio TEXT,
        orcamento_total NUMERIC DEFAULT 0,
        valor_liberado_caixa NUMERIC DEFAULT 0,
        valor_liberado_estado NUMERIC DEFAULT 0,
        total_gasto NUMERIC DEFAULT 0,
        data_expiracao TEXT,
        status TEXT DEFAULT 'Ativo',
        alerta_formalizado INTEGER DEFAULT 0,
        criado_em TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS obras (
        id TEXT PRIMARY KEY,
        convenio_id TEXT NOT NULL REFERENCES convenios(id) ON DELETE CASCADE,
        descricao TEXT NOT NULL,
        percentual_execucao NUMERIC DEFAULT 0,
        previsao_conclusao TEXT,
        status TEXT DEFAULT 'Não iniciado'
      );

      CREATE TABLE IF NOT EXISTS contratos (
        id TEXT PRIMARY KEY,
        obra_id TEXT NOT NULL UNIQUE REFERENCES obras(id) ON DELETE CASCADE,
        numero_contrato TEXT NOT NULL,
        construtora TEXT,
        data_inicio TEXT,
        data_expiracao TEXT,
        status TEXT DEFAULT 'Em execução',
        alerta_formalizado INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS lancamentos (
        id TEXT PRIMARY KEY,
        convenio_id TEXT NOT NULL REFERENCES convenios(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL CHECK(tipo IN ('receita', 'despesa')),
        valor NUMERIC NOT NULL,
        data TEXT,
        descricao TEXT
      );

      CREATE TABLE IF NOT EXISTS relatorios (
        id TEXT PRIMARY KEY,
        convenio_id TEXT NOT NULL REFERENCES convenios(id) ON DELETE CASCADE,
        data TEXT,
        numero_relatorio TEXT,
        nome_arquivo TEXT,
        observacoes TEXT
      );

      CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        senha_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin', 'viewer')),
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Database tables initialized');
  } finally {
    client.release();
  }
}

export default pool;
