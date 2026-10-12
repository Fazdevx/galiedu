const HEX = /^#[0-9a-fA-F]{6}$/;

type Rgb = { r: number; g: number; b: number };

export const FALLBACK_COLOR = "#0f766e";

function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const to = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function mix(hex: string, target: string, ratio: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  return rgbToHex({
    r: a.r + (b.r - a.r) * ratio,
    g: a.g + (b.g - a.g) * ratio,
    b: a.b + (b.b - a.b) * ratio,
  });
}

export type ColorTokens = {
  css: string;
  primary: string;
  strong: string;
  soft: string;
  softStrong: string;
};

export function colorTokens(input?: string | null): ColorTokens {
  const primary = HEX.test(input ?? "") ? ((input as string).toLowerCase() as string) : FALLBACK_COLOR;
  const strong = mix(primary, "#000000", 0.18);
  const soft = mix(primary, "#ffffff", 0.9);
  const softStrong = mix(primary, "#ffffff", 0.78);
  const { r, g, b } = hexToRgb(primary);

  const css = `:root{--primary:${primary};--primary-strong:${strong};--primary-soft:${soft};--primary-soft-strong:${softStrong};--ring:rgba(${r},${g},${b},0.35)}`;

  return { css, primary, strong, soft, softStrong };
}