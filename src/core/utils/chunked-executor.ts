/**
 * Chunked execution utility for processing large arrays in batches.
 *
 * This module provides a generalized utility for processing arrays in chunks,
 * yielding to the main thread between chunks to keep the UI responsive.
 * It supports progress reporting and cancellation via AbortSignal.
 *
 * @module
 */

/**
 * Custom error thrown when chunked execution is aborted.
 *
 * Contains partial results that were computed before the abort occurred.
 *
 * @example
 * ```typescript
 * try {
 *   await executeInChunks(options);
 * } catch (error) {
 *   if (error instanceof ChunkedExecutorAbortError) {
 *     console.log(`Aborted after processing ${error.partialResults.length} items`);
 *     // Optionally use partial results
 *     const partialData = error.partialResults;
 *   }
 * }
 * ```
 */
export class ChunkedExecutorAbortError<R> extends Error {
  /**
   * The name of this error type.
   */
  public readonly name = 'ChunkedExecutorAbortError';

  /**
   * Creates a new ChunkedExecutorAbortError.
   *
   * @param message - Human-readable error description
   * @param partialResults - Results computed before the abort
   */
  constructor(
    message: string,
    public readonly partialResults: R[],
  ) {
    super(message);

    // Maintains proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Configuration options for chunked execution.
 *
 * @typeParam T - The type of items being processed
 * @typeParam R - The type of results produced by processing
 */
export interface ChunkedExecutorOptions<T, R> {
  /**
   * The array of items to process.
   */
  readonly items: readonly T[];

  /**
   * The number of items to process in each chunk.
   *
   * @default 1000
   */
  readonly chunkSize?: number | undefined;

  /**
   * Delay in milliseconds between chunks.
   *
   * Uses `setTimeout(delayMs)` to yield to the main thread.
   * A value of 0 uses `setTimeout(0)` which yields but doesn't add extra delay.
   *
   * @default 0
   */
  readonly delayMs?: number | undefined;

  /**
   * Function to process a chunk of items.
   *
   * @param chunk - The subset of items to process
   * @param startIndex - The starting index of this chunk in the original array
   * @returns Array of results for the chunk (must have same length as chunk)
   */
  readonly process: (chunk: T[], startIndex: number) => R[];

  /**
   * Optional callback invoked after each chunk is processed.
   *
   * @param completed - Number of items processed so far
   * @param total - Total number of items to process
   */
  readonly onProgress?: ((completed: number, total: number) => void) | undefined;

  /**
   * Optional AbortSignal for cancellation support.
   *
   * When aborted, execution stops and throws `ChunkedExecutorAbortError`
   * with any partial results computed so far.
   */
  readonly signal?: AbortSignal | undefined;
}

/**
 * Default chunk size for processing.
 */
const DEFAULT_CHUNK_SIZE = 1000;

/**
 * Default delay between chunks in milliseconds.
 */
const DEFAULT_DELAY_MS = 0;

/**
 * Creates a promise that resolves after a specified delay.
 *
 * @param ms - Delay in milliseconds
 * @returns Promise that resolves after the delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(function resolveAfterDelay(resolve) {
    setTimeout(resolve, ms);
  });
}

/**
 * Checks if the AbortSignal is aborted and throws if so.
 *
 * @typeParam R - The type of partial results
 * @param signal - The AbortSignal to check
 * @param partialResults - Results computed so far
 * @throws ChunkedExecutorAbortError if the signal is aborted
 */
function checkAbortSignal<R>(signal: AbortSignal | undefined, partialResults: R[]): void {
  if (signal && signal.aborted) {
    throw new ChunkedExecutorAbortError('Chunked execution was aborted', partialResults);
  }
}

/**
 * Processes a large array in chunks, yielding to the main thread between chunks.
 *
 * This utility enables non-blocking processing of large datasets on the main thread
 * by breaking the work into smaller chunks and using `setTimeout` to yield control
 * back to the browser between chunks.
 *
 * @typeParam T - The type of items being processed
 * @typeParam R - The type of results produced by processing
 * @param options - Configuration options for chunked execution
 * @returns Promise resolving to a flattened array of all results
 * @throws ChunkedExecutorAbortError if the operation is aborted via AbortSignal
 * @throws Any error thrown by the process function
 *
 * @example
 * ```typescript
 * // Process rows with progress reporting
 * const results = await executeInChunks({
 *   items: largeArray,
 *   chunkSize: 500,
 *   process: (chunk, startIndex) => chunk.map(item => transform(item)),
 *   onProgress: (completed, total) => {
 *     console.log(`Processed ${completed}/${total} items`);
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // With cancellation support
 * const controller = new AbortController();
 * setTimeout(() => controller.abort(), 5000);
 *
 * try {
 *   const results = await executeInChunks({
 *     items: largeArray,
 *     signal: controller.signal,
 *     process: (chunk) => chunk.map(expensiveOperation)
 *   });
 * } catch (error) {
 *   if (error instanceof ChunkedExecutorAbortError) {
 *     console.log('Processing was cancelled');
 *   }
 * }
 * ```
 */
export async function executeInChunks<T, R>(options: ChunkedExecutorOptions<T, R>): Promise<R[]> {
  const items = options.items;
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
  const process = options.process;
  const onProgress = options.onProgress;
  const signal = options.signal;

  // Handle empty items array immediately
  if (items.length === 0) {
    return [];
  }

  // Check if already aborted before starting
  checkAbortSignal(signal, []);

  const totalItems = items.length;
  const results: R[] = [];

  // Calculate the number of chunks
  const chunkCount = Math.ceil(totalItems / chunkSize);

  // Process single chunk directly without delay
  if (chunkCount === 1) {
    const chunk = items.slice(0, totalItems) as T[];
    const chunkResults = process(chunk, 0);
    results.push(...chunkResults);

    if (onProgress) {
      onProgress(totalItems, totalItems);
    }

    return results;
  }

  // Process multiple chunks with yielding between them
  for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex++) {
    // Check for abort before processing each chunk
    checkAbortSignal(signal, results);

    const startIndex = chunkIndex * chunkSize;
    const endIndex = Math.min(startIndex + chunkSize, totalItems);
    const chunk = items.slice(startIndex, endIndex) as T[];

    // Process the chunk
    const chunkResults = process(chunk, startIndex);
    results.push(...chunkResults);

    // Report progress after each chunk
    if (onProgress) {
      onProgress(endIndex, totalItems);
    }

    // Yield to main thread between chunks (but not after the last one)
    if (chunkIndex < chunkCount - 1) {
      await delay(delayMs);
    }
  }

  return results;
}
