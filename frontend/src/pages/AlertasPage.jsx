import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { formatDate, daysUntil } from '../utils/helpers';
import { AlertTriangle, CheckCircle, Clock, FileText, Hammer, Loader2 } from 'lucide-react';

export default function AlertasPage() {
  const { isAdmin } = useAuth();
  const { convenios, patchConvenio, contratos, patchContrato, loading } = useData();

  const alertas = useMemo(() => {
    const items = [];

    convenios.forEach((c) => {
      if (c.status !== 'Ativo' && c.status !== 'Em andamento') return;
      const dias = daysUntil(c.dataExpiracao);
      if (dias <= 30) {
        items.push({
          id: c.id,
          tipo: 'convenio',
          titulo: `Convênio ${c.numeroConvenio}`,
          descricao: c.objeto,
          dataExpiracao: c.dataExpiracao,
          dias,
          formalizado: c.alertaFormalizado,
        });
      }
    });

    contratos.forEach((ct) => {
      if (ct.status === 'Encerrado' || ct.status === 'Cancelado') return;
      const dias = daysUntil(ct.dataExpiracao);
      if (dias <= 30) {
        items.push({
          id: ct.id,
          tipo: 'contrato',
          titulo: `Contrato ${ct.numeroContrato}`,
          descricao: `Construtora: ${ct.construtora}`,
          dataExpiracao: ct.dataExpiracao,
          dias,
          formalizado: ct.alertaFormalizado,
        });
      }
    });

    return items.sort((a, b) => a.dias - b.dias);
  }, [convenios, contratos]);

  const pendentes = alertas.filter((a) => !a.formalizado);
  const formalizados = alertas.filter((a) => a.formalizado);

  const handleFormalizar = async (alerta) => {
    if (alerta.tipo === 'convenio') {
      await patchConvenio(alerta.id, { alertaFormalizado: 1 });
    } else {
      await patchContrato(alerta.id, { alertaFormalizado: 1 });
    }
  };

  const handleDesformalizar = async (alerta) => {
    if (alerta.tipo === 'convenio') {
      await patchConvenio(alerta.id, { alertaFormalizado: 0 });
    } else {
      await patchContrato(alerta.id, { alertaFormalizado: 0 });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-primary-500" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Alertas de Vencimento</h1>

      {alertas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <CheckCircle size={48} className="mx-auto text-green-400 mb-3" />
          <p className="text-slate-600 font-medium">Nenhum alerta de vencimento</p>
          <p className="text-sm text-slate-400 mt-1">Todos os convênios e contratos estão dentro do prazo.</p>
        </div>
      ) : (
        <>
          {pendentes.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle size={14} />
                Pendentes ({pendentes.length})
              </h2>
              <div className="space-y-3">
                {pendentes.map((alerta) => (
                  <AlertaCard key={`${alerta.tipo}-${alerta.id}`} alerta={alerta} isAdmin={isAdmin} onFormalizar={() => handleFormalizar(alerta)} />
                ))}
              </div>
            </div>
          )}

          {formalizados.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-green-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckCircle size={14} />
                Formalizados ({formalizados.length})
              </h2>
              <div className="space-y-3">
                {formalizados.map((alerta) => (
                  <AlertaCard key={`${alerta.tipo}-${alerta.id}`} alerta={alerta} isAdmin={isAdmin} onDesformalizar={() => handleDesformalizar(alerta)} formalizado />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AlertaCard({ alerta, isAdmin, onFormalizar, onDesformalizar, formalizado }) {
  const Icon = alerta.tipo === 'convenio' ? FileText : Hammer;
  const expired = alerta.dias < 0;

  return (
    <div className={`bg-white rounded-xl border p-4 ${
      formalizado ? 'border-green-200 opacity-75' :
      expired ? 'border-red-300 bg-red-50/50' :
      'border-amber-300 bg-amber-50/50'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${
            formalizado ? 'bg-green-100 text-green-600' :
            expired ? 'bg-red-100 text-red-600' :
            'bg-amber-100 text-amber-600'
          }`}>
            <Icon size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-slate-800">{alerta.titulo}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                alerta.tipo === 'convenio' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
              }`}>
                {alerta.tipo === 'convenio' ? 'Convênio' : 'Contrato'}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{alerta.descricao}</p>
            <div className="flex items-center gap-1 mt-1 text-xs">
              <Clock size={12} className="text-slate-400" />
              <span className={expired ? 'text-red-600 font-medium' : 'text-amber-600 font-medium'}>
                {expired ? `Vencido há ${Math.abs(alerta.dias)} dia(s)` : alerta.dias === 0 ? 'Vence hoje' : `Vence em ${alerta.dias} dia(s)`}
              </span>
              <span className="text-slate-400 ml-2">({formatDate(alerta.dataExpiracao)})</span>
            </div>
          </div>
        </div>

        {isAdmin && (
          formalizado ? (
            <button onClick={onDesformalizar} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
              Desfazer
            </button>
          ) : (
            <button onClick={onFormalizar} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
              <CheckCircle size={14} />
              Formalizar
            </button>
          )
        )}
      </div>
    </div>
  );
}
