import { type ClassValue, clsx } from "clsx";
import { JSONSchema7 } from "json-schema";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and tailwind-merge for handling Tailwind CSS conflicts.
 * 
 * @param inputs - Class values to be combined
 * @returns Merged class names with conflicts resolved
 * 
 * @example
 * ```tsx
 * <div className={cn("text-red-500", "text-blue-500")} />
 * // Results in "text-blue-500" (tailwind-merge resolves conflicts)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Fetches data from a URL with enhanced error handling.
 * 
 * @param url - The URL to fetch data from
 * @param options - Fetch options to be passed to the fetch call
 * @returns Parsed JSON response
 * @throws Error with status and info properties when the request fails
 * 
 * @example
 * ```typescript
 * try {
 *   const data = await fetcher('/api/users');
 * } catch (error) {
 *   console.error('Status:', error.status);
 *   console.error('Info:', error.info);
 * }
 * ```
 */
export const fetcher = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, {
    redirect: "follow",
    cache: "no-store",
    ...options,
  });

  if (!res.ok) {
    let errorPayload: any;
    try {
      errorPayload = await res.json();
    } catch {
      errorPayload = { message: `Request failed with status ${res.status}` };
    }
    const error = new Error(
      errorPayload.message || "An error occurred while fetching the data.",
    ) as Error & { info?: unknown; status?: number };
    error.info = errorPayload;
    error.status = res.status;
    throw error;
  }

  return res.json();
};

/**
 * Creates an increment function that returns increasing numbers starting from the initial value.
 * 
 * @param i - The initial value to start incrementing from (default: 0)
 * @returns A function that when called returns the current value and increments it
 * 
 * @example
 * ```typescript
 * const getNextId = createIncrement(1);
 * console.log(getNextId()); // 1
 * console.log(getNextId()); // 2
 * ```
 */
export const createIncrement =
  (i = 0) =>
  () =>
    i++;

/**
 * A no-operation function that does nothing when called.
 * Useful as a default callback or placeholder.
 */
export const noop = () => {};

/**
 * Creates a promise that resolves after a specified delay.
 * 
 * @param delay - The delay in milliseconds (default: 0)
 * @returns A promise that resolves after the specified delay
 * 
 * @example
 * ```typescript
 * await wait(1000); // Waits for 1 second
 * ```
 */
export const wait = (delay = 0) =>
  new Promise<void>((resolve) => setTimeout(resolve, delay));

/**
 * Generates a random integer within a specified range (inclusive).
 * 
 * @param min - The minimum value (inclusive)
 * @param max - The maximum value (inclusive)
 * @returns A random integer between min and max
 * 
 * @example
 * ```typescript
 * const randomNum = randomRange(1, 10); // Returns a number between 1 and 10
 * ```
 */
export const randomRange = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);

/**
 * Type guard to check if a value is a string.
 * 
 * @param value - The value to check
 * @returns True if the value is a string, false otherwise
 */
export const isString = (value: any): value is string =>
  typeof value === "string";

/**
 * Type guard to check if a value is a function.
 * 
 * @param v - The value to check
 * @returns True if the value is a function, false otherwise
 */
export const isFunction = <
  T extends (...args: any[]) => any = (...args: any[]) => any,
>(
  v: unknown,
): v is T => typeof v === "function";

/**
 * Type guard to check if a value is an object (and not null).
 * 
 * @param value - The value to check
 * @returns True if the value is an object, false otherwise
 */
export const isObject = (value: any): value is Record<string, any> =>
  Object(value) === value;

/**
 * Type guard to check if a value is null or undefined.
 * 
 * @param value - The value to check
 * @returns True if the value is null or undefined, false otherwise
 */
export const isNull = (value: any): value is null | undefined => value == null;

/**
 * Type guard to check if a value is Promise-like (has a then method).
 * 
 * @param x - The value to check
 * @returns True if the value is Promise-like, false otherwise
 */
export const isPromiseLike = (x: unknown): x is PromiseLike<unknown> =>
  isFunction((x as any)?.then);

/**
 * Checks if a value is valid JSON (either a string that can be parsed or an object).
 * 
 * @param value - The value to check
 * @returns True if the value is valid JSON, false otherwise
 */
export const isJson = (value: any): value is Record<string, any> => {
  try {
    if (typeof value === "string") {
      const str = value.trim();
      JSON.parse(str);
      return true;
    } else if (isObject(value)) {
      return true;
    }
    return false;
  } catch (_e) {
    return false;
  }
};

/**
 * Creates a debounced function that delays execution until after a certain delay has passed.
 * 
 * @returns A debounced function with a clear method
 * 
 * @example
 * ```typescript
 * const debounce = createDebounce();
 * const debouncedFunc = () => console.log('Executed!');
 * debounce(debouncedFunc, 300);
 * ```
 */
export const createDebounce = () => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounce = (func: (...args: any[]) => any, waitFor = 200) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(), waitFor);
    return timeout;
  };

  debounce.clear = () => {
    if (timeout) clearTimeout(timeout);
    timeout = null;
  };
  
  return debounce;
};

/**
 * Creates a throttled function that limits execution to once per specified time period.
 * 
 * @returns A throttled function with a clear method
 * 
 * @example
 * ```typescript
 * const throttle = createThrottle();
 * const throttledFunc = () => console.log('Executed!');
 * throttle(throttledFunc, 300);
 * ```
 */
export const createThrottle = () => {
  let lastCall = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const throttle = (func: (...args: any[]) => any, waitFor = 200) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= waitFor) {
      lastCall = now;
      func();
    } else {
      // Schedule the next call if not already scheduled
      if (!timeout) {
        const remainingTime = waitFor - timeSinceLastCall;
        timeout = setTimeout(() => {
          lastCall = Date.now();
          func();
          timeout = null;
        }, remainingTime);
      }
    }
  };

  throttle.clear = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    lastCall = 0;
  };

  return throttle;
};

/**
 * Groups array elements by a key or using a getter function.
 * 
 * @typeParam T - The type of items in the array
 * @param arr - The array to group
 * @param getter - The key to group by or a function that returns the grouping key
 * @returns An object with keys representing groups and values as arrays of grouped items
 * 
 * @example
 * ```typescript
 * const users = [{ name: "John", department: "IT" }, { name: "Jane", department: "HR" }];
 * const grouped = groupBy(users, "department");
 * // { IT: [{ name: "John", department: "IT" }], HR: [{ name: "Jane", department: "HR" }] }
 * ```
 */
export const groupBy = <T>(arr: T[], getter: keyof T | ((item: T) => string)) =>
  arr.reduce(
    (prev, item) => {
      const key: string =
        getter instanceof Function ? getter(item) : (item[getter] as string);

      if (!prev[key]) prev[key] = [];
      prev[key].push(item);
      return prev;
    },
    {} as Record<string, T[]>,
  );

/**
 * Creates a promise chain executor that ensures functions are executed sequentially.
 * 
 * @returns A function that accepts async functions and executes them in sequence
 * 
 * @example
 * ```typescript
 * const chain = PromiseChain();
 * chain(async () => console.log("First"));
 * chain(async () => console.log("Second"));
 * ```
 */
export const PromiseChain = () => {
  let promise: Promise<any> = Promise.resolve();
  return <T>(asyncFunction: () => Promise<T>): Promise<T> => {
    const resultPromise = promise.then(() => asyncFunction());
    promise = resultPromise.catch(() => {});
    return resultPromise;
  };
};

/**
 * Creates a deferred promise that can be resolved or rejected externally.
 * 
 * @typeParam T - The type of the promise value
 * @returns An object with promise, resolve, and reject methods
 * 
 * @example
 * ```typescript
 * const deferred = Deferred<string>();
 * deferred.promise.then((value) => console.log(value));
 * deferred.resolve("Hello World");
 * ```
 */
export const Deferred = <T = void>() => {
  let resolve: (value: T | PromiseLike<T>) => void = () => {};
  let reject: (reason?: any) => void = () => {};
  const promise = new Promise<T>((rs, rj) => {
    resolve = rs;
    reject = rj;
  });

  return {
    promise,
    reject,
    resolve,
  };
};
/**
 * A locking mechanism that allows waiting for a resource to be unlocked.
 * 
 * @example
 * ```typescript
 * const locker = new Locker();
 * locker.lock();
 * // Do something that requires exclusive access
 * locker.unlock();
 * ```
 */
export class Locker {
  private promise = Promise.resolve();
  private resolve: (() => void) | undefined = undefined;

  /**
   * Checks if the locker is currently locked.
   * 
   * @returns True if locked, false otherwise
   */
  get isLocked() {
    return !!this.resolve;
  }

  /**
   * Locks the resource.
   */
  lock() {
    this.promise = new Promise((resolve) => {
      this.resolve = resolve;
    });
  }
  
  /**
   * Unlocks the resource.
   */
  unlock() {
    if (!this.isLocked) return;
    this.resolve?.();
    this.resolve = undefined;
  }
  
  /**
   * Waits for the resource to be unlocked.
   */
  async wait() {
    await this.promise;
  }
}

/**
 * Safely parses a JSON string, returning a result object with success status.
 * 
 * @typeParam T - The expected type of the parsed value
 * @param json - The JSON string to parse
 * @returns An object with success status, and either the parsed value or error
 * 
 * @example
 * ```typescript
 * const result = safeJSONParse('{"name": "John"}');
 * if (result.success) {
 *   console.log(result.value.name); // "John"
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function safeJSONParse<T = unknown>(
  json: string,
):
  | {
      success: true;
      value: T;
      error?: unknown;
    }
  | {
      success: false;
      error: unknown;
      value?: T;
    } {
  try {
    const parsed = JSON.parse(json);
    return {
      success: true,
      value: parsed,
    };
  } catch (e) {
    return {
      success: false,
      error: e,
    };
  }
}

/**
 * Generates a random UUID v4 string.
 * 
 * @returns A UUID v4 string
 * 
 * @example
 * ```typescript
 * const id = generateUUID(); // "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 * ```
 */
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * A type utility function that casts a value to any type.
 * 
 * @typeParam T - The input type
 * @param value - The value to cast
 * @returns The same value cast to any type
 */
export function toAny<T>(value: T): any {
  return value;
}

/**
 * Converts an unknown error to a string representation.
 * 
 * @param error - The error to convert
 * @returns A string representation of the error
 */
export function errorToString(error: unknown): string {
  if (error == null) {
    return "unknown error";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return JSON.stringify(error);
}

/**
 * Provides a fluent API for working with objects, similar to array methods.
 * 
 * @typeParam T - The type of the object
 * @param obj - The object to work with
 * @returns An object with methods for manipulating the object
 * 
 * @example
 * ```typescript
 * const obj = { a: 1, b: 2, c: 3 };
 * const result = objectFlow(obj)
 *   .map((value) => value * 2)
 *   .filter((value) => value > 2);
 * ```
 */
export function objectFlow<T extends Record<string, any>>(obj: T) {
  return {
    /**
     * Maps over the object values, transforming each value with the provided function.
     * 
     * @typeParam R - The return type of the mapping function
     * @param fn - The mapping function
     * @returns A new object with transformed values
     */
    map: <R>(
      fn: (value: T[keyof T], key: keyof T) => R,
    ): Record<keyof T, R> => {
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [key, fn(value, key)]),
      ) as Record<keyof T, R>;
    },
    
    /**
     * Filters the object entries based on the provided predicate function.
     * 
     * @param fn - The predicate function
     * @returns A new object with filtered entries
     */
    filter: (
      fn: (value: T[keyof T], key: keyof T) => boolean,
    ): Record<keyof T, T[keyof T]> => {
      return Object.fromEntries(
        Object.entries(obj).filter(([key, value]) => fn(value, key)),
      ) as Record<keyof T, T[keyof T]>;
    },

    /**
     * Executes a function for each entry in the object.
     * 
     * @param fn - The function to execute for each entry
     */
    forEach: (fn: (value: T[keyof T], key: keyof T) => void): void => {
      Object.entries(obj).forEach(([key, value]) => fn(value, key));
    },
    
    /**
     * Tests whether at least one entry in the object passes the test implemented by the provided function.
     * 
     * @param fn - The test function
     * @returns True if at least one entry passes the test, false otherwise
     */
    some: (fn: (value: T[keyof T], key: keyof T) => any): boolean => {
      return Object.entries(obj).some(([key, value]) => fn(value, key));
    },
    
    /**
     * Tests whether all entries in the object pass the test implemented by the provided function.
     * 
     * @param fn - The test function
     * @returns True if all entries pass the test, false otherwise
     */
    every: (fn: (value: T[keyof T], key: keyof T) => any): boolean => {
      return Object.entries(obj).every(([key, value]) => fn(value, key));
    },
    
    /**
     * Returns the value of the first entry that satisfies the provided test function.
     * 
     * @param fn - The test function
     * @returns The value of the first entry that satisfies the test, or undefined if no entry satisfies the test
     */
    find(fn: (value: T[keyof T], key: keyof T) => any): T | undefined {
      return Object.entries(obj).find(([key, value]) => fn(value, key))?.[1];
    },
    
    /**
     * Gets a value from the object using a path array.
     * 
     * @typeParam U - The expected return type
     * @param path - The path to the value as an array of keys
     * @returns The value at the specified path, or undefined if not found
     */
    getByPath<U>(path: string[]): U | undefined {
      let result: any = obj;
      path.find((p) => {
        result = result?.[p];
        return !result;
      });
      return result;
    },
    
    /**
     * Sets a value in the object using a path array.
     * 
     * @param path - The path to the value as an array of keys
     * @param value - The value to set
     * @returns The modified object
     */
    setByPath(path: string[], value: any) {
      let current: Record<string, any> = obj as Record<string, any>;
      for (let i = 0; i < path.length; i++) {
        const key = path[i];
        const isLast = i === path.length - 1;
        if (isLast) {
          current[key] = value;
        } else {
          if (current[key] == null || typeof current[key] !== "object") {
            current[key] = {};
          }
          current = current[key] as Record<string, any>;
        }
      }
      return obj;
    },
  };
}

