/**
 * Tests for chunked executor utility.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeInChunks, ChunkedExecutorAbortError } from './chunked-executor.ts';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates an array of numbers from 0 to n-1.
 */
function createRange(n: number): number[] {
  return Array.from({ length: n }, function createIndex(_, i) {
    return i;
  });
}

/**
 * Simple identity process function.
 */
function identityProcess<T>(chunk: T[]): T[] {
  return chunk;
}

/**
 * Doubles each number in the chunk.
 */
function doubleProcess(chunk: number[]): number[] {
  return chunk.map(function double(n) {
    return n * 2;
  });
}

/**
 * Transforms number to object with index info.
 */
function transformWithIndex(
  chunk: number[],
  startIndex: number,
): Array<{ value: number; originalIndex: number }> {
  return chunk.map(function transform(value, i) {
    return { value, originalIndex: startIndex + i };
  });
}

// ============================================================================
// Basic Functionality Tests
// ============================================================================

describe('executeInChunks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic chunking behavior', () => {
    it('should process all items and return results', async () => {
      const items = createRange(10);

      const resultPromise = executeInChunks({
        items,
        chunkSize: 3,
        process: doubleProcess,
      });

      // Advance timers to complete all chunks
      await vi.runAllTimersAsync();
      const results = await resultPromise;

      expect(results).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
    });

    it('should use default chunk size of 1000', async () => {
      const items = createRange(2500);
      let chunkCount = 0;

      const resultPromise = executeInChunks({
        items,
        process: function countChunks(chunk) {
          chunkCount++;
          return chunk;
        },
      });

      await vi.runAllTimersAsync();
      await resultPromise;

      // 2500 items with chunk size 1000 = 3 chunks
      expect(chunkCount).toBe(3);
    });

    it('should pass correct startIndex to process function', async () => {
      const items = createRange(10);

      const resultPromise = executeInChunks({
        items,
        chunkSize: 3,
        process: transformWithIndex,
      });

      await vi.runAllTimersAsync();
      const results = await resultPromise;

      expect(results[0]).toEqual({ value: 0, originalIndex: 0 });
      expect(results[3]).toEqual({ value: 3, originalIndex: 3 });
      expect(results[6]).toEqual({ value: 6, originalIndex: 6 });
      expect(results[9]).toEqual({ value: 9, originalIndex: 9 });
    });

    it('should handle items that do not divide evenly by chunk size', async () => {
      const items = createRange(7);

      const resultPromise = executeInChunks({
        items,
        chunkSize: 3,
        process: identityProcess,
      });

      await vi.runAllTimersAsync();
      const results = await resultPromise;

      // 7 items / 3 chunk size = chunks of [3, 3, 1]
      expect(results).toEqual([0, 1, 2, 3, 4, 5, 6]);
      expect(results).toHaveLength(7);
    });
  });

  describe('empty items array', () => {
    it('should return empty array immediately for empty input', async () => {
      const results = await executeInChunks({
        items: [],
        process: identityProcess,
      });

      expect(results).toEqual([]);
    });

    it('should not call process function for empty input', async () => {
      const processFn = vi.fn(identityProcess);

      await executeInChunks({
        items: [],
        process: processFn,
      });

      expect(processFn).not.toHaveBeenCalled();
    });

    it('should not call onProgress for empty input', async () => {
      const onProgress = vi.fn();

      await executeInChunks({
        items: [],
        process: identityProcess,
        onProgress,
      });

      expect(onProgress).not.toHaveBeenCalled();
    });
  });

  describe('single chunk optimization', () => {
    it('should process single chunk directly without delay', async () => {
      const items = createRange(5);

      const results = await executeInChunks({
        items,
        chunkSize: 10, // Chunk size larger than items
        process: identityProcess,
      });

      // For single chunk, no setTimeout should be called for delay
      expect(results).toEqual([0, 1, 2, 3, 4]);
    });

    it('should still call onProgress for single chunk', async () => {
      const items = createRange(5);
      const onProgress = vi.fn();

      await executeInChunks({
        items,
        chunkSize: 10,
        process: identityProcess,
        onProgress,
      });

      expect(onProgress).toHaveBeenCalledTimes(1);
      expect(onProgress).toHaveBeenCalledWith(5, 5);
    });
  });
});

