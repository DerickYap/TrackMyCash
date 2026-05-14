const GRAMS_PER_TROY_OZ = 31.1035;

export function toTroyOz(weight: number, unit: 'troy_oz' | 'grams'): number {
  if (unit === 'troy_oz') return weight;
  return weight / GRAMS_PER_TROY_OZ;
}
