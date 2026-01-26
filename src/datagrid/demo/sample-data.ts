/**
 * Sample data generator for the DataGrid demo.
 *
 * Provides realistic product data for demonstrating formula columns
 * in the DataGrid integration.
 *
 * @module
 */

import type { GridColDef } from '@mui/x-data-grid';

/**
 * Product row data interface.
 *
 * Represents a single product with its attributes.
 */
export interface ProductRow {
  /**
   * Unique identifier for the row.
   */
  readonly id: number;

  /**
   * Product name.
   */
  readonly name: string;

  /**
   * Product category.
   */
  readonly category: string;

  /**
   * Unit price in dollars.
   */
  readonly price: number;

  /**
   * Quantity in stock or ordered.
   */
  readonly quantity: number;

  /**
   * Tax rate as a decimal (e.g., 0.08 for 8%).
   */
  readonly taxRate: number;

  /**
   * Whether the product is currently in stock.
   */
  readonly inStock: boolean;
}

/**
 * Sample product names by category.
 */
const PRODUCT_NAMES: Record<string, readonly string[]> = {
  Electronics: [
    'Wireless Mouse',
    'USB Keyboard',
    'Monitor Stand',
    'Webcam HD',
    'USB Hub',
    'Laptop Stand',
    'Bluetooth Speaker',
    'Headphones',
    'Power Bank',
    'Wireless Charger',
  ],
  Furniture: [
    'Office Chair',
    'Standing Desk',
    'Bookshelf',
    'Filing Cabinet',
    'Desk Lamp',
    'Monitor Arm',
    'Drawer Unit',
    'Footrest',
    'Whiteboard',
    'Cork Board',
  ],
  Supplies: [
    'Notebook Pack',
    'Pen Set',
    'Sticky Notes',
    'Paper Clips',
    'Stapler',
    'Scissors',
    'Tape Dispenser',
    'Folders',
    'Binder Clips',
    'Highlighters',
  ],
  Software: [
    'Antivirus Annual',
    'Office Suite',
    'Cloud Storage',
    'VPN Service',
    'Password Manager',
    'Backup Solution',
    'Project Tool',
    'Design Software',
    'Video Editor',
    'Photo Editor',
  ],
};

/**
 * Product categories.
 */
const CATEGORIES = Object.keys(PRODUCT_NAMES);

/**
 * Price ranges by category (min, max).
 */
const PRICE_RANGES: Record<string, readonly [number, number]> = {
  Electronics: [15, 200],
  Furniture: [50, 500],
  Supplies: [2, 30],
  Software: [10, 150],
};

/**
 * Tax rates to use (simulating different regions/types).
 */
const TAX_RATES = [0.0, 0.05, 0.08, 0.1, 0.12, 0.15, 0.2];

/**
 * Generates a random integer between min and max (inclusive).
 *
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Random integer in range
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random float between min and max with 2 decimal places.
 *
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Random float with 2 decimal places
 */
function randomFloat(min: number, max: number): number {
  const value = Math.random() * (max - min) + min;
  return Math.round(value * 100) / 100;
}

/**
 * Picks a random element from an array.
 *
 * @param array - Array to pick from
 * @returns Random element
 */
function pickRandom<T>(array: readonly T[]): T {
  const index = Math.floor(Math.random() * array.length);
  const element = array[index];
  if (element === undefined) {
    throw new Error('Array is empty');
  }
  return element;
}

/**
 * Generates a single product row with realistic data.
 *
 * @param id - The row ID
 * @returns A ProductRow with random but realistic values
 */
function generateSingleProduct(id: number): ProductRow {
  const category = pickRandom(CATEGORIES);
  const categoryProducts = PRODUCT_NAMES[category];
  const priceRange = PRICE_RANGES[category];

  if (categoryProducts === undefined || priceRange === undefined) {
    throw new Error(`Invalid category: ${category}`);
  }

  const name = pickRandom(categoryProducts);
  const price = randomFloat(priceRange[0], priceRange[1]);
  const quantity = randomInt(1, 50);
  const taxRate = pickRandom(TAX_RATES);
  const inStock = Math.random() > 0.15; // 85% chance of being in stock

  return {
    id,
    name,
    category,
    price,
    quantity,
    taxRate,
    inStock,
  };
}

/**
 * Generates sample product data for the demo.
 *
 * @param count - Number of products to generate
 * @returns Array of ProductRow objects
 *
 * @example
 * ```typescript
 * // Generate 100 sample products
 * const products = generateSampleProducts(100);
 *
 * // Generate a large dataset for performance testing
 * const largeDataset = generateSampleProducts(10000);
 * ```
 */
export function generateSampleProducts(count: number): ProductRow[] {
  const products: ProductRow[] = [];

  for (let i = 0; i < count; i++) {
    products.push(generateSingleProduct(i + 1));
  }

  return products;
}

/**
 * Column definitions for the sample product data.
 *
 * These columns can be used with MUI DataGrid to display the product data.
 */
export const SAMPLE_COLUMNS: GridColDef[] = [
  {
    field: 'id',
    headerName: 'ID',
    width: 70,
    type: 'number',
  },
  {
    field: 'name',
    headerName: 'Product Name',
    width: 180,
    type: 'string',
  },
  {
    field: 'category',
    headerName: 'Category',
    width: 120,
    type: 'singleSelect',
    valueOptions: CATEGORIES,
  },
  {
    field: 'price',
    headerName: 'Price ($)',
    width: 100,
    type: 'number',
    valueFormatter: function formatPrice(value: number): string {
      if (value === null || value === undefined) {
        return '';
      }
      return `$${value.toFixed(2)}`;
    },
  },
  {
    field: 'quantity',
    headerName: 'Quantity',
    width: 90,
    type: 'number',
  },
  {
    field: 'taxRate',
    headerName: 'Tax Rate',
    width: 100,
    type: 'number',
    valueFormatter: function formatTaxRate(value: number): string {
      if (value === null || value === undefined) {
        return '';
      }
      return `${(value * 100).toFixed(0)}%`;
    },
  },
  {
    field: 'inStock',
    headerName: 'In Stock',
    width: 90,
    type: 'boolean',
  },
];

/**
 * Pre-generated sample products for consistent demo data.
 *
 * Use this for stories that need consistent data across renders.
 */
export const SAMPLE_PRODUCTS_100 = generateSampleProducts(100);

/**
 * Pre-generated large dataset for performance testing.
 *
 * Use this for testing progress overlay and cancellation.
 */
export const SAMPLE_PRODUCTS_10000 = generateSampleProducts(10000);
