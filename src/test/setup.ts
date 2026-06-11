import '@testing-library/jest-dom'

// --- jsdom polyfills required by sonner and radix-ui components ---

// Node's experimental `localStorage` global shadows jsdom's implementation and
// resolves to undefined (no --localstorage-file). Re-expose jsdom's real
// Storage objects so app code using window.localStorage works in tests.
if (typeof window !== 'undefined' && !window.localStorage) {
  const jsdomInternals = window as unknown as {
    _localStorage?: Storage
    _sessionStorage?: Storage
  }
  if (jsdomInternals._localStorage) {
    Object.defineProperty(window, 'localStorage', {
      value: jsdomInternals._localStorage,
      configurable: true,
    })
  }
  if (jsdomInternals._sessionStorage && !window.sessionStorage) {
    Object.defineProperty(window, 'sessionStorage', {
      value: jsdomInternals._sessionStorage,
      configurable: true,
    })
  }
}

// sonner reads matchMedia for mobile detection; jsdom does not implement it.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

// sonner measures toast heights with ResizeObserver; jsdom does not have it.
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// radix-ui Select/pointer interactions need the pointer-capture API.
if (typeof HTMLElement !== 'undefined') {
  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false
  }
  if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = () => {}
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = () => {}
  }
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => {}
  }
}

// Some components scroll the window; jsdom only warns, so stub it.
if (typeof window !== 'undefined' && !window.scrollTo) {
  window.scrollTo = () => {}
}
