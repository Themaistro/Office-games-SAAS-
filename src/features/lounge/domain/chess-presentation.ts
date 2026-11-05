export const getMaterialAdvantage = (fenString: string) => {
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  const pieces = fenString.split(" ")[0];
  let w = 0;
  let b = 0;
  for (const char of pieces) {
    if (Object.keys(values).includes(char.toLowerCase())) {
      const val = values[char.toLowerCase() as keyof typeof values];
      if (char === char.toUpperCase()) w += val;
      else b += val;
    }
  }
  return { white: Math.max(0, w - b), black: Math.max(0, b - w) };
};
