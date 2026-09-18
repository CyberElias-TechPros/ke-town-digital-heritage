import "@testing-library/jest-dom";

/* ---------------------------------------------------------------- matchMedia */
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

/* ------------------------------------------------------------- Intersection */
// framer-motion's whileInView and useInView both need this.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "0px";
  readonly thresholds: ReadonlyArray<number> = [0];
  constructor(private cb: IntersectionObserverCallback) {}
  observe(target: Element) {
    // Report "in view" immediately so reveal animations resolve in tests.
    this.cb(
      [{ isIntersecting: true, intersectionRatio: 1, target, boundingClientRect: target.getBoundingClientRect(), intersectionRect: target.getBoundingClientRect(), rootBounds: null, time: Date.now() }],
      this as unknown as IntersectionObserver,
    );
  }
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
(globalThis as any).IntersectionObserver = MockIntersectionObserver;
(window as any).IntersectionObserver = MockIntersectionObserver;

/* -------------------------------------------------------------- ResizeObserver */
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = MockResizeObserver;
(window as any).ResizeObserver = MockResizeObserver;

/* --------------------------------------------------------------- scroll APIs */
window.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};

/* ------------------------------------------------------------------- canvas */
// Some chart/map components probe for a 2D context; jsdom has none.
HTMLCanvasElement.prototype.getContext = (() => null) as any;

/* -------------------------------------------------------------------- fetch */
/**
 * The app calls the API with relative URLs (`/api/...`). jsdom's base URI is
 * http://localhost:3000, which serves nothing, so rewrite relative /api and
 * /api/media requests onto the Worker under test. Absolute URLs pass through.
 */
const WORKER = process.env.WORKER_BASE || "http://127.0.0.1:8787";
const nativeFetch = globalThis.fetch.bind(globalThis);

globalThis.fetch = ((input: any, init?: RequestInit) => {
  if (typeof input === "string" && input.startsWith("/")) {
    return nativeFetch(`${WORKER}${input}`, init);
  }
  if (input instanceof URL && input.origin === window.location.origin) {
    return nativeFetch(`${WORKER}${input.pathname}${input.search}`, init);
  }
  return nativeFetch(input, init);
}) as typeof fetch;