// ============================================================================
// Progress Reporting Tests
// ============================================================================

describe('progress reporting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call onProgress after each chunk', async () => {
    const items = createRange(10);
    const onProgress = vi.fn();

    const resultPromise = executeInChunks({
      items,
      chunkSize: 3,
      process: identityProcess,
      onProgress,
    });

    await vi.runAllTimersAsync();
    await resultPromise;

    // 10 items / 3 chunk size = 4 chunks (3, 3, 3, 1)
    expect(onProgress).toHaveBeenCalledTimes(4);
    expect(onProgress).toHaveBeenNthCalledWith(1, 3, 10);
    expect(onProgress).toHaveBeenNthCalledWith(2, 6, 10);
    expect(onProgress).toHaveBeenNthCalledWith(3, 9, 10);
    expect(onProgress).toHaveBeenNthCalledWith(4, 10, 10);
  });

  it('should report correct progress for exact chunk divisions', async () => {
    const items = createRange(9);
    const onProgress = vi.fn();

    const resultPromise = executeInChunks({
      items,
      chunkSize: 3,
      process: identityProcess,
      onProgress,
    });

    await vi.runAllTimersAsync();
    await resultPromise;

    // 9 items / 3 chunk size = 3 chunks exactly
    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenNthCalledWith(1, 3, 9);
    expect(onProgress).toHaveBeenNthCalledWith(2, 6, 9);
    expect(onProgress).toHaveBeenNthCalledWith(3, 9, 9);
  });

  it('should work without onProgress callback', async () => {
    const items = createRange(10);

    const resultPromise = executeInChunks({
      items,
      chunkSize: 3,
      process: identityProcess,
    });

    await vi.runAllTimersAsync();
    const results = await resultPromise;

    expect(results).toHaveLength(10);
  });
});

// ============================================================================
// Delay Configuration Tests
// ============================================================================

describe('delay configuration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should use default delay of 0ms', async () => {
    const items = createRange(6);
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const resultPromise = executeInChunks({
      items,
      chunkSize: 2,
      process: identityProcess,
    });

    await vi.runAllTimersAsync();
    await resultPromise;

    // Should call setTimeout with 0 between chunks
    const delayCalls = setTimeoutSpy.mock.calls.filter(function isDelayCall(call) {
      return call[1] === 0;
    });
    expect(delayCalls.length).toBeGreaterThan(0);
  });

  it('should use custom delay between chunks', async () => {
    const items = createRange(6);
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const resultPromise = executeInChunks({
      items,
      chunkSize: 2,
      delayMs: 16,
      process: identityProcess,
    });

    await vi.runAllTimersAsync();
    await resultPromise;

    // Should call setTimeout with 16ms between chunks
    const delayCalls = setTimeoutSpy.mock.calls.filter(function isDelayCall(call) {
      return call[1] === 16;
    });
    expect(delayCalls.length).toBeGreaterThan(0);
  });

  it('should not delay after the last chunk', async () => {
    const items = createRange(4);
    let processCallCount = 0;

    const resultPromise = executeInChunks({
      items,
      chunkSize: 2,
      process: function trackProcess(chunk) {
        processCallCount++;
        return chunk;
      },
    });

    await vi.runAllTimersAsync();
    await resultPromise;

    // 2 chunks total, only 1 delay (between chunks 1 and 2)
    expect(processCallCount).toBe(2);
  });
});

// ============================================================================
// Abort Signal Tests
// ============================================================================

