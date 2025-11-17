/**
 * Client-safe ID generator for React components
 * Prevents hydration mismatches by only generating IDs on the client side
 * 
 * IMPORTANT: For initial state, use useState with a function that generates IDs
 * only when the component mounts on the client, not during SSR.
 */

let idCounter = 0;

/**
 * Generates a unique ID that's safe for use in React components
 * This ensures server and client render the same initial state
 * 
 * @returns A unique string ID
 */
export function generateId(): string {
  // Always generate a consistent ID format
  // The key is to call this AFTER hydration, not during initial render
  return `id-${Date.now()}-${++idCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generates a simple numeric ID (for use in arrays where order matters)
 * Use this for initial state that will be replaced after hydration
 */
export function generateSimpleId(): number {
  return ++idCounter;
}

/**
 * Creates a safe initial state that prevents hydration mismatches
 * Use this pattern in useState initializers - the function only runs once on mount
 * 
 * @example
 * const [items, setItems] = useState(() => createSafeInitialState(() => [
 *   { id: Date.now(), name: 'Item 1' }
 * ]));
 */
export function createSafeInitialState<T>(factory: () => T): T {
  // During SSR, return empty/default state
  // On client, the factory will run and generate proper IDs
  if (typeof window === 'undefined') {
    // Return a safe default - empty array, empty object, or null
    return (Array.isArray(factory()) ? [] : {}) as T;
  }
  // On client, generate proper IDs
  return factory();
}

/**
 * Helper to create initial state with IDs that only generate on client
 * This prevents hydration mismatches
 * 
 * @example
 * const [timeSlots, setTimeSlots] = useState(() => 
 *   createInitialStateWithIds(() => [
 *     { id: Date.now(), time: "06:00", tasks: [] }
 *   ])
 * );
 */
export function createInitialStateWithIds<T extends Array<any>>(
  factory: () => T
): T {
  // During SSR, return empty array
  // On client mount, the factory runs and generates IDs
  if (typeof window === 'undefined') {
    return [] as T;
  }
  return factory();
}

