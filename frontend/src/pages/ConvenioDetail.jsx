import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatDate, statusColor, daysUntil } from '../utils/helpers';
import {
  ArrowLeft, HardHat, DollarSign, FileText, Plus, Trash2, Edit3, AlertTriangle, Loader2
} from 'lucide-react';
import Modal from '../components/Modal';
import FormField, { Input, Select, Textarea } from '../components/FormField';

export default function ConvenioDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const {
    convenios,
    fetchObrasByConvenio, addObra, updateObra, deleteObra,
    fetchContratoByObra, addContrato, updateContrato, deleteContrato,
    fetchLancamentosByConvenio, addLancamento, deleteLancamento,
    fetchRelatoriosByConvenio, addRelatorio, deleteRelatorio,
    getSaldoConvenio,
  } = useData();

  const convenio = convenios.find((c) => c.id === id);
  const [tab, setTab] = useState('obras');

  if (!convenio) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Convênio não encontrado.</p>
        <button onClick={() => navigate('/convenios')} className="mt-4 text-primary-600 underline text-sm">
          Voltar para lista
        </button>
      </div>
    );
  }

  const tabs = [
    { key: 'obras', label: 'Obras', icon: HardHat },
    { key: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { key: 'relatorios', label: 'Relatórios', icon: FileText },
  ];

  const dias = daysUntil(convenio.dataExpiracao);

  return (
    <div>
      <button
        onClick={() => navigate('/convenios')}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-800">{convenio.numeroConvenio}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(convenio.status)}`}>
                {convenio.status}
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1">{convenio.objeto}</p>
          </div>
          {dias <= 30 && dias >= 0 && (
            <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg text-sm font-medium shrink-0">
              <AlertTriangle size={16} />
              Vence em {dias} dia(s)
            </div>
          )}
          {dias < 0 && (
            <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium shrink-0">
              <AlertTriangle size={16} />
              Vencido há {Math.abs(dias)} dia(s)
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
          {[
            { label: 'Processo Licitatório', value: convenio.processoLicitatorio || '—' },
            { label: 'Data do Convênio', value: formatDate(convenio.dataConvenio) },
            { label: 'Orçamento Total', value: formatCurrency(convenio.orcamentoTotal) },
            { label: 'Liberado (Caixa)', value: formatCurrency(convenio.valorLiberadoCaixa) },
            { label: 'Liberado (Estado)', value: formatCurrency(convenio.valorLiberadoEstado) },
            { label: 'Total Gasto', value: formatCurrency(convenio.totalGasto) },
            { label: 'Data Expiração', value: formatDate(convenio.dataExpiracao) },
          ].map((item) => (
            <div key={item.label} className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="font-semibold mt-0.5 text-slate-800">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 mb-4 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.key ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'obras' && (
        <ObrasTab
          convenioId={id}
          isAdmin={isAdmin}
          fetchObrasByConvenio={fetchObrasByConvenio}
          addObra={addObra}
          updateObra={updateObra}
          deleteObra={deleteObra}
          fetchContratoByObra={fetchContratoByObra}
          addContrato={addContrato}
          updateContrato={updateContrato}
          deleteContrato={deleteContrato}
        />
      )}
      {tab === 'financeiro' && (
        <FinanceiroTab
          convenioId={id}
          convenio={convenio}
          isAdmin={isAdmin}
          fetchLancamentosByConvenio={fetchLancamentosByConvenio}
          addLancamento={addLancamento}
          deleteLancamento={deleteLancamento}
          getSaldoConvenio={getSaldoConvenio}
        />
      )}
      {tab === 'relatorios' && (
        <RelatoriosTab
          convenioId={id}
          isAdmin={isAdmin}
          fetchRelatoriosByConvenio={fetchRelatoriosByConvenio}
          addRelatorio={addRelatorio}
          deleteRelatorio={deleteRelatorio}
        />
      )}
    </div>
  );
}

function ObrasTab({ convenioId, isAdmin, fetchObrasByConvenio, addObra, updateObra, deleteObra, fetchContratoByObra, addContrato, updateContrato, deleteContrato }) {
  const [obras, setObras] = useState([]);
  const [contratosMap, setContratosMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showObraForm, setShowObraForm] = useState(false);
  const [editingObra, setEditingObra] = useState(null);
  const [showContratoForm, setShowContratoForm] = useState(null);
  const [editingContrato, setEditingContrato] = useState(null);

  const loadData = useCallback(async () => {
    const obrasData = await fetchObrasByConvenio(convenioId);
    setObras(obrasData);
    const map = {};
    for (const obra of obrasData) {
      const contrato = await fetchContratoByObra(obra.id);
      if (contrato) map[obra.id] = contrato;
    }
    setContratosMap(map);
    setLoading(false);
  }, [convenioId, fetchObrasByConvenio, fetchContratoByObra]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveObra = async (data) => {
    if (editingObra) {
      await updateObra(editingObra.id, data);
    } else {
      await addObra({ ...data, convenioId });
    }
    setShowObraForm(false);
    setEditingObra(null);
    loadData();
  };

  const handleSaveContrato = async (obraId, data) => {
    if (editingContrato) {
      await updateContrato(editingContrato.id, data);
    } else {
      await addContrato({ ...data, obraId });
    }
    setShowContratoForm(null);
    setEditingContrato(null);
    loadData();
  };

  const handleDeleteObra = async (id) => {
    if (confirm('Excluir esta obra?')) {
      await deleteObra(id);
      loadData();
    }
  };

  const handleDeleteContrato = async (id) => {
    if (confirm('Excluir contrato?')) {
      await deleteContrato(id);
      loadData();
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary-500" /></div>;

  return (
    <div>
      {isAdmin && (
        <button
          onClick={() => { setEditingObra(null); setShowObraForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 mb-4"
        >
          <Plus size={16} /> Nova Obra
        </button>
      )}

      {obras.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-xl border border-slate-200">
          <HardHat size={36} className="mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500 text-sm">Nenhuma obra vinculada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {obras.map((obra) => {
            const contrato = contratosMap[obra.id];
            return (
              <div key={obra.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 text-sm">{obra.descricao}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(obra.status)}`}>
                        {obra.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                      <span>Execução: {obra.percentualExecucao || 0}%</span>
                      <span>Previsão: {formatDate(obra.previsaoConclusao)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                      <div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(obra.percentualExecucao || 0, 100)}%` }} />
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => { setEditingObra(obra); setShowObraForm(true); }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><Edit3 size={14} /></button>
                      <button onClick={() => handleDeleteObra(obra.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>

                {contrato ? (
                  <div className="mt-3 bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-700">Contrato: {contrato.numeroContrato}</p>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingContrato(contrato); setShowContratoForm(obra.id); }} className="p-1 rounded hover:bg-slate-200 text-slate-500"><Edit3 size={12} /></button>
                          <button onClick={() => handleDeleteContrato(contrato.id)} className="p-1 rounded hover:bg-red-100 text-red-400"><Trash2 size={12} /></button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                      <span>Construtora: {contrato.construtora}</span>
                      <span>Início: {formatDate(contrato.dataInicio)}</span>
                      <span>Expira: {formatDate(contrato.dataExpiracao)}</span>
                      <span className={`px-1.5 py-0.5 rounded-full font-medium ${statusColor(contrato.status)}`}>{contrato.status}</span>
                    </div>
                  </div>
                ) : (
                  isAdmin && (
                    <button onClick={() => { setEditingContrato(null); setShowContratoForm(obra.id); }} className="mt-3 text-xs text-primary-600 font-medium hover:underline">
                      + Adicionar Contrato
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {showObraForm && <ObraFormModal obra={editingObra} onSave={handleSaveObra} onClose={() => { setShowObraForm(false); setEditingObra(null); }} />}
      {showContratoForm && <ContratoFormModal contrato={editingContrato} onSave={(data) => handleSaveContrato(showContratoForm, data)} onClose={() => { setShowContratoForm(null); setEditingContrato(null); }} />}
    </div>
  );
}

function ObraFormModal({ obra, onSave, onClose }) {
  const [form, setForm] = useState({
    descricao: obra?.descricao || '',
    percentualExecucao: obra?.percentualExecucao || '',
    previsaoConclusao: obra?.previsaoConclusao || '',
    status: obra?.status || 'Não iniciado',
  });
  const set = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  return (
    <Modal title={obra ? 'Editar Obra' : 'Nova Obra'} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4">
        <FormField label="Descrição"><Textarea value={form.descricao} onChange={set('descricao')} required /></FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="% Execução"><Input type="number" min="0" max="100" value={form.percentualExecucao} onChange={set('percentualExecucao')} /></FormField>
          <FormField label="Previsão de Conclusão"><Input type="date" value={form.previsaoConclusao} onChange={set('previsaoConclusao')} /></FormField>
        </div>
        <FormField label="Status">
          <Select value={form.status} onChange={set('status')}>
            {['Não iniciado', 'Em andamento', 'Concluído', 'Paralisado', 'Cancelado'].map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancelar</button>
          <button type="submit" className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700">Salvar</button>
        </div>
      </form>
    </Modal>
  );
}

function ContratoFormModal({ contrato, onSave, onClose }) {
  const [form, setForm] = useState({
    numeroContrato: contrato?.numeroContrato || '',
    construtora: contrato?.construtora || '',
    dataInicio: contrato?.dataInicio || '',
    dataExpiracao: contrato?.dataExpiracao || '',
    status: contrato?.status || 'Em execução',
  });
  const set = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  return (
    <Modal title={contrato ? 'Editar Contrato' : 'Novo Contrato'} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4">
        <FormField label="Nº do Contrato"><Input value={form.numeroContrato} onChange={set('numeroContrato')} required placeholder="Ex: CT-001/2024" /></FormField>
        <FormField label="Construtora Responsável"><Input value={form.construtora} onChange={set('construtora')} required /></FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Data de Início"><Input type="date" value={form.dataInicio} onChange={set('dataInicio')} required /></FormField>
          <FormField label="Data de Expiração"><Input type="date" value={form.dataExpiracao} onChange={set('dataExpiracao')} required /></FormField>
        </div>
        <FormField label="Status">
          <Select value={form.status} onChange={set('status')}>
            {['Em execução', 'Concluído', 'Paralisado', 'Encerrado', 'Cancelado'].map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancelar</button>
          <button type="submit" className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700">Salvar</button>
        </div>
      </form>
    </Modal>
  );
}

function FinanceiroTab({ convenioId, convenio, isAdmin, fetchLancamentosByConvenio, addLancamento, deleteLancamento, getSaldoConvenio }) {
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tipo: 'despesa', valor: '', data: '', descricao: '' });
  const set = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  const loadData = useCallback(async () => {
    const data = await fetchLancamentosByConvenio(convenioId);
    setLancamentos(data);
    setLoading(false);
  }, [convenioId, fetchLancamentosByConvenio]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async (e) => {
    e.preventDefault();
    await addLancamento({ ...form, convenioId });
    setForm({ tipo: 'despesa', valor: '', data: '', descricao: '' });
    setShowForm(false);
    loadData();
  };

  const handleDelete = async (id) => {
    if (confirm('Excluir lançamento?')) {
      await deleteLancamento(id);
      loadData();
    }
  };

  const totalReceitas = lancamentos.filter((l) => l.tipo === 'receita').reduce((s, l) => s + (parseFloat(l.valor) || 0), 0);
  const totalDespesas = lancamentos.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + (parseFloat(l.valor) || 0), 0);
  const saldo = getSaldoConvenio(convenioId, lancamentos);

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary-500" /></div>;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <p className="text-xs text-green-600 font-medium">Total Receitas</p>
          <p className="text-lg font-bold text-green-700">{formatCurrency(totalReceitas)}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <p className="text-xs text-red-600 font-medium">Total Despesas</p>
          <p className="text-lg font-bold text-red-700">{formatCurrency(totalDespesas)}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <p className="text-xs text-blue-600 font-medium">Saldo Disponível</p>
          <p className="text-lg font-bold text-blue-700">{formatCurrency(saldo)}</p>
        </div>
      </div>

      {isAdmin && (
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 mb-4">
          <Plus size={16} /> Novo Lançamento
        </button>
      )}

      {lancamentos.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-xl border border-slate-200">
          <DollarSign size={36} className="mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500 text-sm">Nenhum lançamento registrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Data</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Descrição</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Valor</th>
                  {isAdmin && <th className="px-4 py-3 w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {lancamentos.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(l.data)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${l.tipo === 'receita' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {l.tipo === 'receita' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{l.descricao}</td>
                    <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${l.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                      {l.tipo === 'receita' ? '+' : '-'} {formatCurrency(l.valor)}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <button onClick={() => handleDelete(l.id)} className="p-1 rounded hover:bg-red-50 text-red-400"><Trash2 size={14} /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <Modal title="Novo Lançamento" onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <FormField label="Tipo">
              <Select value={form.tipo} onChange={set('tipo')}>
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
              </Select>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Valor (R$)"><Input type="number" step="0.01" min="0" value={form.valor} onChange={set('valor')} required /></FormField>
              <FormField label="Data"><Input type="date" value={form.data} onChange={set('data')} required /></FormField>
            </div>
            <FormField label="Descrição"><Textarea value={form.descricao} onChange={set('descricao')} required /></FormField>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancelar</button>
              <button type="submit" className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700">Salvar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function RelatoriosTab({ convenioId, isAdmin, fetchRelatoriosByConvenio, addRelatorio, deleteRelatorio }) {
  const [relatorios, setRelatorios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ data: '', numeroRelatorio: '', observacoes: '', nomeArquivo: '' });
  const set = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  const loadData = useCallback(async () => {
    const data = await fetchRelatoriosByConvenio(convenioId);
    setRelatorios(data);
    setLoading(false);
  }, [convenioId, fetchRelatoriosByConvenio]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async (e) => {
    e.preventDefault();
    await addRelatorio({ ...form, convenioId });
    setForm({ data: '', numeroRelatorio: '', observacoes: '', nomeArquivo: '' });
    setShowForm(false);
    loadData();
  };

  const handleDelete = async (id) => {
    if (confirm('Excluir relatório?')) {
      await deleteRelatorio(id);
      loadData();
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary-500" /></div>;

  return (
    <div>
      {isAdmin && (
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 mb-4">
          <Plus size={16} /> Novo Relatório
        </button>
      )}

      {relatorios.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-xl border border-slate-200">
          <FileText size={36} className="mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500 text-sm">Nenhum relatório anexado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {relatorios.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm text-slate-800">Relatório {r.numeroRelatorio}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Data: {formatDate(r.data)}</p>
                  {r.nomeArquivo && <p className="text-xs text-primary-600 mt-1">{r.nomeArquivo}</p>}
                  {r.observacoes && <p className="text-sm text-slate-600 mt-2">{r.observacoes}</p>}
                </div>
                {isAdmin && (
                  <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded hover:bg-red-50 text-red-400"><Trash2 size={14} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title="Novo Relatório" onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Nº do Relatório"><Input value={form.numeroRelatorio} onChange={set('numeroRelatorio')} required placeholder="Ex: REL-001" /></FormField>
              <FormField label="Data"><Input type="date" value={form.data} onChange={set('data')} required /></FormField>
            </div>
            <FormField label="Nome do Arquivo"><Input value={form.nomeArquivo} onChange={set('nomeArquivo')} placeholder="Ex: relatorio_jan_2024.pdf" /></FormField>
            <FormField label="Observações"><Textarea value={form.observacoes} onChange={set('observacoes')} /></FormField>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancelar</button>
              <button type="submit" className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700">Salvar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
