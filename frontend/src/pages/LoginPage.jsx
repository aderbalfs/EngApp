import { useAuth } from '../contexts/AuthContext';
import { Building2, Shield, Eye } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-4">
            <Building2 size={32} className="text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">EngApp</h1>
          <p className="text-slate-500 text-sm mt-1">Gestão de Convênios e Obras</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => login('admin')}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors"
          >
            <Shield size={20} />
            <div className="text-left">
              <div className="text-sm font-semibold">Administrador</div>
              <div className="text-xs text-primary-200">Equipe de Engenharia</div>
            </div>
          </button>

          <button
            onClick={() => login('viewer')}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
          >
            <Eye size={20} />
            <div className="text-left">
              <div className="text-sm font-semibold">Visualizador</div>
              <div className="text-xs text-slate-500">Prefeito / Gestão</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
