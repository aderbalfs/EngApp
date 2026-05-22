import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, FileText, AlertTriangle, Upload, LogOut,
  Menu, X, Building2, ChevronRight
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/convenios', label: 'Convênios', icon: FileText },
  { to: '/alertas', label: 'Alertas', icon: AlertTriangle },
  { to: '/importar', label: 'Importar CSV', icon: Upload, adminOnly: true },
];

export default function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const filteredNav = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 rounded-md hover:bg-slate-100"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <Link to="/" className="flex items-center gap-2 no-underline">
              <Building2 size={24} className="text-primary-600" />
              <span className="font-bold text-lg text-slate-800">EngApp</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              isAdmin ? 'bg-primary-100 text-primary-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {isAdmin ? 'Administrador' : 'Visualizador'}
            </span>
            <button
              onClick={logout}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <nav className={`
          fixed lg:sticky top-14 left-0 h-[calc(100dvh-3.5rem)] w-64 bg-white border-r border-slate-200
          transform transition-transform duration-200 z-20
          ${menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-3 space-y-1">
            {filteredNav.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to ||
                (item.to !== '/' && location.pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-colors ${
                    active
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                  {active && <ChevronRight size={14} className="ml-auto" />}
                </Link>
              );
            })}
          </div>
        </nav>

        {menuOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-10 lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
        )}

        <main className="flex-1 min-w-0 p-4 lg:p-6">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
