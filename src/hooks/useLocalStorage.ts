import { useState, useEffect, useCallback } from 'react'

/**
 * Custom hook for managing state synchronized with localStorage
 * Replaces the @github/spark useKV hook for browser-based storage
 *
 * @template T - The type of value to store
 * @param {string} key - The localStorage key to use for storage
 * @param {T} initialValue - The initial value to use if no value exists in localStorage
 * @returns {[T, (value: T | ((prev: T) => T)) => void]} A tuple containing the current value and a setter function
 *
 * @example
 * const [theme, setTheme] = useLocalStorage<string>('theme', 'light')
 * setTheme('dark') // Updates localStorage and state
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Get initial value from localStorage or use the provided initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // Update localStorage when value changes
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setStoredValue(prevValue => {
          const valueToStore = value instanceof Function ? value(prevValue) : value
          window.localStorage.setItem(key, JSON.stringify(valueToStore))
          return valueToStore
        })
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key]
  )

  // Listen for changes to localStorage from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue))
        } catch (error) {
          console.error(`Error parsing localStorage change for key "${key}":`, error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key])

  return [storedValue, setValue]
}
