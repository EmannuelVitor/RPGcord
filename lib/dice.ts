import type { DiceValidationMode } from "@/lib/types";

export const VALIDATION_LABELS: Record<DiceValidationMode, string> = {
  sum: "soma de todos",
  highest: "apenas o maior",
  lowest: "apenas o menor",
};

/**
 * Sorteia um valor de 1 a `sides` com o gerador criptografico do navegador.
 *
 * Math.random nao e uniforme nem auditavel; numa mesa de RPG o resultado do
 * dado e o unico numero em que todo mundo precisa confiar. A rejeicao descarta
 * a faixa final do intervalo para eliminar o vies do resto da divisao.
 */
export function rollOne(sides: number): number {
  const faces = Math.max(2, Math.floor(sides));
  const limit = Math.floor(0x1_0000_0000 / faces) * faces;
  const buffer = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);
  return (value % faces) + 1;
}

export function resolveRoll(results: number[], mode: DiceValidationMode) {
  if (mode === "highest") return Math.max(...results);
  if (mode === "lowest") return Math.min(...results);
  return results.reduce((total, result) => total + result, 0);
}
