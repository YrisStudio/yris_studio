// Pastille de couleur pour les noms saisis dans le gestionnaire (« Noir », « Vert sapin »…).
const swatches: [RegExp, string][] = [
  [/noir/i, "#161616"],
  [/blanc/i, "#f5f5f2"],
  [/gris/i, "#8a8a86"],
  [/argent/i, "#c0c0c0"],
  [/rouge/i, "#d62828"],
  [/orange/i, "#f77f00"],
  [/jaune/i, "#f4c430"],
  [/vert/i, "#22a04b"],
  [/bleu/i, "#2563eb"],
  [/violet|mauve/i, "#7c3aed"],
  [/rose/i, "#ec4899"],
  [/marron|bois|beige/i, "#8b5a2b"],
  [/or\b|doré/i, "#d4af37"],
  [/transparent/i, "transparent"],
];

export const swatch = (name: string) => swatches.find(([re]) => re.test(name))?.[1] ?? "#bdbdb8";
