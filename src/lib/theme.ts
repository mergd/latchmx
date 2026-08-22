export const color = {
  canvas: '#0E0E0D',
  surface: '#181817',
  well: '#0A0A09',
  text: '#F2F1EC',
  muted: '#9A9892',
  accent: '#E4E1D8',
  onAccent: '#0E0E0D',
  ok: '#C9C6BE',
  bad: '#D0827A',
  line: 'rgba(242, 241, 236, 0.08)',
  knob: '#E4E1D8',
  fill: 'rgba(242, 241, 236, 0.06)',
  fillOk: 'rgba(242, 241, 236, 0.12)',
  overlay: 'rgba(14, 14, 13, 0.78)',
  overlaySoft: 'rgba(14, 14, 13, 0.4)',
} as const;

export const type = {
  title: 'Fraunces_600SemiBold',
  body: 'Outfit_400Regular',
} as const;

export const groupInks = [
  '#F0C14A',
  '#3ECFC4',
  '#FF8A5B',
  '#C084FC',
  '#5EE09A',
  '#62C5F8',
  '#FB7185',
  '#E8D36A',
] as const;

export function groupInk(index: number): string {
  return groupInks[index % groupInks.length] ?? groupInks[0];
}

export function doorInk(groupIndex: number, doorIndex: number): string {
  const base = hexToHsl(groupInk(groupIndex));
  if (base === null) {
    return color.muted;
  }
  const hue = (base.h + doorIndex * 52 + 360) % 360;
  return hslToHex(hue, Math.max(base.s - 22, 32), 86);
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = parseHex(hex);
  if (rgb === null) {
    return null;
  }
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) {
    return { h: 0, s: 0, l: lightness * 100 };
  }
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }
  return {
    h: (hue * 60 + 360) % 360,
    s: saturation * 100,
    l: lightness * 100,
  };
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - chroma / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = chroma;
    g = x;
  } else if (h < 120) {
    r = x;
    g = chroma;
  } else if (h < 180) {
    g = chroma;
    b = x;
  } else if (h < 240) {
    g = x;
    b = chroma;
  } else if (h < 300) {
    r = x;
    b = chroma;
  } else {
    r = chroma;
    b = x;
  }
  return toHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const value = hex.startsWith('#') ? hex.slice(1) : hex;
  if (value.length !== 6) {
    return null;
  }
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  if ([r, g, b].some((part) => Number.isNaN(part))) {
    return null;
  }
  return { r, g, b };
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((part) => Math.round(part).toString(16).padStart(2, '0'))
    .join('')}`;
}