describe('abort signal support', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should throw immediately if signal is already aborted', async () => {
    const items = createRange(10);
    const controller = new AbortController();
    controller.abort();

    await expect(
      executeInChunks({
        items,
        chunkSize: 3,
        process: identityProcess,
        signal: controller.signal,
      }),
    ).rejects.toThrow(ChunkedExecutorAbortError);
  });

  it('should not call process if aborted before start', async () => {
    const items = createRange(10);
    const controller = new AbortController();
    controller.abort();
    const processFn = vi.fn(identityProcess);

    try {
      await executeInChunks({
        items,
        chunkSize: 3,
        process: processFn,
        signal: controller.signal,
      });
    } catch {
      // Expected
    }

    expect(processFn).not.toHaveBeenCalled();
  });

  it('should stop processing when aborted mid-execution', async () => {
    const items = createRange(10);
    const controller = new AbortController();
    let processedChunks = 0;

    const resultPromise = executeInChunks({
      items,
      chunkSize: 2,
      process: function trackAndProcess(chunk) {
        processedChunks++;
        if (processedChunks === 2) {
          controller.abort();
        }
        return chunk;
      },
      signal: controller.signal,
    });

    // Catch the error to handle the promise rejection properly
    const errorPromise = resultPromise.catch(function captureError(error) {
      return error;
    });

    await vi.runAllTimersAsync();

    const error = await errorPromise;
    expect(error).toBeInstanceOf(ChunkedExecutorAbortError);
    // Abort happens after chunk 2, so chunk 3 should not be processed
    expect(processedChunks).toBe(2);
  });

  it('should include partial results in abort error', async () => {
    const items = createRange(10);
    const controller = new AbortController();
    let processedChunks = 0;

    const resultPromise = executeInChunks({
      items,
      chunkSize: 3,
      process: function trackAndProcess(chunk) {
        processedChunks++;
        if (processedChunks === 2) {
          controller.abort();
        }
        return doubleProcess(chunk);
      },
      signal: controller.signal,
    });

    // Catch the error to handle the promise rejection properly
    const errorPromise = resultPromise.catch(function captureError(error) {
      return error;
    });

    await vi.runAllTimersAsync();

    const error = await errorPromise;
    expect(error).toBeInstanceOf(ChunkedExecutorAbortError);
    const abortError = error as ChunkedExecutorAbortError<number>;
    // Should have results from first 2 chunks (6 items)
    expect(abortError.partialResults).toHaveLength(6);
    expect(abortError.partialResults).toEqual([0, 2, 4, 6, 8, 10]);
  });

  it('should have correct error message', async () => {
    const items = createRange(10);
    const controller = new AbortController();
    controller.abort();

    try {
      await executeInChunks({
        items,
        chunkSize: 3,
        process: identityProcess,
        signal: controller.signal,
      });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ChunkedExecutorAbortError);
      const abortError = error as ChunkedExecutorAbortError<number>;
      expect(abortError.message).toBe('Chunked execution was aborted');
      expect(abortError.name).toBe('ChunkedExecutorAbortError');
    }
  });

  it('should have empty partial results when aborted before first chunk', async () => {
    const items = createRange(10);
    const controller = new AbortController();
    controller.abort();

    try {
      await executeInChunks({
        items,
        chunkSize: 3,
        process: identityProcess,
        signal: controller.signal,
      });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ChunkedExecutorAbortError);
      const abortError = error as ChunkedExecutorAbortError<number>;
      expect(abortError.partialResults).toEqual([]);
    }
  });
});

// ============================================================================
// ChunkedExecutorAbortError Tests
// ============================================================================

describe('ChunkedExecutorAbortError', () => {
  it('should be instanceof Error', () => {
    const error = new ChunkedExecutorAbortError('test', [1, 2, 3]);

    expect(error).toBeInstanceOf(Error);
  });

  it('should be instanceof ChunkedExecutorAbortError', () => {
    const error = new ChunkedExecutorAbortError('test', [1, 2, 3]);

    expect(error).toBeInstanceOf(ChunkedExecutorAbortError);
  });

  it('should preserve partial results', () => {
    const partialResults = [1, 2, 3, 4, 5];
    const error = new ChunkedExecutorAbortError('test message', partialResults);

    expect(error.partialResults).toBe(partialResults);
    expect(error.partialResults).toEqual([1, 2, 3, 4, 5]);
  });

  it('should preserve message', () => {
    const error = new ChunkedExecutorAbortError('Custom abort message', []);

    expect(error.message).toBe('Custom abort message');
  });

  it('should have correct name', () => {
    const error = new ChunkedExecutorAbortError('test', []);

    expect(error.name).toBe('ChunkedExecutorAbortError');
  });

  it('should work with typed results', () => {
    interface Result {
      id: number;
      name: string;
    }

    const partialResults: Result[] = [
      { id: 1, name: 'first' },
      { id: 2, name: 'second' },
    ];

    const error = new ChunkedExecutorAbortError<Result>('test', partialResults);

    expect(error.partialResults).toEqual(partialResults);
    expect(error.partialResults[0]!.id).toBe(1);
    expect(error.partialResults[1]!.name).toBe('second');
  });
});

