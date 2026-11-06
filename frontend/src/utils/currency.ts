const formatCOPNumber = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 0,
});

export const formatCOP = (value: number | string) =>
  formatCOPNumber.format(Number(value));

export const parseCOPInput = (value: string): number | null => {
  const input = value.trim().replace(/\s/g, '');
  if (!input) return null;

  let normalized: string;
  if (input.includes(',')) {
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})*),\d{1,2}$/.test(input)) return null;
    normalized = input.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(input)) {
    normalized = input.replace(/\./g, '');
  } else if (/^\d+(?:\.\d{1,2})?$/.test(input)) {
    normalized = input;
  } else {
    return null;
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
};
