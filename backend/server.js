import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import pool, { initDB } from './database.js';
import { authenticate, requireAdmin, requireSuperAdmin, registerAuthRoutes } from './auth.js';

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

// ─── Audit Logger ────────────────────────────────────────
function parseDevice(ua) {
  if (!ua) return 'Desconhecido';
  if (/Mobile|Android|iPhone|iPad/i.test(ua)) return 'Mobile';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Macintosh|Mac OS/i.test(ua)) return 'Mac';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Outro';
}

function logAudit({ userId, userEmail, userNome, acao, metodo, rota, statusCode, ip, userAgent, detalhes }) {
  const dispositivo = parseDevice(userAgent);
  pool.query(
    `INSERT INTO audit_logs (user_id, user_email, user_nome, acao, metodo, rota, status_code, ip, user_agent, dispositivo, detalhes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [userId, userEmail, userNome, acao, metodo, rota, statusCode, ip, userAgent || '', dispositivo, detalhes || null]
  ).catch(() => {});
}

// Middleware que loga requisicoes autenticadas de escrita
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.path.startsWith('/api') && !req.path.includes('/auth/login')) {
    const originalEnd = res.end;
    res.end = function(...args) {
      if (req.user) {
        logAudit({
          userId: req.user.id,
          userEmail: req.user.email,
          userNome: req.user.nome,
          acao: `${req.method} ${req.path}`,
          metodo: req.method,
          rota: req.path,
          statusCode: res.statusCode,
          ip: req.headers['x-forwarded-for'] || req.ip,
          userAgent: req.headers['user-agent'],
        });
      }
      originalEnd.apply(res, args);
    };
  }
  next();
});

// ─── Auth (login, me, CRUD de usuários) ───────────────────
registerAuthRoutes(app, logAudit);

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

app.get('/api/convenios', authenticate, async (req, res) => {
  const rows = await query('SELECT * FROM convenios ORDER BY criado_em DESC');
  res.json(rows);
});

app.get('/api/convenios/:id', authenticate, async (req, res) => {
  const row = await queryOne('SELECT * FROM convenios WHERE id = $1', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Convênio não encontrado' });
  res.json(row);
});

app.post('/api/convenios', authenticate, requireAdmin, async (req, res) => {
  const id = generateId();
  const { objeto, numero_convenio, data_convenio, processo_licitatorio, orcamento_total, valor_liberado_caixa, valor_liberado_estado, total_gasto, data_expiracao, status } = req.body;
  await query(`
    INSERT INTO convenios (id, objeto, numero_convenio, data_convenio, processo_licitatorio, orcamento_total, valor_liberado_caixa, valor_liberado_estado, total_gasto, data_expiracao, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [id, objeto, numero_convenio, data_convenio, processo_licitatorio, orcamento_total || 0, valor_liberado_caixa || 0, valor_liberado_estado || 0, total_gasto || 0, data_expiracao, status || 'Ativo']);
  const row = await queryOne('SELECT * FROM convenios WHERE id = $1', [id]);
  res.status(201).json(row);
});

app.put('/api/convenios/:id', authenticate, requireAdmin, async (req, res) => {
  const { objeto, numero_convenio, data_convenio, processo_licitatorio, orcamento_total, valor_liberado_caixa, valor_liberado_estado, total_gasto, data_expiracao, status, alerta_formalizado } = req.body;
  await query(`
    UPDATE convenios SET objeto=$1, numero_convenio=$2, data_convenio=$3, processo_licitatorio=$4, orcamento_total=$5, valor_liberado_caixa=$6, valor_liberado_estado=$7, total_gasto=$8, data_expiracao=$9, status=$10, alerta_formalizado=$11
    WHERE id=$12
  `, [objeto, numero_convenio, data_convenio, processo_licitatorio, orcamento_total || 0, valor_liberado_caixa || 0, valor_liberado_estado || 0, total_gasto || 0, data_expiracao, status, alerta_formalizado ? 1 : 0, req.params.id]);
  const row = await queryOne('SELECT * FROM convenios WHERE id = $1', [req.params.id]);
  res.json(row);
});

app.patch('/api/convenios/:id', authenticate, requireAdmin, async (req, res) => {
  const existing = await queryOne('SELECT * FROM convenios WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Convênio não encontrado' });
  const fields = Object.keys(req.body);
  const sets = fields.map((f, i) => `${f}=$${i + 1}`).join(', ');
  const values = fields.map(f => req.body[f]);
  await query(`UPDATE convenios SET ${sets} WHERE id=$${fields.length + 1}`, [...values, req.params.id]);
  const row = await queryOne('SELECT * FROM convenios WHERE id = $1', [req.params.id]);
  res.json(row);
});

