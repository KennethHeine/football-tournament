import { describe, it, expect } from 'vitest'
import { oklchToRgb, rgbToHex, oklchStringToHex, SAFE_COLORS } from '../lib/color-utils'

describe('Color Utilities', () => {
  describe('oklchToRgb', () => {
    it('should convert white (high lightness, no chroma)', () => {
      const result = oklchToRgb(1, 0, 0)
      expect(result.r).toBeCloseTo(255, 0)
      expect(result.g).toBeCloseTo(255, 0)
      expect(result.b).toBeCloseTo(255, 0)
    })

    it('should convert black (low lightness, no chroma)', () => {
      const result = oklchToRgb(0, 0, 0)
      expect(result.r).toBe(0)
      expect(result.g).toBe(0)
      expect(result.b).toBe(0)
    })

    it('should convert primary green color', () => {
      // Pitch Green: oklch(0.55 0.15 145)
      const result = oklchToRgb(0.55, 0.15, 145)
      expect(result.r).toBeGreaterThan(0)
      expect(result.g).toBeGreaterThan(0)
      expect(result.b).toBeGreaterThan(0)
      expect(result.r).toBeLessThanOrEqual(255)
      expect(result.g).toBeLessThanOrEqual(255)
      expect(result.b).toBeLessThanOrEqual(255)
    })

    it('should clamp RGB values to valid range', () => {
      // Test with extreme values
      const result = oklchToRgb(0.5, 0.5, 180)
      expect(result.r).toBeGreaterThanOrEqual(0)
      expect(result.r).toBeLessThanOrEqual(255)
      expect(result.g).toBeGreaterThanOrEqual(0)
      expect(result.g).toBeLessThanOrEqual(255)
      expect(result.b).toBeGreaterThanOrEqual(0)
      expect(result.b).toBeLessThanOrEqual(255)
    })
  })

  describe('rgbToHex', () => {
    it('should convert white RGB to hex', () => {
      expect(rgbToHex(255, 255, 255)).toBe('#ffffff')
    })

    it('should convert black RGB to hex', () => {
      expect(rgbToHex(0, 0, 0)).toBe('#000000')
    })

    it('should pad single digit hex values', () => {
      expect(rgbToHex(1, 2, 3)).toBe('#010203')
    })

    it('should handle mid-range RGB values', () => {
      expect(rgbToHex(128, 64, 192)).toBe('#8040c0')
    })
  })

  describe('oklchStringToHex', () => {
    it('should parse and convert valid OKLCH string', () => {
      const hex = oklchStringToHex('oklch(0.98 0 0)')
      expect(hex).toMatch(/^#[0-9a-f]{6}$/)
    })

    it('should parse OKLCH string with decimals', () => {
      const hex = oklchStringToHex('oklch(0.55 0.15 145)')
      expect(hex).toMatch(/^#[0-9a-f]{6}$/)
    })

    it('should return black for invalid OKLCH string', () => {
      expect(oklchStringToHex('invalid')).toBe('#000000')
      expect(oklchStringToHex('rgb(255, 0, 0)')).toBe('#000000')
      expect(oklchStringToHex('')).toBe('#000000')
    })

    it('should handle various whitespace in OKLCH string', () => {
      const hex1 = oklchStringToHex('oklch(0.5 0.1 120)')
      const hex2 = oklchStringToHex('oklch( 0.5  0.1  120 )')
      expect(hex1).toMatch(/^#[0-9a-f]{6}$/)
      expect(hex2).toMatch(/^#[0-9a-f]{6}$/)
    })
  })

  describe('SAFE_COLORS', () => {
    it('should export all required color constants', () => {
      expect(SAFE_COLORS.background).toBeDefined()
      expect(SAFE_COLORS.foreground).toBeDefined()
      expect(SAFE_COLORS.primary).toBeDefined()
      expect(SAFE_COLORS.secondary).toBeDefined()
      expect(SAFE_COLORS.accent).toBeDefined()
      expect(SAFE_COLORS.destructive).toBeDefined()
    })

    it('should have valid hex color format for all colors', () => {
      const hexPattern = /^#[0-9a-f]{6}$/
      Object.values(SAFE_COLORS).forEach(color => {
        expect(color).toMatch(hexPattern)
      })
    })

    it('should have white-ish background color', () => {
      // Background should be very light (close to white)
      expect(SAFE_COLORS.background).toMatch(/^#[ef][0-9a-f]{5}$/)
    })

    it('should have dark foreground color for contrast', () => {
      // Foreground should be dark (lower hex values)
      const r = parseInt(SAFE_COLORS.foreground.slice(1, 3), 16)
      const g = parseInt(SAFE_COLORS.foreground.slice(3, 5), 16)
      const b = parseInt(SAFE_COLORS.foreground.slice(5, 7), 16)

      // All channels should be relatively dark
      expect(r).toBeLessThan(128)
      expect(g).toBeLessThan(128)
      expect(b).toBeLessThan(128)
    })

    it('should have greenish primary color', () => {
      // Primary is pitch green, so green channel should be prominent
      const g = parseInt(SAFE_COLORS.primary.slice(3, 5), 16)

      // Green should be a significant component
      expect(g).toBeGreaterThan(50)
    })
  })

  describe('Color conversion consistency', () => {
    it('should produce consistent results for same input', () => {
      const hex1 = oklchStringToHex('oklch(0.55 0.15 145)')
      const hex2 = oklchStringToHex('oklch(0.55 0.15 145)')
      expect(hex1).toBe(hex2)
    })

    it('should handle edge cases in lightness', () => {
      const black = oklchStringToHex('oklch(0 0 0)')
      const white = oklchStringToHex('oklch(1 0 0)')

      expect(black).toBe('#000000')
      expect(white).toMatch(/^#[ef][0-9a-f]{5}$/)
    })
  })
})
