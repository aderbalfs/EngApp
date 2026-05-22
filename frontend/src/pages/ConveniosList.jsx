import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatDate, statusColor, isExpiringSoon, isExpired } from '../utils/helpers';
import { Plus, Search, AlertTriangle, Trash2, Edit3, Eye, Loader2 } from 'lucide-react';
import ConvenioForm from './ConvenioForm';

export default function ConveniosList() {
  const { isAdmin } = useAuth();
  const { convenios, addConvenio, updateConvenio, deleteConvenio, loading } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = convenios.filter((c) =>
    c.objeto?.toLowerCase().includes(search.toLowerCase()) ||
    c.numeroConvenio?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (data) => {
    if (editing) {
      await updateConvenio(editing.id, data);
    } else {
      await addConvenio(data);
    }
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = async (id) => {
    if (confirm('Excluir este convênio e todos os dados vinculados?')) {
      await deleteConvenio(id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Convênios</h1>
        {isAdmin && (
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            <Plus size={16} /> Novo Convênio
          </button>
        )}
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por objeto ou número..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-500">Nenhum convênio encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const expiring = isExpiringSoon(c.dataExpiracao);
            const expired = isExpired(c.dataExpiracao);
            return (
              <div
                key={c.id}
                className={`bg-white rounded-xl border p-4 ${
                  expired ? 'border-red-300 bg-red-50/50' :
                  expiring ? 'border-amber-300 bg-amber-50/50' :
                  'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 text-sm">{c.numeroConvenio}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(c.status)}`}>
                        {c.status}
                      </span>
                      {(expired || expiring) && !c.alertaFormalizado && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                          <AlertTriangle size={12} />
                          {expired ? 'Vencido' : 'Vence em breve'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{c.objeto}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                      <span>Orçamento: {formatCurrency(c.orcamentoTotal)}</span>
                      <span>Expira: {formatDate(c.dataExpiracao)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      to={`/convenios/${c.id}`}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                      title="Ver detalhes"
                    >
                      <Eye size={16} />
                    </Link>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => { setEditing(c); setShowForm(true); }}
                          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                          title="Editar"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <ConvenioForm
          convenio={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
