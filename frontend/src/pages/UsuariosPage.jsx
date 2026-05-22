import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchUsuarios, createUsuario, updateUsuario, deleteUsuario } from '../utils/api';
import Modal from '../components/Modal';
import {
  Users, Plus, Pencil, Trash2, Shield, Eye,
  Loader2, UserCheck, UserX, Search
} from 'lucide-react';

function UserForm({ user, onSave, onCancel, loading }) {
  const [form, setForm] = useState({
    nome: user?.nome || '',
    email: user?.email || '',
    senha: '',
    role: user?.role || 'viewer',
    ativo: user?.ativo ?? true,
  });

  const isEdit = !!user;

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const data = { ...form };
    if (isEdit && !data.senha) delete data.senha;
    onSave(data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
        <input
          name="nome"
          value={form.nome}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          placeholder="Nome completo"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          placeholder="usuario@email.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {isEdit ? 'Nova senha (deixe em branco para manter)' : 'Senha'}
        </label>
        <input
          name="senha"
          type="password"
          value={form.senha}
          onChange={handleChange}
          required={!isEdit}
          minLength={6}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          placeholder={isEdit ? 'Manter senha atual' : 'Minimo 6 caracteres'}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Perfil de acesso</label>
        <select
          name="role"
          value={form.role}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        >
          <option value="admin">Administrador - Acesso total</option>
          <option value="viewer">Visualizador - Somente leitura</option>
        </select>
      </div>

      {isEdit && (
        <div className="flex items-center gap-2">
          <input
            name="ativo"
            type="checkbox"
            checked={form.ativo}
            onChange={handleChange}
            id="ativo-check"
            className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="ativo-check" className="text-sm text-slate-700">
            Usuario ativo (pode fazer login)
          </label>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg font-medium transition-colors"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Salvando...
            </>
          ) : (
            isEdit ? 'Salvar alteracoes' : 'Criar usuario'
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function UsuariosPage() {
  const { user: currentUser } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modalMode, setModalMode] = useState(null); // null | 'create' | 'edit'
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const loadUsuarios = useCallback(async () => {
    try {
      const data = await fetchUsuarios();
      setUsuarios(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsuarios();
  }, [loadUsuarios]);

  async function handleCreate(data) {
    setSaving(true);
    setError('');
    try {
      await createUsuario(data);
      await loadUsuarios();
      setModalMode(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(data) {
    setSaving(true);
    setError('');
    try {
      await updateUsuario(editingUser.id, data);
      await loadUsuarios();
      setModalMode(null);
      setEditingUser(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setError('');
    try {
      await deleteUsuario(id);
      await loadUsuarios();
      setDeleteConfirm(null);
    } catch (err) {
      setError(err.message);
    }
  }

  const filtered = usuarios.filter((u) =>
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users size={28} />
            Gerenciar Usuarios
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} cadastrado{usuarios.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setModalMode('create'); setEditingUser(null); setError(''); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
          Novo usuario
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou email..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        />
      </div>

      {/* Table - Desktop */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuario</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Perfil</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Criado em</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-4">
                  <div className="font-medium text-slate-800">{u.nome}</div>
                  <div className="text-sm text-slate-500">{u.email}</div>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                    u.role === 'admin'
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {u.role === 'admin' ? <Shield size={12} /> : <Eye size={12} />}
                    {u.role === 'admin' ? 'Admin' : 'Viewer'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                    u.ativo
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {u.ativo ? <UserCheck size={12} /> : <UserX size={12} />}
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-slate-500">
                  {u.criado_em ? new Date(u.criado_em).toLocaleDateString('pt-BR') : '-'}
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => { setEditingUser(u); setModalMode('edit'); setError(''); }}
                      className="p-2 rounded-md hover:bg-slate-100 text-slate-500 hover:text-primary-600 transition-colors"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    {u.id !== currentUser.id && (
                      <button
                        onClick={() => setDeleteConfirm(u)}
                        className="p-2 rounded-md hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            Nenhum usuario encontrado.
          </div>
        )}
      </div>

      {/* Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {filtered.map((u) => (
          <div key={u.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-slate-800">{u.nome}</div>
                <div className="text-sm text-slate-500 mt-0.5">{u.email}</div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => { setEditingUser(u); setModalMode('edit'); setError(''); }}
                  className="p-2 rounded-md hover:bg-slate-100 text-slate-500"
                >
                  <Pencil size={16} />
                </button>
                {u.id !== currentUser.id && (
                  <button
                    onClick={() => setDeleteConfirm(u)}
                    className="p-2 rounded-md hover:bg-red-50 text-slate-500"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                u.role === 'admin' ? 'bg-primary-100 text-primary-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {u.role === 'admin' ? <Shield size={11} /> : <Eye size={11} />}
                {u.role === 'admin' ? 'Admin' : 'Viewer'}
              </span>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {u.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            Nenhum usuario encontrado.
          </div>
        )}
      </div>

      {/* Modal Create/Edit */}
      {modalMode && (
        <Modal
          title={modalMode === 'create' ? 'Novo usuario' : `Editar: ${editingUser?.nome}`}
          onClose={() => { setModalMode(null); setEditingUser(null); }}
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          <UserForm
            user={modalMode === 'edit' ? editingUser : null}
            onSave={modalMode === 'create' ? handleCreate : handleUpdate}
            onCancel={() => { setModalMode(null); setEditingUser(null); }}
            loading={saving}
          />
        </Modal>
      )}

      {/* Modal Delete Confirm */}
      {deleteConfirm && (
        <Modal
          title="Confirmar exclusao"
          onClose={() => setDeleteConfirm(null)}
        >
          <div className="space-y-4">
            <p className="text-slate-600">
              Tem certeza que deseja excluir o usuario <strong>{deleteConfirm.nome}</strong> ({deleteConfirm.email})?
            </p>
            <p className="text-sm text-red-600">
              Esta acao nao pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Sim, excluir
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
