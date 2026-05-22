import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || join(__dirname, 'data');
mkdirSync(dataDir, { recursive: true });

const db = new Database(join(dataDir, 'engapp.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS convenios (
    id TEXT PRIMARY KEY,
    objeto TEXT NOT NULL,
    numero_convenio TEXT NOT NULL,
    data_convenio TEXT,
    processo_licitatorio TEXT,
    orcamento_total REAL DEFAULT 0,
    valor_liberado_caixa REAL DEFAULT 0,
    valor_liberado_estado REAL DEFAULT 0,
    total_gasto REAL DEFAULT 0,
    data_expiracao TEXT,
    status TEXT DEFAULT 'Ativo',
    alerta_formalizado INTEGER DEFAULT 0,
    criado_em TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS obras (
    id TEXT PRIMARY KEY,
    convenio_id TEXT NOT NULL,
    descricao TEXT NOT NULL,
    percentual_execucao REAL DEFAULT 0,
    previsao_conclusao TEXT,
    status TEXT DEFAULT 'Não iniciado',
    FOREIGN KEY (convenio_id) REFERENCES convenios(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS contratos (
    id TEXT PRIMARY KEY,
    obra_id TEXT NOT NULL UNIQUE,
    numero_contrato TEXT NOT NULL,
    construtora TEXT,
    data_inicio TEXT,
    data_expiracao TEXT,
    status TEXT DEFAULT 'Em execução',
    alerta_formalizado INTEGER DEFAULT 0,
    FOREIGN KEY (obra_id) REFERENCES obras(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS lancamentos (
    id TEXT PRIMARY KEY,
    convenio_id TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('receita', 'despesa')),
    valor REAL NOT NULL,
    data TEXT,
    descricao TEXT,
    FOREIGN KEY (convenio_id) REFERENCES convenios(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS relatorios (
    id TEXT PRIMARY KEY,
    convenio_id TEXT NOT NULL,
    data TEXT,
    numero_relatorio TEXT,
    nome_arquivo TEXT,
    observacoes TEXT,
    FOREIGN KEY (convenio_id) REFERENCES convenios(id) ON DELETE CASCADE
  );
`);

export default db;
