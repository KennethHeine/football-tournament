export function oklchToRgb(l: number, c: number, h: number): { r: number; g: number; b: number } {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)

  const lLab = l * 100
  const aLab = a * 100
  const bLab = b * 100

  const fy = (lLab + 16) / 116
  const fx = aLab / 500 + fy
  const fz = fy - bLab / 200

  const delta = 6 / 29
  const deltaSquared = delta * delta

  const xr = fx > delta ? Math.pow(fx, 3) : 3 * deltaSquared * (fx - 4 / 29)
  const yr = fy > delta ? Math.pow(fy, 3) : 3 * deltaSquared * (fy - 4 / 29)
  const zr = fz > delta ? Math.pow(fz, 3) : 3 * deltaSquared * (fz - 4 / 29)

  const Xn = 0.95047
  const Yn = 1.0
  const Zn = 1.08883

  const X = xr * Xn
  const Y = yr * Yn
  const Z = zr * Zn

  const rLinear = X * 3.2406 + Y * -1.5372 + Z * -0.4986
  const gLinear = X * -0.9689 + Y * 1.8758 + Z * 0.0415
  const bLinear = X * 0.0557 + Y * -0.204 + Z * 1.057

  const gammaCorrect = (val: number) => {
    return val > 0.0031308 ? 1.055 * Math.pow(val, 1 / 2.4) - 0.055 : 12.92 * val
  }

  const r = gammaCorrect(rLinear)
  const g = gammaCorrect(gLinear)
  const b_ = gammaCorrect(bLinear)

  return {
    r: Math.max(0, Math.min(255, Math.round(r * 255))),
    g: Math.max(0, Math.min(255, Math.round(g * 255))),
    b: Math.max(0, Math.min(255, Math.round(b_ * 255)))
  }
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

export function oklchStringToHex(oklchString: string): string {
  const match = oklchString.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/)
  if (!match) {
    return '#000000'
  }

  const l = parseFloat(match[1])
  const c = parseFloat(match[2])
  const h = parseFloat(match[3])

  const rgb = oklchToRgb(l, c, h)
  return rgbToHex(rgb.r, rgb.g, rgb.b)
}

function convertOklch(l: number, c: number, h: number): string {
  const rgb = oklchToRgb(l, c, h)
  return rgbToHex(rgb.r, rgb.g, rgb.b)
}

export const SAFE_COLORS = {
  background: convertOklch(0.98, 0, 0),
  foreground: convertOklch(0.25, 0.05, 250),
  card: convertOklch(1, 0, 0),
  cardForeground: convertOklch(0.25, 0.05, 250),
  border: convertOklch(0.90, 0, 0),
  muted: convertOklch(0.96, 0, 0),
  mutedForeground: convertOklch(0.45, 0.02, 240),
  primary: convertOklch(0.55, 0.15, 145),
  primaryForeground: convertOklch(1, 0, 0),
  secondary: convertOklch(0.65, 0.02, 240),
  destructive: convertOklch(0.55, 0.22, 25),
  destructiveForeground: convertOklch(1, 0, 0),
  accent: convertOklch(0.85, 0.18, 95),
  accentForeground: convertOklch(0.25, 0.05, 250),
  tableBg: convertOklch(0.98, 0, 0),
  tableAlt: convertOklch(1, 0, 0),
  tableConflict: convertOklch(0.95, 0.05, 25),
  headerBg: convertOklch(0.96, 0, 0),
  headerText: convertOklch(0.45, 0.02, 240),
  text: convertOklch(0.25, 0.05, 250),
}
