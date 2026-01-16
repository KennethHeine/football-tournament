import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from '../hooks/useLocalStorage'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should return initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))
    expect(result.current[0]).toBe('initial')
  })

  it('should return stored value from localStorage', () => {
    localStorageMock.setItem('test-key', JSON.stringify('stored-value'))
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))
    expect(result.current[0]).toBe('stored-value')
  })

  it('should update localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))
    
    act(() => {
      result.current[1]('new-value')
    })

    expect(result.current[0]).toBe('new-value')
    expect(JSON.parse(localStorageMock.getItem('test-key')!)).toBe('new-value')
  })

  it('should support functional updates', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 5))
    
    act(() => {
      result.current[1](prev => prev + 10)
    })

    expect(result.current[0]).toBe(15)
    expect(JSON.parse(localStorageMock.getItem('test-key')!)).toBe(15)
  })

  it('should handle complex objects', () => {
    const initialValue = { name: 'Test', count: 0 }
    const { result } = renderHook(() => useLocalStorage('test-key', initialValue))
    
    const newValue = { name: 'Updated', count: 5 }
    act(() => {
      result.current[1](newValue)
    })

    expect(result.current[0]).toEqual(newValue)
    expect(JSON.parse(localStorageMock.getItem('test-key')!)).toEqual(newValue)
  })

  it('should handle arrays', () => {
    const initialValue = [1, 2, 3]
    const { result } = renderHook(() => useLocalStorage('test-key', initialValue))
    
    const newValue = [4, 5, 6]
    act(() => {
      result.current[1](newValue)
    })

    expect(result.current[0]).toEqual(newValue)
    expect(JSON.parse(localStorageMock.getItem('test-key')!)).toEqual(newValue)
  })

  it('should return initial value when localStorage has invalid JSON', () => {
    localStorageMock.setItem('test-key', 'invalid-json{')
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'fallback'))
    
    expect(result.current[0]).toBe('fallback')
    expect(consoleErrorSpy).toHaveBeenCalled()
    
    consoleErrorSpy.mockRestore()
  })

  it('should persist different keys independently', () => {
    const { result: result1 } = renderHook(() => useLocalStorage('key1', 'value1'))
    const { result: result2 } = renderHook(() => useLocalStorage('key2', 'value2'))
    
    act(() => {
      result1.current[1]('updated1')
    })

    expect(result1.current[0]).toBe('updated1')
    expect(result2.current[0]).toBe('value2')
    expect(JSON.parse(localStorageMock.getItem('key1')!)).toBe('updated1')
  })
})