/**
 * Capitalizes the first letter of a string.
 * 
 * @param str - The string to capitalize
 * @returns The string with the first letter capitalized
 * 
 * @example
 * ```typescript
 * capitalizeFirstLetter("hello"); // "Hello"
 * ```
 */
export function capitalizeFirstLetter(str: string): string {
  if (!str || str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncates a string to a specified length and adds ellipsis if truncated.
 * 
 * @param str - The string to truncate
 * @param maxLength - The maximum length of the string
 * @returns The truncated string with ellipsis if needed
 * 
 * @example
 * ```typescript
 * truncateString("This is a long string", 10); // "This is a..."
 * ```
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

/**
 * Waits for the next tick of the event loop.
 * 
 * @returns A promise that resolves on the next tick
 */
export async function nextTick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Cleans a string to make it a valid variable name by removing invalid characters.
 * 
 * @param input - The string to clean (default: "")
 * @returns A cleaned string suitable for use as a variable name
 */
export function cleanVariableName(input: string = ""): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  return input.replace(/[^\w\u0080-\uFFFF-]/g, "").replace(/^[0-9]+/, "");
}

/**
 * Generates a unique key by appending a counter if the key already exists in the provided array.
 * 
 * @param key - The original key
 * @param existingKeys - Array of existing keys to check against
 * @returns A unique key
 * 
 * @example
 * ```typescript
 * generateUniqueKey("item", ["item", "item1"]); // "item2"
 * ```
 */
export function generateUniqueKey(key: string, existingKeys: string[]): string {
  let newKey = key;
  let counter = 1;

  while (existingKeys.includes(newKey)) {
    const baseKey = key.replace(/\d+$/, "");
    const hasOriginalNumber = key !== baseKey;
    if (hasOriginalNumber) {
      const originalNumber = parseInt(key.match(/\d+$/)?.[0] || "0");
      newKey = baseKey + (originalNumber + counter);
    } else {
      newKey = baseKey + counter;
    }
    counter++;
  }
  return newKey;
}

/**
 * Creates a new object with specified keys omitted.
 * 
 * @typeParam T - The type of the input object
 * @typeParam K - The keys to omit
 * @param obj - The object to omit keys from
 * @param keys - Array of keys to omit
 * @returns A new object with the specified keys omitted
 * 
 * @example
 * ```typescript
 * const obj = { a: 1, b: 2, c: 3 };
 * const result = exclude(obj, ["b"]); // { a: 1, c: 3 }
 * ```
 */
export function exclude<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keys.includes(key as K)),
  ) as Omit<T, K>;
}

