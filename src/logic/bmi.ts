export function bmi(weightKg?: number, heightCm?: number): string | null {
  if (!weightKg || !heightCm || !Number.isFinite(weightKg) || !Number.isFinite(heightCm) || weightKg <= 0 || heightCm <= 0) return null
  const value = weightKg / (heightCm / 100) ** 2
  return Number.isFinite(value) ? value.toFixed(1) : null
}
