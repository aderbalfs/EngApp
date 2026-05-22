import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from './database.js';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'engapp-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

// ─── Helpers ──────────────────────────────────────────────

function generateId() {
  return Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, nome: user.nome },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// ─── Middleware ────────────────────────────────────────────

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  next();
}

export function requireSuperAdmin(req, res, next) {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Acesso restrito ao superusuário' });
  }
  next();
}

// ─── Auth Routes ──────────────────────────────────────────

export function registerAuthRoutes(app) {

  // Login
  app.post('/api/auth/login', async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND ativo = true', [email.toLowerCase().trim()]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    const valid = await comparePassword(senha, user.senha_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: { id: user.id, nome: user.nome, email: user.email, role: user.role },
    });
  });

  // Verificar token / dados do usuário logado
  app.get('/api/auth/me', authenticate, async (req, res) => {
    const result = await pool.query('SELECT id, nome, email, role FROM usuarios WHERE id = $1 AND ativo = true', [req.user.id]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
    res.json(user);
  });

  // ─── Gerenciamento de usuários (admin only) ─────────────

  // Listar usuários
  app.get('/api/usuarios', authenticate, requireSuperAdmin, async (req, res) => {
    const result = await pool.query('SELECT id, nome, email, role, ativo, criado_em FROM usuarios ORDER BY criado_em DESC');
    res.json(result.rows);
  });

  // Criar usuário
  app.post('/api/usuarios', authenticate, requireSuperAdmin, async (req, res) => {
    const { nome, email, senha, role } = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    const exists = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email.toLowerCase().trim()]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    const id = generateId();
    const senha_hash = await hashPassword(senha);
    await pool.query(
      'INSERT INTO usuarios (id, nome, email, senha_hash, role) VALUES ($1, $2, $3, $4, $5)',
      [id, nome, email.toLowerCase().trim(), senha_hash, role || 'viewer']
    );

    const result = await pool.query('SELECT id, nome, email, role, ativo, criado_em FROM usuarios WHERE id = $1', [id]);
    res.status(201).json(result.rows[0]);
  });

  // Atualizar usuário
  app.put('/api/usuarios/:id', authenticate, requireSuperAdmin, async (req, res) => {
    const { nome, email, senha, role, ativo } = req.body;
    const user = await pool.query('SELECT * FROM usuarios WHERE id = $1', [req.params.id]);
    if (!user.rows[0]) return res.status(404).json({ error: 'Usuário não encontrado' });

    if (senha) {
      const senha_hash = await hashPassword(senha);
      await pool.query('UPDATE usuarios SET nome=$1, email=$2, senha_hash=$3, role=$4, ativo=$5 WHERE id=$6',
        [nome, email.toLowerCase().trim(), senha_hash, role, ativo, req.params.id]);
    } else {
      await pool.query('UPDATE usuarios SET nome=$1, email=$2, role=$3, ativo=$4 WHERE id=$5',
        [nome, email.toLowerCase().trim(), role, ativo, req.params.id]);
    }

    const result = await pool.query('SELECT id, nome, email, role, ativo, criado_em FROM usuarios WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
  });

  // Deletar usuário
  app.delete('/api/usuarios/:id', authenticate, requireSuperAdmin, async (req, res) => {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Você não pode deletar sua própria conta' });
    }
    await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  });
}