// ============================================================================
// Error Propagation Tests
// ============================================================================

describe('error propagation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should propagate errors from process function', async () => {
    const items = createRange(10);
    const customError = new Error('Process failed');

    const resultPromise = executeInChunks({
      items,
      chunkSize: 3,
      process: function failingProcess() {
        throw customError;
      },
    });

    await expect(resultPromise).rejects.toThrow(customError);
  });

  it('should propagate errors from second chunk', async () => {
    const items = createRange(10);
    let chunkCount = 0;

    const resultPromise = executeInChunks({
      items,
      chunkSize: 3,
      process: function failOnSecondChunk(chunk) {
        chunkCount++;
        if (chunkCount === 2) {
          throw new Error('Second chunk failed');
        }
        return chunk;
      },
    });

    // Catch the error to handle the promise rejection properly
    const errorPromise = resultPromise.catch(function captureError(error) {
      return error;
    });

    await vi.runAllTimersAsync();

    const error = await errorPromise;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Second chunk failed');
  });

  it('should preserve error type', async () => {
    const items = createRange(10);

    class CustomError extends Error {
      constructor(
        message: string,
        public readonly code: number,
      ) {
        super(message);
        this.name = 'CustomError';
      }
    }

    const resultPromise = executeInChunks({
      items,
      chunkSize: 3,
      process: function throwCustomError() {
        throw new CustomError('Custom failure', 42);
      },
    });

    try {
      await resultPromise;
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(CustomError);
      expect((error as CustomError).code).toBe(42);
    }
  });
});

// ============================================================================
// Type Safety Tests
// ============================================================================

