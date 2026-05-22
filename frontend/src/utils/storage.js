const KEYS = {
  CONVENIOS: 'engapp_convenios',
  OBRAS: 'engapp_obras',
  CONTRATOS: 'engapp_contratos',
  LANCAMENTOS: 'engapp_lancamentos',
  RELATORIOS: 'engapp_relatorios',
  USER: 'engapp_user',
};

function get(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function set(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function getConvenios() { return get(KEYS.CONVENIOS); }
export function setConvenios(data) { set(KEYS.CONVENIOS, data); }

export function getObras() { return get(KEYS.OBRAS); }
export function setObras(data) { set(KEYS.OBRAS, data); }

export function getContratos() { return get(KEYS.CONTRATOS); }
export function setContratos(data) { set(KEYS.CONTRATOS, data); }

export function getLancamentos() { return get(KEYS.LANCAMENTOS); }
export function setLancamentos(data) { set(KEYS.LANCAMENTOS, data); }

export function getRelatorios() { return get(KEYS.RELATORIOS); }
export function setRelatorios(data) { set(KEYS.RELATORIOS, data); }

export function getUser() {
  try {
    const data = localStorage.getItem(KEYS.USER);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}
export function setUser(data) { set(KEYS.USER, data); }
export function clearUser() { localStorage.removeItem(KEYS.USER); }
