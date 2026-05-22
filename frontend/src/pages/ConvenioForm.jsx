import { useState } from 'react';
import Modal from '../components/Modal';
import FormField, { Input, Select, Textarea } from '../components/FormField';

const STATUS_OPTIONS = ['Ativo', 'Em andamento', 'Paralisado', 'Concluído', 'Encerrado', 'Cancelado'];

export default function ConvenioForm({ convenio, onSave, onClose }) {
  const [form, setForm] = useState({
    objeto: convenio?.objeto || '',
    numeroConvenio: convenio?.numeroConvenio || '',
    dataConvenio: convenio?.dataConvenio || '',
    processoLicitatorio: convenio?.processoLicitatorio || '',
    orcamentoTotal: convenio?.orcamentoTotal || '',
    valorLiberadoCaixa: convenio?.valorLiberadoCaixa || '',
    valorLiberadoEstado: convenio?.valorLiberadoEstado || '',
    totalGasto: convenio?.totalGasto || '',
    dataExpiracao: convenio?.dataExpiracao || '',
    status: convenio?.status || 'Ativo',
  });

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Modal title={convenio ? 'Editar Convênio' : 'Novo Convênio'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Objeto">
          <Textarea value={form.objeto} onChange={set('objeto')} required placeholder="Descrição do objeto do convênio" />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Nº do Convênio">
            <Input value={form.numeroConvenio} onChange={set('numeroConvenio')} required placeholder="Ex: 001/2024" />
          </FormField>
          <FormField label="Data do Convênio">
            <Input type="date" value={form.dataConvenio} onChange={set('dataConvenio')} required />
          </FormField>
        </div>

        <FormField label="Nº do Processo Licitatório">
          <Input value={form.processoLicitatorio} onChange={set('processoLicitatorio')} placeholder="Ex: PL 001/2024" />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Orçamento Total (R$)">
            <Input type="number" step="0.01" min="0" value={form.orcamentoTotal} onChange={set('orcamentoTotal')} required />
          </FormField>
          <FormField label="Valor Liberado - Caixa (R$)">
            <Input type="number" step="0.01" min="0" value={form.valorLiberadoCaixa} onChange={set('valorLiberadoCaixa')} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Valor Liberado - Estado (R$)">
            <Input type="number" step="0.01" min="0" value={form.valorLiberadoEstado} onChange={set('valorLiberadoEstado')} />
          </FormField>
          <FormField label="Total Gasto (R$)">
            <Input type="number" step="0.01" min="0" value={form.totalGasto} onChange={set('totalGasto')} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Data de Expiração">
            <Input type="date" value={form.dataExpiracao} onChange={set('dataExpiracao')} required />
          </FormField>
          <FormField label="Status">
            <Select value={form.status} onChange={set('status')}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </FormField>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
            Cancelar
          </button>
          <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">
            {convenio ? 'Salvar' : 'Cadastrar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
