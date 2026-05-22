import { useState, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { parseCSVValue, parseCSVNumber } from '../utils/helpers';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Download } from 'lucide-react';

const COLUMN_MAP = {
  'objeto': 'objeto',
  'numero_convenio': 'numeroConvenio',
  'numero do convenio': 'numeroConvenio',
  'data_convenio': 'dataConvenio',
  'data do convenio': 'dataConvenio',
  'processo_licitatorio': 'processoLicitatorio',
  'processo licitatorio': 'processoLicitatorio',
  'orcamento_total': 'orcamentoTotal',
  'orcamento total': 'orcamentoTotal',
  'valor_liberado_caixa': 'valorLiberadoCaixa',
  'valor liberado caixa': 'valorLiberadoCaixa',
  'valor_liberado_estado': 'valorLiberadoEstado',
  'valor liberado estado': 'valorLiberadoEstado',
  'total_gasto': 'totalGasto',
  'total gasto': 'totalGasto',
  'data_expiracao': 'dataExpiracao',
  'data de expiracao': 'dataExpiracao',
  'data expiracao': 'dataExpiracao',
  'status': 'status',
};

const MONEY_FIELDS = ['orcamentoTotal', 'valorLiberadoCaixa', 'valorLiberadoEstado', 'totalGasto'];

export default function ImportPage() {
  const { importConvenios } = useData();
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setResult(null);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`Erro ao ler CSV: ${results.errors[0].message}`);
          return;
        }

        const mapped = results.data.map((row) => {
          const item = {};
          Object.entries(row).forEach(([key, val]) => {
            const normalized = key.trim().toLowerCase()
              .normalize('NFD').replace(/[̀-ͯ]/g, '');
            const field = COLUMN_MAP[normalized];
            if (field) {
              if (MONEY_FIELDS.includes(field)) {
                item[field] = parseCSVNumber(val);
              } else {
                item[field] = parseCSVValue(val);
              }
            }
          });
          if (!item.status) item.status = 'Ativo';
          return item;
        }).filter((item) => item.objeto || item.numeroConvenio);

        if (mapped.length === 0) {
          setError('Nenhum convênio válido encontrado. Verifique as colunas do CSV.');
          return;
        }

        setPreview(mapped);
      },
      error: (err) => {
        setError(`Erro ao processar arquivo: ${err.message}`);
      },
    });
  };

  const handleImport = async () => {
    if (!preview) return;
    try {
      const count = await importConvenios(preview);
      setResult(count);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setError(`Erro ao importar: ${err.message}`);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'objeto', 'numero_convenio', 'data_convenio', 'processo_licitatorio',
      'orcamento_total', 'valor_liberado_caixa', 'valor_liberado_estado',
      'total_gasto', 'data_expiracao', 'status'
    ];
    const example = [
      'Construção de praça municipal', '001/2024', '2024-01-15', 'PL 001/2024',
      '500000.00', '300000.00', '100000.00', '150000.00', '2025-12-31', 'Ativo'
    ];
    const csv = headers.join(',') + '\n' + example.join(',');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_convenios.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Importar Convênios</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start gap-3 mb-6">
          <FileSpreadsheet size={24} className="text-primary-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-slate-800">Importação via CSV</h2>
            <p className="text-sm text-slate-500 mt-1">
              Faça upload de um arquivo CSV com os convênios. As colunas devem corresponder
              aos campos do cadastro.
            </p>
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1 mt-2 text-sm text-primary-600 hover:underline font-medium"
            >
              <Download size={14} /> Baixar modelo CSV
            </button>
          </div>
        </div>

        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-primary-400 transition-colors">
          <Upload size={32} className="mx-auto text-slate-400 mb-3" />
          <p className="text-sm text-slate-600 mb-3">Arraste um arquivo CSV ou clique para selecionar</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="block mx-auto text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100"
          />
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-lg p-3">
            <CheckCircle size={16} />
            <p className="text-sm font-medium">{result} convênio(s) importado(s) com sucesso!</p>
          </div>
        )}

        {preview && (
          <div className="mt-6">
            <h3 className="font-semibold text-slate-800 mb-3">Pré-visualização ({preview.length} itens)</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-64">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-3 py-2 font-medium text-slate-600">Nº Convênio</th>
                    <th className="text-left px-3 py-2 font-medium text-slate-600">Objeto</th>
                    <th className="text-left px-3 py-2 font-medium text-slate-600">Status</th>
                    <th className="text-right px-3 py-2 font-medium text-slate-600">Orçamento</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 10).map((item, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="px-3 py-2 text-slate-700">{item.numeroConvenio || '—'}</td>
                      <td className="px-3 py-2 text-slate-700 max-w-xs truncate">{item.objeto || '—'}</td>
                      <td className="px-3 py-2 text-slate-700">{item.status || '—'}</td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {item.orcamentoTotal ? `R$ ${Number(item.orcamentoTotal).toLocaleString('pt-BR')}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 10 && (
                <p className="text-xs text-slate-500 text-center py-2">
                  ...e mais {preview.length - 10} itens
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleImport}
                className="px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
              >
                Importar {preview.length} convênio(s)
              </button>
              <button
                onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 bg-slate-50 rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Colunas aceitas no CSV</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600">
          {[
            'objeto', 'numero_convenio', 'data_convenio (AAAA-MM-DD)',
            'processo_licitatorio', 'orcamento_total', 'valor_liberado_caixa',
            'valor_liberado_estado', 'total_gasto', 'data_expiracao (AAAA-MM-DD)', 'status'
          ].map((col) => (
            <div key={col} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary-400 rounded-full shrink-0" />
              <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{col}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
