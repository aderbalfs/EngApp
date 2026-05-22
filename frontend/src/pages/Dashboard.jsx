import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { formatCurrency, isExpiringSoon, isExpired } from '../utils/helpers';
import { FileText, DollarSign, HardHat, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { convenios, contratos, loading } = useData();

  const stats = useMemo(() => {
    const ativos = convenios.filter((c) => c.status === 'Ativo');
    const valorTotal = convenios.reduce((sum, c) => sum + (parseFloat(c.orcamentoTotal) || 0), 0);

    const alertasConvenios = convenios.filter(
      (c) => c.status === 'Ativo' && !c.alertaFormalizado && (isExpiringSoon(c.dataExpiracao) || isExpired(c.dataExpiracao))
    );
    const alertasContratos = contratos.filter(
      (c) => c.status !== 'Encerrado' && !c.alertaFormalizado && (isExpiringSoon(c.dataExpiracao) || isExpired(c.dataExpiracao))
    );
    const totalAlertas = alertasConvenios.length + alertasContratos.length;

    return { ativos: ativos.length, valorTotal, totalAlertas };
  }, [convenios, contratos]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-primary-500" />
      </div>
    );
  }

  const cards = [
    { label: 'Convênios Ativos', value: stats.ativos, icon: FileText, color: 'bg-blue-500', link: '/convenios' },
    { label: 'Valor Gerenciado', value: formatCurrency(stats.valorTotal), icon: DollarSign, color: 'bg-emerald-500', link: '/convenios' },
    { label: 'Alertas Pendentes', value: stats.totalAlertas, icon: AlertTriangle, color: 'bg-red-500', link: '/alertas' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              to={card.link}
              className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow no-underline group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium">{card.label}</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
                </div>
                <div className={`${card.color} p-2.5 rounded-lg text-white`}>
                  <Icon size={20} />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 text-xs text-primary-600 font-medium group-hover:underline">
                Ver detalhes <ArrowRight size={12} />
              </div>
            </Link>
          );
        })}
      </div>

      {stats.totalAlertas > 0 && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-700 font-semibold mb-1">
            <AlertTriangle size={18} />
            Atenção
          </div>
          <p className="text-sm text-red-600">
            Existem {stats.totalAlertas} alerta(s) de vencimento pendente(s).{' '}
            <Link to="/alertas" className="underline font-medium">Ver alertas</Link>
          </p>
        </div>
      )}

      {convenios.length === 0 && (
        <div className="mt-8 text-center py-12 bg-white rounded-xl border border-slate-200">
          <FileText size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Nenhum convênio cadastrado</p>
          <p className="text-sm text-slate-400 mt-1">Comece cadastrando ou importando convênios.</p>
          <div className="flex gap-3 justify-center mt-4">
            <Link to="/convenios" className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium no-underline hover:bg-primary-700">
              Cadastrar
            </Link>
            <Link to="/importar" className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium no-underline hover:bg-slate-200">
              Importar CSV
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
