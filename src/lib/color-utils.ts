export function oklchToRgb(l: number, c: number, h: number): { r: number; g: number; b: number } {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)

  let lLab = l * 100
  let aLab = a * 100
  let bLab = b * 100

  let fy = (lLab + 16) / 116
  let fx = aLab / 500 + fy
  let fz = fy - bLab / 200

  const delta = 6 / 29
  const deltaSquared = delta * delta
  const deltaCubed = delta * delta * delta

  let xr = fx > delta ? Math.pow(fx, 3) : 3 * deltaSquared * (fx - 4 / 29)
  let yr = fy > delta ? Math.pow(fy, 3) : 3 * deltaSquared * (fy - 4 / 29)
  let zr = fz > delta ? Math.pow(fz, 3) : 3 * deltaSquared * (fz - 4 / 29)

  const Xn = 0.95047
  const Yn = 1.0
  const Zn = 1.08883

  let X = xr * Xn
  let Y = yr * Yn
  let Z = zr * Zn

  let r = X * 3.2406 + Y * -1.5372 + Z * -0.4986
  let g = X * -0.9689 + Y * 1.8758 + Z * 0.0415
  let b_ = X * 0.0557 + Y * -0.204 + Z * 1.057

  const gammaCorrect = (val: number) => {
    return val > 0.0031308 ? 1.055 * Math.pow(val, 1 / 2.4) - 0.055 : 12.92 * val
  }

  r = gammaCorrect(r)
  g = gammaCorrect(g)
  b_ = gammaCorrect(b_)

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

export const SAFE_COLORS = {
  background: '#fafafa',
  foreground: '#3f3f46',
  card: '#ffffff',
  border: '#e5e5e5',
  muted: '#f5f5f5',
  mutedForeground: '#737373',
  primary: '#16a34a',
  primaryForeground: '#ffffff',
  secondary: '#a8a8b2',
  destructive: '#dc2626',
  accent: '#fde047',
  accentForeground: '#3f3f46',
  tableBg: '#fafafa',
  tableAlt: '#ffffff',
  tableConflict: '#fee2e2',
  headerBg: '#f5f5f5',
  headerText: '#525252',
  text: '#1a1a1a',
}
