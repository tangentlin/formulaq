/**
 * Sample data generator for the FormulaShowcase component.
 *
 * Provides realistic product data for demonstrating formula columns
 * with editable price and taxRate fields.
 *
 * @module
 */

import type { GridColDef } from '@mui/x-data-grid';
import type { ShowcaseProductRow } from './formula-showcase.types.ts';

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
  Services: [
    'Tech Support',
    'Cloud Hosting',
    'Data Backup',
    'Security Audit',
    'Training Session',
    'Consulting Hour',
    'Maintenance Plan',
    'Support Ticket',
    'Installation',
    'Configuration',
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
  Services: [25, 300],
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
 * @returns A ShowcaseProductRow with random but realistic values
 */
function generateSingleProduct(id: number): ShowcaseProductRow {
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
 * Generates sample product data for the showcase.
 *
 * @param count - Number of products to generate
 * @returns Array of ShowcaseProductRow objects
 *
 * @example
 * ```typescript
 * // Generate 50 sample products
 * const products = generateShowcaseProducts(50);
 * ```
 */
export function generateShowcaseProducts(count: number): ShowcaseProductRow[] {
  const products: ShowcaseProductRow[] = [];

  for (let i = 0; i < count; i++) {
    products.push(generateSingleProduct(i + 1));
  }

  return products;
}

/**
 * Column definitions for the showcase product data.
 *
 * Note: price and taxRate columns are editable.
 */
export const SHOWCASE_COLUMNS: GridColDef[] = [
  {
    field: 'id',
    headerName: 'ID',
    width: 70,
    type: 'number',
    editable: false,
  },
  {
    field: 'name',
    headerName: 'Product Name',
    width: 180,
    type: 'string',
    editable: false,
  },
  {
    field: 'category',
    headerName: 'Category',
    width: 120,
    type: 'singleSelect',
    valueOptions: CATEGORIES,
    editable: false,
  },
  {
    field: 'price',
    headerName: 'Price ($)',
    width: 100,
    type: 'number',
    editable: true,
    valueFormatter: function formatPrice(value: number): string {
      if (value === null || value === undefined) {
        return '';
      }
      return `$${value.toFixed(2)}`;
    },
  },
  {
    field: 'taxRate',
    headerName: 'Tax Rate',
    width: 100,
    type: 'number',
    editable: true,
    valueFormatter: function formatTaxRate(value: number): string {
      if (value === null || value === undefined) {
        return '';
      }
      return `${(value * 100).toFixed(0)}%`;
    },
  },
  {
    field: 'quantity',
    headerName: 'Quantity',
    width: 90,
    type: 'number',
    editable: false,
  },
  {
    field: 'inStock',
    headerName: 'In Stock',
    width: 90,
    type: 'boolean',
    editable: false,
  },
];

/**
 * Pre-generated sample products for consistent showcase data.
 */
export const SHOWCASE_PRODUCTS_50 = generateShowcaseProducts(50);
