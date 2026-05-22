const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

function getToken() {
  return localStorage.getItem('engapp_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...options,
  });

  if (res.status === 401) {
    localStorage.removeItem('engapp_token');
    localStorage.removeItem('engapp_user');
    window.location.href = '/';
    throw new Error('Sessao expirada');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro de rede' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Auth
export const login = (email, senha) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) });
export const getMe = () => request('/auth/me');

// Convênios
export const fetchConvenios = () => request('/convenios');
export const createConvenio = (data) => request('/convenios', { method: 'POST', body: JSON.stringify(data) });
export const updateConvenio = (id, data) => request(`/convenios/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const patchConvenio = (id, data) => request(`/convenios/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteConvenio = (id) => request(`/convenios/${id}`, { method: 'DELETE' });
export const importConvenios = (items) => request('/convenios/import', { method: 'POST', body: JSON.stringify({ items }) });

// Obras
export const fetchObras = (convenioId) => request(`/convenios/${convenioId}/obras`);
export const createObra = (data) => request('/obras', { method: 'POST', body: JSON.stringify(data) });
export const updateObra = (id, data) => request(`/obras/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteObra = (id) => request(`/obras/${id}`, { method: 'DELETE' });

// Contratos
export const fetchContratos = () => request('/contratos');
export const fetchContrato = (obraId) => request(`/obras/${obraId}/contrato`);
export const createContrato = (data) => request('/contratos', { method: 'POST', body: JSON.stringify(data) });
export const updateContrato = (id, data) => request(`/contratos/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const patchContrato = (id, data) => request(`/contratos/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteContrato = (id) => request(`/contratos/${id}`, { method: 'DELETE' });

// Lançamentos
export const fetchLancamentos = (convenioId) => request(`/convenios/${convenioId}/lancamentos`);
export const createLancamento = (data) => request('/lancamentos', { method: 'POST', body: JSON.stringify(data) });
export const deleteLancamento = (id) => request(`/lancamentos/${id}`, { method: 'DELETE' });

// Relatórios
export const fetchRelatorios = (convenioId) => request(`/convenios/${convenioId}/relatorios`);
export const createRelatorio = (data) => request('/relatorios', { method: 'POST', body: JSON.stringify(data) });
export const deleteRelatorio = (id) => request(`/relatorios/${id}`, { method: 'DELETE' });

// Dashboard
export const fetchDashboard = () => request('/dashboard');
