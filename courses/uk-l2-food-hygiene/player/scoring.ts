export const scoreSingle = (picked: number, correct: number): number => (picked === correct ? 1 : 0);

export const scoreMulti = (picked: number[], correct: number[]): number => {
  const a = [...picked].sort().join(",");
  const b = [...correct].sort().join(",");
  return a === b ? 1 : 0;
};
