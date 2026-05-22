import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import pool, { initDB } from './database.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));
app.use(express.json({ limit: '10mb' }));

function generateId() {
  return Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
}

// Helper para queries
async function query(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}

async function queryOne(text, params) {
  const res = await pool.query(text, params);
  return res.rows[0] || null;
}

// ─── Convênios ────────────────────────────────────────────

app.get('/api/convenios', async (req, res) => {
  const rows = await query('SELECT * FROM convenios ORDER BY criado_em DESC');
  res.json(rows);
});

app.get('/api/convenios/:id', async (req, res) => {
  const row = await queryOne('SELECT * FROM convenios WHERE id = $1', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Convênio não encontrado' });
  res.json(row);
});

app.post('/api/convenios', async (req, res) => {
  const id = generateId();
  const { objeto, numero_convenio, data_convenio, processo_licitatorio, orcamento_total, valor_liberado_caixa, valor_liberado_estado, total_gasto, data_expiracao, status } = req.body;
  await query(`
    INSERT INTO convenios (id, objeto, numero_convenio, data_convenio, processo_licitatorio, orcamento_total, valor_liberado_caixa, valor_liberado_estado, total_gasto, data_expiracao, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [id, objeto, numero_convenio, data_convenio, processo_licitatorio, orcamento_total || 0, valor_liberado_caixa || 0, valor_liberado_estado || 0, total_gasto || 0, data_expiracao, status || 'Ativo']);
  const row = await queryOne('SELECT * FROM convenios WHERE id = $1', [id]);
  res.status(201).json(row);
});

app.put('/api/convenios/:id', async (req, res) => {
  const { objeto, numero_convenio, data_convenio, processo_licitatorio, orcamento_total, valor_liberado_caixa, valor_liberado_estado, total_gasto, data_expiracao, status, alerta_formalizado } = req.body;
  await query(`
    UPDATE convenios SET objeto=$1, numero_convenio=$2, data_convenio=$3, processo_licitatorio=$4, orcamento_total=$5, valor_liberado_caixa=$6, valor_liberado_estado=$7, total_gasto=$8, data_expiracao=$9, status=$10, alerta_formalizado=$11
    WHERE id=$12
  `, [objeto, numero_convenio, data_convenio, processo_licitatorio, orcamento_total || 0, valor_liberado_caixa || 0, valor_liberado_estado || 0, total_gasto || 0, data_expiracao, status, alerta_formalizado ? 1 : 0, req.params.id]);
  const row = await queryOne('SELECT * FROM convenios WHERE id = $1', [req.params.id]);
  res.json(row);
});

app.patch('/api/convenios/:id', async (req, res) => {
  const existing = await queryOne('SELECT * FROM convenios WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Convênio não encontrado' });
  const fields = Object.keys(req.body);
  const sets = fields.map((f, i) => `${f}=$${i + 1}`).join(', ');
  const values = fields.map(f => req.body[f]);
  await query(`UPDATE convenios SET ${sets} WHERE id=$${fields.length + 1}`, [...values, req.params.id]);
  const row = await queryOne('SELECT * FROM convenios WHERE id = $1', [req.params.id]);
  res.json(row);
});

app.delete('/api/convenios/:id', async (req, res) => {
  await query('DELETE FROM convenios WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

app.post('/api/convenios/import', async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items deve ser um array' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of items) {
      await client.query(`
        INSERT INTO convenios (id, objeto, numero_convenio, data_convenio, processo_licitatorio, orcamento_total, valor_liberado_caixa, valor_liberado_estado, total_gasto, data_expiracao, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [generateId(), item.objeto, item.numero_convenio, item.data_convenio, item.processo_licitatorio, item.orcamento_total || 0, item.valor_liberado_caixa || 0, item.valor_liberado_estado || 0, item.total_gasto || 0, item.data_expiracao, item.status || 'Ativo']);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  res.status(201).json({ imported: items.length });
});

// ─── Obras ────────────────────────────────────────────────

app.get('/api/convenios/:convenioId/obras', async (req, res) => {
  const rows = await query('SELECT * FROM obras WHERE convenio_id = $1', [req.params.convenioId]);
  res.json(rows);
});

app.post('/api/obras', async (req, res) => {
  const id = generateId();
  const { convenio_id, descricao, percentual_execucao, previsao_conclusao, status } = req.body;
  await query(`
    INSERT INTO obras (id, convenio_id, descricao, percentual_execucao, previsao_conclusao, status)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [id, convenio_id, descricao, percentual_execucao || 0, previsao_conclusao, status || 'Não iniciado']);
  const row = await queryOne('SELECT * FROM obras WHERE id = $1', [id]);
  res.status(201).json(row);
});

app.put('/api/obras/:id', async (req, res) => {
  const { descricao, percentual_execucao, previsao_conclusao, status } = req.body;
  await query('UPDATE obras SET descricao=$1, percentual_execucao=$2, previsao_conclusao=$3, status=$4 WHERE id=$5',
    [descricao, percentual_execucao || 0, previsao_conclusao, status, req.params.id]);
  const row = await queryOne('SELECT * FROM obras WHERE id = $1', [req.params.id]);
  res.json(row);
});

app.delete('/api/obras/:id', async (req, res) => {
  await query('DELETE FROM obras WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ─── Contratos ────────────────────────────────────────────

app.get('/api/obras/:obraId/contrato', async (req, res) => {
  const row = await queryOne('SELECT * FROM contratos WHERE obra_id = $1', [req.params.obraId]);
  res.json(row || null);
});

app.get('/api/contratos', async (req, res) => {
  const rows = await query('SELECT * FROM contratos');
  res.json(rows);
});

app.post('/api/contratos', async (req, res) => {
  const id = generateId();
  const { obra_id, numero_contrato, construtora, data_inicio, data_expiracao, status } = req.body;
  await query(`
    INSERT INTO contratos (id, obra_id, numero_contrato, construtora, data_inicio, data_expiracao, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [id, obra_id, numero_contrato, construtora, data_inicio, data_expiracao, status || 'Em execução']);
  const row = await queryOne('SELECT * FROM contratos WHERE id = $1', [id]);
  res.status(201).json(row);
});

app.put('/api/contratos/:id', async (req, res) => {
  const { numero_contrato, construtora, data_inicio, data_expiracao, status, alerta_formalizado } = req.body;
  await query('UPDATE contratos SET numero_contrato=$1, construtora=$2, data_inicio=$3, data_expiracao=$4, status=$5, alerta_formalizado=$6 WHERE id=$7',
    [numero_contrato, construtora, data_inicio, data_expiracao, status, alerta_formalizado ? 1 : 0, req.params.id]);
  const row = await queryOne('SELECT * FROM contratos WHERE id = $1', [req.params.id]);
  res.json(row);
});

app.patch('/api/contratos/:id', async (req, res) => {
  const existing = await queryOne('SELECT * FROM contratos WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Contrato não encontrado' });
  const fields = Object.keys(req.body);
  const sets = fields.map((f, i) => `${f}=$${i + 1}`).join(', ');
  const values = fields.map(f => req.body[f]);
  await query(`UPDATE contratos SET ${sets} WHERE id=$${fields.length + 1}`, [...values, req.params.id]);
  const row = await queryOne('SELECT * FROM contratos WHERE id = $1', [req.params.id]);
  res.json(row);
});

app.delete('/api/contratos/:id', async (req, res) => {
  await query('DELETE FROM contratos WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ─── Lançamentos ──────────────────────────────────────────

app.get('/api/convenios/:convenioId/lancamentos', async (req, res) => {
  const rows = await query('SELECT * FROM lancamentos WHERE convenio_id = $1 ORDER BY data DESC', [req.params.convenioId]);
  res.json(rows);
});

app.post('/api/lancamentos', async (req, res) => {
  const id = generateId();
  const { convenio_id, tipo, valor, data, descricao } = req.body;
  await query('INSERT INTO lancamentos (id, convenio_id, tipo, valor, data, descricao) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, convenio_id, tipo, valor, data, descricao]);
  const row = await queryOne('SELECT * FROM lancamentos WHERE id = $1', [id]);
  res.status(201).json(row);
});

app.delete('/api/lancamentos/:id', async (req, res) => {
  await query('DELETE FROM lancamentos WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ─── Relatórios ───────────────────────────────────────────

app.get('/api/convenios/:convenioId/relatorios', async (req, res) => {
  const rows = await query('SELECT * FROM relatorios WHERE convenio_id = $1 ORDER BY data DESC', [req.params.convenioId]);
  res.json(rows);
});

app.post('/api/relatorios', async (req, res) => {
  const id = generateId();
  const { convenio_id, data, numero_relatorio, nome_arquivo, observacoes } = req.body;
  await query('INSERT INTO relatorios (id, convenio_id, data, numero_relatorio, nome_arquivo, observacoes) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, convenio_id, data, numero_relatorio, nome_arquivo, observacoes]);
  const row = await queryOne('SELECT * FROM relatorios WHERE id = $1', [id]);
  res.status(201).json(row);
});

app.delete('/api/relatorios/:id', async (req, res) => {
  await query('DELETE FROM relatorios WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ─── Dashboard Stats ──────────────────────────────────────

app.get('/api/dashboard', async (req, res) => {
  const [ativos] = await query("SELECT COUNT(*) as count FROM convenios WHERE status = 'Ativo'");
  const [valor] = await query('SELECT COALESCE(SUM(orcamento_total), 0) as total FROM convenios');
  const [obras] = await query("SELECT COUNT(*) as count FROM obras WHERE status = 'Em andamento'");
  res.json({
    totalAtivos: parseInt(ativos.count),
    valorTotal: parseFloat(valor.total),
    obrasAndamento: parseInt(obras.count),
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ─── Start ────────────────────────────────────────────────

initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EngApp API running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
