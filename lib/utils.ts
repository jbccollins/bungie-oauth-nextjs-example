export type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
export type XOR<T, U> = T | U extends object
  ? (Without<T, U> & U) | (Without<U, T> & T)
  : T | U;

/**
 * If the parameter is not an Error, wrap a stringified version of it in an
 * Error. Meant to be used from catch blocks where the thrown type is not known.
 */
export function convertToError(e: unknown): Error {
  if (e instanceof Error) {
    return e;
  }
  return new Error(JSON.stringify(e));
}

/*
 * Stable empty versions of common data structures, to use in reducers.
 *
 * These always return the same instance so they'll always be referentially equal.
 */

const EMPTY_OBJ = Object.freeze({});
export function emptyObject<
  T extends Record<string, unknown> | Record<number, unknown>
>(): T {
  return EMPTY_OBJ as T;
}

// @ts-ignore
const EMPTY_ARRAY: readonly unknown[] = Object.freeze<unknown>([]);
export function emptyArray<T>(): T[] {
  return EMPTY_ARRAY as T[];
}

const EMPTY_SET = Object.freeze(new Set());
export function emptySet<T>(): Set<T> {
  return EMPTY_SET as Set<T>;
}

const EMPTY_MAP = Object.freeze(new Map());
export function emptyMap<K, V>(): Map<K, V> {
  return EMPTY_MAP as Map<K, V>;
}

/*
 * Expand a relative bungie.net asset path to a full path.
 */
export function bungieNetPath(src: string): string {
  if (!src) {
    return "";
  }
  if (src.startsWith("~")) {
    return src.substring(1);
  }
  return `https://www.bungie.net${src}`;
}