/**
 * Validates a schema and its variable name.
 * 
 * @param key - The variable name to validate
 * @param schema - The JSON schema to validate
 * @returns True if the schema is valid
 * @throws Error if the schema or variable name is invalid
 */
export function validateSchema(key: string, schema: JSONSchema7): boolean {
  const variableName = cleanVariableName(key);
  if (variableName.length === 0) {
    throw new Error("Invalid Variable Name");
  }
  if (variableName.length > 255) {
    throw new Error("Variable Name is too long");
  }
  if (!schema.type) {
    throw new Error("Invalid Schema");
  }
  if (schema.type == "array" || schema.type == "object") {
    const keys = Array.from(Object.keys(schema.properties ?? {}));
    if (keys.length != new Set(keys).size) {
      throw new Error("Output data must have unique keys");
    }
    return keys.every((key) => {
      return validateSchema(key, schema.properties![key] as JSONSchema7);
    });
  }
  return true;
}

/**
 * Creates an event emitter for string values.
 * 
 * @returns An object with on, off, and emit methods
 * 
 * @example
 * ```typescript
 * const emitter = createEmitter();
 * const unsubscribe = emitter.on((value) => console.log(value));
 * emitter.emit("Hello World");
 * unsubscribe(); // Remove the listener
 * ```
 */
