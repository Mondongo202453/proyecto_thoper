type ServiceTariff = {
  unidad: string;
  precio_unitario: number | string;
};

export const calculateServicePrice = (
  tariff: ServiceTariff,
  quantity: number,
  eventDuration: number,
) => Number(tariff.precio_unitario) * quantity * (tariff.unidad === 'hora' ? eventDuration : 1);

export const serviceTariffUnitLabel = (unit: string) => {
  if (unit === 'hora') return 'por hora';
  if (unit === 'unidad') return 'por unidad';
  if (unit === 'show') return 'por show';
  return `por ${unit}`;
};
