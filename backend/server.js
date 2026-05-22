import express from 'express';
import cors from 'cors';
import db from './database.js';
import crypto from 'crypto';

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

// ─── Convênios ────────────────────────────────────────────

app.get('/api/convenios', (req, res) => {
  const rows = db.prepare('SELECT * FROM convenios ORDER BY criado_em DESC').all();
  res.json(rows);
});

app.get('/api/convenios/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM convenios WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Convênio não encontrado' });
  res.json(row);
});

app.post('/api/convenios', (req, res) => {
  const id = generateId();
  const { objeto, numero_convenio, data_convenio, processo_licitatorio, orcamento_total, valor_liberado_caixa, valor_liberado_estado, total_gasto, data_expiracao, status } = req.body;
  db.prepare(`
    INSERT INTO convenios (id, objeto, numero_convenio, data_convenio, processo_licitatorio, orcamento_total, valor_liberado_caixa, valor_liberado_estado, total_gasto, data_expiracao, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, objeto, numero_convenio, data_convenio, processo_licitatorio, orcamento_total || 0, valor_liberado_caixa || 0, valor_liberado_estado || 0, total_gasto || 0, data_expiracao, status || 'Ativo');
  const row = db.prepare('SELECT * FROM convenios WHERE id = ?').get(id);
  res.status(201).json(row);
});

app.put('/api/convenios/:id', (req, res) => {
  const { objeto, numero_convenio, data_convenio, processo_licitatorio, orcamento_total, valor_liberado_caixa, valor_liberado_estado, total_gasto, data_expiracao, status, alerta_formalizado } = req.body;
  db.prepare(`
    UPDATE convenios SET objeto=?, numero_convenio=?, data_convenio=?, processo_licitatorio=?, orcamento_total=?, valor_liberado_caixa=?, valor_liberado_estado=?, total_gasto=?, data_expiracao=?, status=?, alerta_formalizado=?
    WHERE id=?
  `).run(objeto, numero_convenio, data_convenio, processo_licitatorio, orcamento_total || 0, valor_liberado_caixa || 0, valor_liberado_estado || 0, total_gasto || 0, data_expiracao, status, alerta_formalizado ? 1 : 0, req.params.id);
  const row = db.prepare('SELECT * FROM convenios WHERE id = ?').get(req.params.id);
  res.json(row);
});

app.patch('/api/convenios/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM convenios WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Convênio não encontrado' });
  const fields = Object.keys(req.body);
  const sets = fields.map(f => `${f}=?`).join(', ');
  const values = fields.map(f => req.body[f]);
  db.prepare(`UPDATE convenios SET ${sets} WHERE id=?`).run(...values, req.params.id);
  const row = db.prepare('SELECT * FROM convenios WHERE id = ?').get(req.params.id);
  res.json(row);
});

app.delete('/api/convenios/:id', (req, res) => {
  db.prepare('DELETE FROM convenios WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/convenios/import', (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items deve ser um array' });

  const insert = db.prepare(`
    INSERT INTO convenios (id, objeto, numero_convenio, data_convenio, processo_licitatorio, orcamento_total, valor_liberado_caixa, valor_liberado_estado, total_gasto, data_expiracao, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((list) => {
    for (const item of list) {
      insert.run(
        generateId(), item.objeto, item.numero_convenio, item.data_convenio,
        item.processo_licitatorio, item.orcamento_total || 0, item.valor_liberado_caixa || 0,
        item.valor_liberado_estado || 0, item.total_gasto || 0, item.data_expiracao, item.status || 'Ativo'
      );
    }
  });

  insertMany(items);
  res.status(201).json({ imported: items.length });
});

// ─── Obras ────────────────────────────────────────────────

app.get('/api/convenios/:convenioId/obras', (req, res) => {
  const rows = db.prepare('SELECT * FROM obras WHERE convenio_id = ?').all(req.params.convenioId);
  res.json(rows);
});

app.post('/api/obras', (req, res) => {
  const id = generateId();
  const { convenio_id, descricao, percentual_execucao, previsao_conclusao, status } = req.body;
  db.prepare(`
    INSERT INTO obras (id, convenio_id, descricao, percentual_execucao, previsao_conclusao, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, convenio_id, descricao, percentual_execucao || 0, previsao_conclusao, status || 'Não iniciado');
  const row = db.prepare('SELECT * FROM obras WHERE id = ?').get(id);
  res.status(201).json(row);
});

app.put('/api/obras/:id', (req, res) => {
  const { descricao, percentual_execucao, previsao_conclusao, status } = req.body;
  db.prepare('UPDATE obras SET descricao=?, percentual_execucao=?, previsao_conclusao=?, status=? WHERE id=?')
    .run(descricao, percentual_execucao || 0, previsao_conclusao, status, req.params.id);
  const row = db.prepare('SELECT * FROM obras WHERE id = ?').get(req.params.id);
  res.json(row);
});

app.delete('/api/obras/:id', (req, res) => {
  db.prepare('DELETE FROM obras WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── Contratos ────────────────────────────────────────────

app.get('/api/obras/:obraId/contrato', (req, res) => {
  const row = db.prepare('SELECT * FROM contratos WHERE obra_id = ?').get(req.params.obraId);
  res.json(row || null);
});

app.get('/api/contratos', (req, res) => {
  const rows = db.prepare('SELECT * FROM contratos').all();
  res.json(rows);
});

app.post('/api/contratos', (req, res) => {
  const id = generateId();
  const { obra_id, numero_contrato, construtora, data_inicio, data_expiracao, status } = req.body;
  db.prepare(`
    INSERT INTO contratos (id, obra_id, numero_contrato, construtora, data_inicio, data_expiracao, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, obra_id, numero_contrato, construtora, data_inicio, data_expiracao, status || 'Em execução');
  const row = db.prepare('SELECT * FROM contratos WHERE id = ?').get(id);
  res.status(201).json(row);
});

app.put('/api/contratos/:id', (req, res) => {
  const { numero_contrato, construtora, data_inicio, data_expiracao, status, alerta_formalizado } = req.body;
  db.prepare('UPDATE contratos SET numero_contrato=?, construtora=?, data_inicio=?, data_expiracao=?, status=?, alerta_formalizado=? WHERE id=?')
    .run(numero_contrato, construtora, data_inicio, data_expiracao, status, alerta_formalizado ? 1 : 0, req.params.id);
  const row = db.prepare('SELECT * FROM contratos WHERE id = ?').get(req.params.id);
  res.json(row);
});

app.patch('/api/contratos/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM contratos WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contrato não encontrado' });
  const fields = Object.keys(req.body);
  const sets = fields.map(f => `${f}=?`).join(', ');
  const values = fields.map(f => req.body[f]);
  db.prepare(`UPDATE contratos SET ${sets} WHERE id=?`).run(...values, req.params.id);
  const row = db.prepare('SELECT * FROM contratos WHERE id = ?').get(req.params.id);
  res.json(row);
});

