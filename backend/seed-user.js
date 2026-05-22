/**
 * Script para criar usuários no banco de dados.
 *
 * Uso:
 *   DATABASE_URL="postgresql://..." node seed-user.js --nome "Fulano" --email "fulano@email.com" --senha "123456" --role admin
 *
 * Parâmetros:
 *   --nome    Nome do usuário
 *   --email   Email (login)
 *   --senha   Senha em texto (será criptografada com bcrypt)
 *   --role    admin ou viewer (padrão: viewer)
 */

import pool, { initDB } from './database.js';
import { hashPassword } from './auth.js';
import crypto from 'crypto';

function generateId() {
  return Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
}

function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : null;
}

async function main() {
  const nome = getArg('nome');
  const email = getArg('email');
  const senha = getArg('senha');
  const role = getArg('role') || 'viewer';

  if (!nome || !email || !senha) {
    console.error('Uso: node seed-user.js --nome "Nome" --email "email@ex.com" --senha "senha" --role admin|viewer');
    process.exit(1);
  }

  await initDB();

  const exists = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email.toLowerCase().trim()]);
  if (exists.rows.length > 0) {
    console.error(`Erro: email "${email}" já está cadastrado.`);
    process.exit(1);
  }

  const id = generateId();
  const senha_hash = await hashPassword(senha);

  await pool.query(
    'INSERT INTO usuarios (id, nome, email, senha_hash, role) VALUES ($1, $2, $3, $4, $5)',
    [id, nome, email.toLowerCase().trim(), senha_hash, role]
  );

  console.log(`Usuário criado com sucesso!`);
  console.log(`  Nome:  ${nome}`);
  console.log(`  Email: ${email.toLowerCase().trim()}`);
  console.log(`  Role:  ${role}`);
  console.log(`  ID:    ${id}`);

  await pool.end();
}

main().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