export const createEmitter = () => {
  const listeners = new Set<(value: string) => void>();
  return {
    /**
     * Adds a listener to the emitter.
     * 
     * @param listener - The listener function to add
     * @returns A function to unsubscribe the listener
     */
    on: (listener: (value: string) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    
    /**
     * Removes a listener from the emitter.
     * 
     * @param listener - The listener function to remove
     */
    off: (listener: (value: string) => void) => {
      listeners.delete(listener);
    },
    
    /**
     * Emits a value to all listeners.
     * 
     * @param value - The value to emit to listeners
     */
    emit: (value: string) => {
      listeners.forEach((listener) => listener(value));
    },
  };
};

/**
 * Removes duplicate items from an array based on a specific key.
 * 
 * @typeParam T - The type of items in the array
 * @param arr - The array to deduplicate
 * @param key - The key to check for duplicates
 * @returns A new array with duplicates removed
 * 
 * @example
 * ```typescript
 * const users = [{ id: 1, name: "John" }, { id: 2, name: "Jane" }, { id: 1, name: "John" }];
 * const uniqueUsers = deduplicateByKey(users, "id");
 * // [{ id: 1, name: "John" }, { id: 2, name: "Jane" }]
 * ```
 */
export function deduplicateByKey<T>(arr: T[], key: keyof T): T[] {
  const seen = new Set<T[keyof T]>();
  return arr.filter((item) => {
    const keyValue = item[key];
    if (seen.has(keyValue)) {
      return false;
    } else {
      seen.add(keyValue);
      return true;
    }
  });
}

/**
 * Wraps a promise with a timeout that will reject if the promise doesn't resolve within the specified time.
 * 
 * @typeParam T - The type of the promise value
 * @param promise - The promise to wrap with a timeout
 * @param ms - The timeout in milliseconds
 * @returns A promise that resolves with the original value or rejects with a timeout error
 * 
 * @example
 * ```typescript
 * try {
 *   const result = await withTimeout(fetch("/api/data"), 5000);
 * } catch (error) {
 *   if (error.message === "Timeout") {
 *     console.log("Request timed out");
 *   }
 * }
 * ```
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timeout"));
    }, ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Parses an environment variable as a boolean value.
 * 
 * @param value - The value to parse (can be string, boolean, or undefined)
 * @returns True if the value represents a truthy value, false otherwise
 * 
 * @example
 * ```typescript
 * parseEnvBoolean("true");  // true
 * parseEnvBoolean("1");     // true
 * parseEnvBoolean("y");     // true
 * parseEnvBoolean(false);   // false
 * ```
 */
export function parseEnvBoolean(value: string | boolean | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lowerVal = value.toLowerCase();
    return lowerVal === "true" || lowerVal === "1" || lowerVal === "y";
  }
  return false;
}