describe('type safety', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle different input and output types', async () => {
    interface InputItem {
      id: number;
      value: string;
    }

    interface OutputItem {
      processedId: string;
      upperValue: string;
    }

    const items: InputItem[] = [
      { id: 1, value: 'hello' },
      { id: 2, value: 'world' },
      { id: 3, value: 'test' },
    ];

    const resultPromise = executeInChunks<InputItem, OutputItem>({
      items,
      chunkSize: 2,
      process: function transformItems(chunk) {
        return chunk.map(function transform(item) {
          return {
            processedId: `ID-${item.id}`,
            upperValue: item.value.toUpperCase(),
          };
        });
      },
    });

    await vi.runAllTimersAsync();
    const results = await resultPromise;

    expect(results).toEqual([
      { processedId: 'ID-1', upperValue: 'HELLO' },
      { processedId: 'ID-2', upperValue: 'WORLD' },
      { processedId: 'ID-3', upperValue: 'TEST' },
    ]);
  });

  it('should handle void-like processing', async () => {
    const items = createRange(5);
    const sideEffects: number[] = [];

    const resultPromise = executeInChunks({
      items,
      chunkSize: 2,
      process: function sideEffectProcess(chunk) {
        sideEffects.push(...chunk);
        return chunk.map(function toUndefined() {
          return undefined;
        });
      },
    });

    await vi.runAllTimersAsync();
    const results = await resultPromise;

    expect(sideEffects).toEqual([0, 1, 2, 3, 4]);
    expect(results).toEqual([undefined, undefined, undefined, undefined, undefined]);
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe('edge cases', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle single item', async () => {
    const items = [42];

    const results = await executeInChunks({
      items,
      chunkSize: 10,
      process: doubleProcess,
    });

    expect(results).toEqual([84]);
  });

  it('should handle chunk size of 1', async () => {
    const items = createRange(3);
    const onProgress = vi.fn();

    const resultPromise = executeInChunks({
      items,
      chunkSize: 1,
      process: identityProcess,
      onProgress,
    });

    await vi.runAllTimersAsync();
    const results = await resultPromise;

    expect(results).toEqual([0, 1, 2]);
    expect(onProgress).toHaveBeenCalledTimes(3);
  });

  it('should handle very large chunk size', async () => {
    const items = createRange(5);

    const results = await executeInChunks({
      items,
      chunkSize: 1000000,
      process: identityProcess,
    });

    expect(results).toEqual([0, 1, 2, 3, 4]);
  });

  it('should handle readonly items array', async () => {
    const items: readonly number[] = Object.freeze([1, 2, 3, 4, 5]);

    const resultPromise = executeInChunks({
      items,
      chunkSize: 2,
      process: doubleProcess,
    });

    await vi.runAllTimersAsync();
    const results = await resultPromise;

    expect(results).toEqual([2, 4, 6, 8, 10]);
  });

  it('should handle items with null values', async () => {
    const items: Array<number | null> = [1, null, 3, null, 5];

    const resultPromise = executeInChunks({
      items,
      chunkSize: 2,
      process: function handleNulls(chunk) {
        return chunk.map(function double(v) {
          return v === null ? null : v * 2;
        });
      },
    });

    await vi.runAllTimersAsync();
    const results = await resultPromise;

    expect(results).toEqual([2, null, 6, null, 10]);
  });

  it('should handle process returning different sized result than chunk', async () => {
    const items = createRange(6);

    // Process that filters out odd numbers
    const resultPromise = executeInChunks({
      items,
      chunkSize: 3,
      process: function filterEven(chunk) {
        return chunk.filter(function isEven(n) {
          return n % 2 === 0;
        });
      },
    });

    await vi.runAllTimersAsync();
    const results = await resultPromise;

    // [0,1,2] -> [0,2], [3,4,5] -> [4]
    expect(results).toEqual([0, 2, 4]);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('integration scenarios', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should work for typical formula evaluation use case', async () => {
    // Simulate evaluating a formula for each row
    interface Row {
      a: number;
      b: number;
    }

    const rows: Row[] = Array.from({ length: 100 }, function createRow(_, i) {
      return { a: i, b: i * 2 };
    });

    const progressUpdates: Array<{ completed: number; total: number }> = [];

    const resultPromise = executeInChunks({
      items: rows,
      chunkSize: 30,
      process: function evaluateFormula(chunk) {
        // Simulate: @a + @b
        return chunk.map(function compute(row) {
          return row.a + row.b;
        });
      },
      onProgress: function trackProgress(completed, total) {
        progressUpdates.push({ completed, total });
      },
    });

    await vi.runAllTimersAsync();
    const results = await resultPromise;

    // Verify results
    expect(results).toHaveLength(100);
    expect(results[0]).toBe(0); // 0 + 0
    expect(results[50]).toBe(150); // 50 + 100
    expect(results[99]).toBe(297); // 99 + 198

    // Verify progress updates (100 items / 30 chunk size = 4 chunks)
    expect(progressUpdates).toHaveLength(4);
    expect(progressUpdates[0]).toEqual({ completed: 30, total: 100 });
    expect(progressUpdates[3]).toEqual({ completed: 100, total: 100 });
  });

  it('should support cancellation during long-running evaluation', async () => {
    const items = createRange(1000);
    const controller = new AbortController();
    let processed = 0;

    const resultPromise = executeInChunks({
      items,
      chunkSize: 100,
      process: function slowProcess(chunk) {
        processed += chunk.length;
        // Abort after processing 300 items
        if (processed >= 300) {
          controller.abort();
        }
        return chunk;
      },
      signal: controller.signal,
    });

    // Catch the error to handle the promise rejection properly
    const errorPromise = resultPromise.catch(function captureError(error) {
      return error;
    });

    await vi.runAllTimersAsync();

    const error = await errorPromise;
    expect(error).toBeInstanceOf(ChunkedExecutorAbortError);
    const abortError = error as ChunkedExecutorAbortError<number>;
    // Should have 3 chunks worth of results (300 items)
    expect(abortError.partialResults).toHaveLength(300);
  });

  it('should handle real-time progress updates for UI', async () => {
    const items = createRange(500);
    let lastPercentage = 0;
    const percentages: number[] = [];

    const resultPromise = executeInChunks({
      items,
      chunkSize: 100,
      process: identityProcess,
      onProgress: function updateUI(completed, total) {
        const percentage = Math.round((completed / total) * 100);
        percentages.push(percentage);
        lastPercentage = percentage;
      },
    });

    await vi.runAllTimersAsync();
    await resultPromise;

    expect(percentages).toEqual([20, 40, 60, 80, 100]);
    expect(lastPercentage).toBe(100);
  });
});
