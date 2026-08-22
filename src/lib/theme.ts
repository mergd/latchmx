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
  '#E2B15A',
  '#5FBFB6',
  '#E39A72',
  '#C4A0D4',
  '#7DCA8C',
  '#7EB3E0',
] as const;

const groupInkById: Record<string, string> = {
  entrance: groupInks[0],
  lobby: groupInks[1],
  courtyard: groupInks[2],
  garage: groupInks[5],
  elevator: groupInks[4],
  floor6: groupInks[3],
  floor8: groupInks[2],
  rooftop: groupInks[5],
  bike: groupInks[4],
  amenities: groupInks[3],
  other: color.muted,
  hidden: groupInks[3],
};

export function groupInk(id: string, index = 0): string {
  return groupInkById[id] ?? groupInks[index % groupInks.length] ?? groupInks[0];
}

export function muteInk(hex: string): string {
  const ink = parseHex(hex);
  if (ink === null) {
    return color.muted;
  }
  const wash = { r: 242, g: 241, b: 236 };
  const amount = 0.6;
  return toHex(
    mix(ink.r, wash.r, amount),
    mix(ink.g, wash.g, amount),
    mix(ink.b, wash.b, amount),
  );
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

function mix(from: number, to: number, amount: number): number {
  return Math.round(from + (to - from) * amount);
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((part) => part.toString(16).padStart(2, '0')).join('')}`;
}