app.delete('/api/contratos/:id', (req, res) => {
  db.prepare('DELETE FROM contratos WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── Lançamentos ──────────────────────────────────────────

app.get('/api/convenios/:convenioId/lancamentos', (req, res) => {
  const rows = db.prepare('SELECT * FROM lancamentos WHERE convenio_id = ? ORDER BY data DESC').all(req.params.convenioId);
  res.json(rows);
});

app.post('/api/lancamentos', (req, res) => {
  const id = generateId();
  const { convenio_id, tipo, valor, data, descricao } = req.body;
  db.prepare('INSERT INTO lancamentos (id, convenio_id, tipo, valor, data, descricao) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, convenio_id, tipo, valor, data, descricao);
  const row = db.prepare('SELECT * FROM lancamentos WHERE id = ?').get(id);
  res.status(201).json(row);
});

app.delete('/api/lancamentos/:id', (req, res) => {
  db.prepare('DELETE FROM lancamentos WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── Relatórios ───────────────────────────────────────────

app.get('/api/convenios/:convenioId/relatorios', (req, res) => {
  const rows = db.prepare('SELECT * FROM relatorios WHERE convenio_id = ? ORDER BY data DESC').all(req.params.convenioId);
  res.json(rows);
});

app.post('/api/relatorios', (req, res) => {
  const id = generateId();
  const { convenio_id, data, numero_relatorio, nome_arquivo, observacoes } = req.body;
  db.prepare('INSERT INTO relatorios (id, convenio_id, data, numero_relatorio, nome_arquivo, observacoes) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, convenio_id, data, numero_relatorio, nome_arquivo, observacoes);
  const row = db.prepare('SELECT * FROM relatorios WHERE id = ?').get(id);
  res.status(201).json(row);
});

app.delete('/api/relatorios/:id', (req, res) => {
  db.prepare('DELETE FROM relatorios WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── Dashboard Stats ──────────────────────────────────────

app.get('/api/dashboard', (req, res) => {
  const totalAtivos = db.prepare("SELECT COUNT(*) as count FROM convenios WHERE status = 'Ativo'").get().count;
  const valorTotal = db.prepare('SELECT COALESCE(SUM(orcamento_total), 0) as total FROM convenios').get().total;
  const obrasAndamento = db.prepare("SELECT COUNT(*) as count FROM obras WHERE status = 'Em andamento'").get().count;
  res.json({ totalAtivos, valorTotal, obrasAndamento });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`EngApp API running on port ${PORT}`);
});
