import { useState, useEffect, useCallback } from 'react';
import { fetchAuditLogs, fetchAuditStats } from '../utils/api';
import {
  Activity, Monitor, Smartphone, Shield, AlertTriangle,
  CheckCircle, XCircle, Loader2, Search, ChevronLeft, ChevronRight
} from 'lucide-react';

const DEVICE_ICONS = {
  Mobile: Smartphone,
  Windows: Monitor,
  Mac: Monitor,
  Linux: Monitor,
  Outro: Monitor,
  Desconhecido: Monitor,
};

export default function AuditoriaPage() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filtroAcao, setFiltroAcao] = useState('');
  const PER_PAGE = 30;

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchAuditStats();
      setStats(data);
    } catch {}
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: PER_PAGE, offset: page * PER_PAGE };
      if (filtroAcao) params.acao = filtroAcao;
      const data = await fetchAuditLogs(params);
      setLogs(data.logs);
      setTotal(data.total);
    } catch {} finally {
      setLoading(false);
    }
  }, [page, filtroAcao]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadLogs(); }, [loadLogs]);

  const totalPages = Math.ceil(total / PER_PAGE);

  function formatDate(dt) {
    if (!dt) return '-';
    const d = new Date(dt);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function acaoLabel(acao) {
    if (acao === 'login_sucesso') return { text: 'Login', color: 'bg-green-100 text-green-700', icon: CheckCircle };
    if (acao === 'login_falha') return { text: 'Login falhou', color: 'bg-red-100 text-red-700', icon: XCircle };
    return { text: acao, color: 'bg-slate-100 text-slate-700', icon: Activity };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Shield size={28} />
          Painel de Auditoria
        </h1>
        <p className="text-slate-500 text-sm mt-1">Monitoramento de acessos e acoes no sistema</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium">Logins hoje</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.acoesHoje}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium">Total logins</p>
            <p className="text-2xl font-bold text-primary-600 mt-1">{stats.totalLogins}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium">Tentativas falhas</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.totalFalhas}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium">Total registros</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">{total}</p>
          </div>
        </div>
      )}

      {/* Sessoes ativas recentes */}
      {stats?.sessoes?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Ultimos acessos por usuario</h2>
          <div className="space-y-2">
            {stats.sessoes.map((s, i) => {
              const DevIcon = DEVICE_ICONS[s.dispositivo] || Monitor;
              return (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <DevIcon size={16} className="text-slate-400" />
                    <div>
                      <span className="text-sm font-medium text-slate-800">{s.user_nome || s.user_email}</span>
                      <span className="text-xs text-slate-400 ml-2">{s.user_email}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">{s.dispositivo}</span>
                    <p className="text-xs text-slate-400">{formatDate(s.ultimo_acesso)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtro */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filtroAcao}
            onChange={(e) => { setFiltroAcao(e.target.value); setPage(0); }}
            placeholder="Filtrar por acao (ex: login, DELETE, POST)..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-primary-600" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Activity size={36} className="mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500 text-sm">Nenhum registro encontrado.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Data/Hora</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Usuario</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Acao</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Dispositivo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">IP</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => {
                    const { text, color, icon: Icon } = acaoLabel(log.acao);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{formatDate(log.criado_em)}</td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-medium text-slate-800">{log.user_nome || '-'}</div>
                          <div className="text-xs text-slate-400">{log.user_email || '-'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
                            <Icon size={11} />
                            {text}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{log.dispositivo}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono">{log.ip || '-'}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">{log.detalhes || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {logs.map((log) => {
              const { text, color, icon: Icon } = acaoLabel(log.acao);
              return (
                <div key={log.id} className="bg-white rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
                      <Icon size={11} />
                      {text}
                    </span>
                    <span className="text-xs text-slate-400">{formatDate(log.criado_em)}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800">{log.user_nome || log.user_email || '-'}</p>
                  <div className="flex gap-3 mt-1 text-xs text-slate-500">
                    <span>{log.dispositivo}</span>
                    <span className="font-mono">{log.ip}</span>
                  </div>
                  {log.detalhes && <p className="text-xs text-slate-400 mt-1">{log.detalhes}</p>}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">Pagina {page + 1} de {totalPages} ({total} registros)</p>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
