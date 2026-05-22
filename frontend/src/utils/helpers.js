export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR');
}

export function daysUntil(dateStr) {
  if (!dateStr) return Infinity;
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

export function isExpiringSoon(dateStr, days = 30) {
  const d = daysUntil(dateStr);
  return d >= 0 && d <= days;
}

export function isExpired(dateStr) {
  return daysUntil(dateStr) < 0;
}

export function statusColor(status) {
  const colors = {
    'Em andamento': 'bg-blue-100 text-blue-800',
    'Concluído': 'bg-green-100 text-green-800',
    'Paralisado': 'bg-red-100 text-red-800',
    'Cancelado': 'bg-gray-100 text-gray-800',
    'Ativo': 'bg-green-100 text-green-800',
    'Encerrado': 'bg-gray-100 text-gray-800',
    'Vencido': 'bg-red-100 text-red-800',
    'Em execução': 'bg-blue-100 text-blue-800',
    'Não iniciado': 'bg-yellow-100 text-yellow-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function parseCSVValue(val) {
  if (!val || val.trim() === '') return '';
  const cleaned = val.trim().replace(/^["']|["']$/g, '');
  return cleaned;
}

export function parseCSVNumber(val) {
  if (!val) return 0;
  const cleaned = val.toString().trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
