import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as api from '../utils/api';

const DataContext = createContext(null);

function snakeToCamel(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camel] = val;
  }
  return result;
}

function camelToSnake(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    const snake = key.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
    result[snake] = val;
  }
  return result;
}

export function DataProvider({ children }) {
  const [convenios, setConvenios] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshConvenios = useCallback(async () => {
    const data = await api.fetchConvenios();
    setConvenios(data.map(snakeToCamel));
  }, []);

  const refreshContratos = useCallback(async () => {
    const data = await api.fetchContratos();
    setContratos(data.map(snakeToCamel));
  }, []);

  useEffect(() => {
    Promise.all([refreshConvenios(), refreshContratos()])
      .finally(() => setLoading(false));
  }, [refreshConvenios, refreshContratos]);

  // ─── Convênios ──────────────────────────────────────

  const addConvenio = useCallback(async (data) => {
    const row = await api.createConvenio(camelToSnake(data));
    setConvenios((prev) => [snakeToCamel(row), ...prev]);
    return snakeToCamel(row);
  }, []);

  const updateConvenio = useCallback(async (id, data) => {
    const current = convenios.find((c) => c.id === id);
    const merged = { ...current, ...data };
    const row = await api.updateConvenio(id, camelToSnake(merged));
    setConvenios((prev) => prev.map((c) => (c.id === id ? snakeToCamel(row) : c)));
  }, [convenios]);

  const patchConvenio = useCallback(async (id, data) => {
    const row = await api.patchConvenio(id, camelToSnake(data));
    setConvenios((prev) => prev.map((c) => (c.id === id ? snakeToCamel(row) : c)));
  }, []);

  const deleteConvenio = useCallback(async (id) => {
    await api.deleteConvenio(id);
    setConvenios((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const importConveniosBatch = useCallback(async (items) => {
    const snakeItems = items.map(camelToSnake);
    const result = await api.importConvenios(snakeItems);
    await refreshConvenios();
    return result.imported;
  }, [refreshConvenios]);

  // ─── Obras ──────────────────────────────────────────

  const fetchObrasByConvenio = useCallback(async (convenioId) => {
    const data = await api.fetchObras(convenioId);
    return data.map(snakeToCamel);
  }, []);

  const addObra = useCallback(async (data) => {
    const row = await api.createObra(camelToSnake(data));
    return snakeToCamel(row);
  }, []);

  const updateObra = useCallback(async (id, data) => {
    const row = await api.updateObra(id, camelToSnake(data));
    return snakeToCamel(row);
  }, []);

  const deleteObra = useCallback(async (id) => {
    await api.deleteObra(id);
  }, []);

  // ─── Contratos ──────────────────────────────────────

  const fetchContratoByObra = useCallback(async (obraId) => {
    const data = await api.fetchContrato(obraId);
    return data ? snakeToCamel(data) : null;
  }, []);

  const addContrato = useCallback(async (data) => {
    const row = await api.createContrato(camelToSnake(data));
    const camel = snakeToCamel(row);
    setContratos((prev) => [...prev, camel]);
    return camel;
  }, []);

  const updateContrato = useCallback(async (id, data) => {
    const current = contratos.find((c) => c.id === id);
    const merged = { ...current, ...data };
    const row = await api.updateContrato(id, camelToSnake(merged));
    const camel = snakeToCamel(row);
    setContratos((prev) => prev.map((c) => (c.id === id ? camel : c)));
    return camel;
  }, [contratos]);

  const patchContrato = useCallback(async (id, data) => {
    const row = await api.patchContrato(id, camelToSnake(data));
    const camel = snakeToCamel(row);
    setContratos((prev) => prev.map((c) => (c.id === id ? camel : c)));
    return camel;
  }, []);

  const deleteContrato = useCallback(async (id) => {
    await api.deleteContrato(id);
    setContratos((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // ─── Lançamentos ────────────────────────────────────

  const fetchLancamentosByConvenio = useCallback(async (convenioId) => {
    const data = await api.fetchLancamentos(convenioId);
    return data.map(snakeToCamel);
  }, []);

  const addLancamento = useCallback(async (data) => {
    const row = await api.createLancamento(camelToSnake(data));
    return snakeToCamel(row);
  }, []);

  const deleteLancamento = useCallback(async (id) => {
    await api.deleteLancamento(id);
  }, []);

  // ─── Relatórios ─────────────────────────────────────

  const fetchRelatoriosByConvenio = useCallback(async (convenioId) => {
    const data = await api.fetchRelatorios(convenioId);
    return data.map(snakeToCamel);
  }, []);

  const addRelatorio = useCallback(async (data) => {
    const row = await api.createRelatorio(camelToSnake(data));
    return snakeToCamel(row);
  }, []);

  const deleteRelatorio = useCallback(async (id) => {
    await api.deleteRelatorio(id);
  }, []);

  // ─── Saldo ──────────────────────────────────────────

  const getSaldoConvenio = useCallback((convenioId, lancamentos = []) => {
    const convenio = convenios.find((c) => c.id === convenioId);
    if (!convenio) return 0;
    const totalRecebido = (parseFloat(convenio.valorLiberadoCaixa) || 0) +
      (parseFloat(convenio.valorLiberadoEstado) || 0);
    const totalGasto = lancamentos
      .filter((l) => l.tipo === 'despesa')
      .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0);
    return totalRecebido - totalGasto;
  }, [convenios]);

  return (
    <DataContext.Provider value={{
      convenios, loading,
      addConvenio, updateConvenio, patchConvenio, deleteConvenio, importConvenios: importConveniosBatch,
      refreshConvenios,
      contratos, refreshContratos,
      addContrato, updateContrato, patchContrato, deleteContrato, fetchContratoByObra,
      fetchObrasByConvenio, addObra, updateObra, deleteObra,
      fetchLancamentosByConvenio, addLancamento, deleteLancamento,
      fetchRelatoriosByConvenio, addRelatorio, deleteRelatorio,
      getSaldoConvenio,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