app.delete('/api/convenios/:id', authenticate, requireAdmin, async (req, res) => {
  await query('DELETE FROM convenios WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

app.post('/api/convenios/import', authenticate, requireAdmin, async (req, res) => {
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

app.get('/api/convenios/:convenioId/obras', authenticate, async (req, res) => {
  const rows = await query('SELECT * FROM obras WHERE convenio_id = $1', [req.params.convenioId]);
  res.json(rows);
});

app.post('/api/obras', authenticate, requireAdmin, async (req, res) => {
  const id = generateId();
  const { convenio_id, descricao, percentual_execucao, previsao_conclusao, status } = req.body;
  await query(`
    INSERT INTO obras (id, convenio_id, descricao, percentual_execucao, previsao_conclusao, status)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [id, convenio_id, descricao, percentual_execucao || 0, previsao_conclusao, status || 'Não iniciado']);
  const row = await queryOne('SELECT * FROM obras WHERE id = $1', [id]);
  res.status(201).json(row);
});

app.put('/api/obras/:id', authenticate, requireAdmin, async (req, res) => {
  const { descricao, percentual_execucao, previsao_conclusao, status } = req.body;
  await query('UPDATE obras SET descricao=$1, percentual_execucao=$2, previsao_conclusao=$3, status=$4 WHERE id=$5',
    [descricao, percentual_execucao || 0, previsao_conclusao, status, req.params.id]);
  const row = await queryOne('SELECT * FROM obras WHERE id = $1', [req.params.id]);
  res.json(row);
});

app.delete('/api/obras/:id', authenticate, requireAdmin, async (req, res) => {
  await query('DELETE FROM obras WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ─── Contratos ────────────────────────────────────────────

app.get('/api/obras/:obraId/contrato', authenticate, async (req, res) => {
  const row = await queryOne('SELECT * FROM contratos WHERE obra_id = $1', [req.params.obraId]);
  res.json(row || null);
});

app.get('/api/contratos', authenticate, async (req, res) => {
  const rows = await query('SELECT * FROM contratos');
  res.json(rows);
});

app.post('/api/contratos', authenticate, requireAdmin, async (req, res) => {
  const id = generateId();
  const { obra_id, numero_contrato, construtora, data_inicio, data_expiracao, status } = req.body;
  await query(`
    INSERT INTO contratos (id, obra_id, numero_contrato, construtora, data_inicio, data_expiracao, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [id, obra_id, numero_contrato, construtora, data_inicio, data_expiracao, status || 'Em execução']);
  const row = await queryOne('SELECT * FROM contratos WHERE id = $1', [id]);
  res.status(201).json(row);
});

app.put('/api/contratos/:id', authenticate, requireAdmin, async (req, res) => {
  const { numero_contrato, construtora, data_inicio, data_expiracao, status, alerta_formalizado } = req.body;
  await query('UPDATE contratos SET numero_contrato=$1, construtora=$2, data_inicio=$3, data_expiracao=$4, status=$5, alerta_formalizado=$6 WHERE id=$7',
    [numero_contrato, construtora, data_inicio, data_expiracao, status, alerta_formalizado ? 1 : 0, req.params.id]);
  const row = await queryOne('SELECT * FROM contratos WHERE id = $1', [req.params.id]);
  res.json(row);
});

app.patch('/api/contratos/:id', authenticate, requireAdmin, async (req, res) => {
  const existing = await queryOne('SELECT * FROM contratos WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Contrato não encontrado' });
  const fields = Object.keys(req.body);
  const sets = fields.map((f, i) => `${f}=$${i + 1}`).join(', ');
  const values = fields.map(f => req.body[f]);
  await query(`UPDATE contratos SET ${sets} WHERE id=$${fields.length + 1}`, [...values, req.params.id]);
  const row = await queryOne('SELECT * FROM contratos WHERE id = $1', [req.params.id]);
  res.json(row);
});

app.delete('/api/contratos/:id', authenticate, requireAdmin, async (req, res) => {
  await query('DELETE FROM contratos WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ─── Lançamentos ──────────────────────────────────────────

app.get('/api/convenios/:convenioId/lancamentos', authenticate, async (req, res) => {
  const rows = await query('SELECT * FROM lancamentos WHERE convenio_id = $1 ORDER BY data DESC', [req.params.convenioId]);
  res.json(rows);
});

app.post('/api/lancamentos', authenticate, requireAdmin, async (req, res) => {
  const id = generateId();
  const { convenio_id, tipo, valor, data, descricao } = req.body;
  await query('INSERT INTO lancamentos (id, convenio_id, tipo, valor, data, descricao) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, convenio_id, tipo, valor, data, descricao]);
  const row = await queryOne('SELECT * FROM lancamentos WHERE id = $1', [id]);
  res.status(201).json(row);
});

app.delete('/api/lancamentos/:id', authenticate, requireAdmin, async (req, res) => {
  await query('DELETE FROM lancamentos WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ─── Relatórios ───────────────────────────────────────────

app.get('/api/convenios/:convenioId/relatorios', authenticate, async (req, res) => {
  const rows = await query('SELECT * FROM relatorios WHERE convenio_id = $1 ORDER BY data DESC', [req.params.convenioId]);
  res.json(rows);
});

app.post('/api/relatorios', authenticate, requireAdmin, async (req, res) => {
  const id = generateId();
  const { convenio_id, data, numero_relatorio, nome_arquivo, observacoes } = req.body;
  await query('INSERT INTO relatorios (id, convenio_id, data, numero_relatorio, nome_arquivo, observacoes) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, convenio_id, data, numero_relatorio, nome_arquivo, observacoes]);
  const row = await queryOne('SELECT * FROM relatorios WHERE id = $1', [id]);
  res.status(201).json(row);
});

app.delete('/api/relatorios/:id', authenticate, requireAdmin, async (req, res) => {
  await query('DELETE FROM relatorios WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ─── Dashboard Stats ──────────────────────────────────────

app.get('/api/dashboard', authenticate, async (req, res) => {
  const [ativos] = await query("SELECT COUNT(*) as count FROM convenios WHERE status = 'Ativo'");
  const [valor] = await query('SELECT COALESCE(SUM(orcamento_total), 0) as total FROM convenios');
  const [obras] = await query("SELECT COUNT(*) as count FROM obras WHERE status = 'Em andamento'");
  res.json({
    totalAtivos: parseInt(ativos.count),
    valorTotal: parseFloat(valor.total),
    obrasAndamento: parseInt(obras.count),
  });
});

// ─── Audit Logs (superadmin only) ─────────────────────────

app.get('/api/audit-logs', authenticate, requireSuperAdmin, async (req, res) => {
  const { limit = 100, offset = 0, user_id, acao } = req.query;
  let sql = 'SELECT * FROM audit_logs';
  const params = [];
  const conditions = [];

  if (user_id) { params.push(user_id); conditions.push(`user_id = $${params.length}`); }
  if (acao) { params.push(`%${acao}%`); conditions.push(`acao ILIKE $${params.length}`); }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY criado_em DESC';
  params.push(parseInt(limit)); sql += ` LIMIT $${params.length}`;
  params.push(parseInt(offset)); sql += ` OFFSET $${params.length}`;

  const rows = await query(sql, params);
  const [{ count }] = await query('SELECT COUNT(*) as count FROM audit_logs' + (conditions.length ? ' WHERE ' + conditions.join(' AND ') : ''), conditions.length ? params.slice(0, conditions.length) : []);
  res.json({ logs: rows, total: parseInt(count) });
});

app.get('/api/audit-logs/stats', authenticate, requireSuperAdmin, async (req, res) => {
  const [logins] = await query("SELECT COUNT(*) as count FROM audit_logs WHERE acao = 'login_sucesso'");
  const [falhas] = await query("SELECT COUNT(*) as count FROM audit_logs WHERE acao = 'login_falha'");
  const [acoesHoje] = await query("SELECT COUNT(*) as count FROM audit_logs WHERE criado_em >= CURRENT_DATE");
  const usuarios = await query("SELECT DISTINCT user_email, user_nome, dispositivo, MAX(criado_em) as ultimo_acesso FROM audit_logs WHERE user_id IS NOT NULL GROUP BY user_email, user_nome, dispositivo ORDER BY ultimo_acesso DESC LIMIT 20");
  res.json({
    totalLogins: parseInt(logins.count),
    totalFalhas: parseInt(falhas.count),
    acoesHoje: parseInt(acoesHoje.count),
    sessoes: usuarios,
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
