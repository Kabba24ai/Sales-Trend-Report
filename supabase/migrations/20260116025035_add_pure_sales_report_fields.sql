/*
  # Add Pure Sales Report Fields

  ## Overview
  Adds necessary fields to support comprehensive Pure Sales Report functionality including
  discounts, refunds, payment details, and revenue type tracking.

  ## Changes to `order_items` Table
    - `discount_amount` (numeric) - Manual discount amount applied to this item (default 0)
    - `gross_sales` (numeric) - Original price before discounts (default 0)

  ## Changes to `orders` Table
    - `refund_type` (text) - Type of refund: 'full' or 'partial' (nullable)
    - `refund_reason` (text) - Reason for refund (nullable)
    - `gross_amount` (numeric) - Total before discounts (default 0)
    - `discount_amount` (numeric) - Total discount on order (default 0)
    - `net_amount` (numeric) - Total after discounts (default 0)

  ## Item Types for Revenue Breakdown
  The system already supports item_type in order_items:
    - 'rental' - Rental revenue
    - 'retail' - Retail product sales
    - 'delivery' - Delivery revenue
    - 'damage_waiver' - Damage waiver revenue
    - 'thrown_track_insurance' - Track insurance revenue
    - 'prepaid_fuel' - Prepaid fuel revenue
    - 'prepaid_cleaning' - Prepaid cleaning revenue
    - 'fees' - Fees/other revenue

  ## Payment Methods
  The system already supports payment_method in orders:
    - 'cash'
    - 'credit_card'
    - 'debit_card'
    - 'ach'
    - 'check'
    - 'account'
    - 'zelle'
    - 'apple_pay'
    - 'venmo'
    - 'cash_app'

  ## Notes
    - All numeric fields default to 0 for data integrity
    - Refund fields are nullable as they only apply to refunded orders
    - This migration is idempotent and safe to run multiple times
*/

-- Add discount_amount to order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE order_items ADD COLUMN discount_amount numeric(10, 2) DEFAULT 0;
  END IF;
END $$;

-- Add gross_sales to order_items (price before discount)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'gross_sales'
  ) THEN
    ALTER TABLE order_items ADD COLUMN gross_sales numeric(10, 2) DEFAULT 0;
  END IF;
END $$;

-- Add refund fields to orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'refund_type'
  ) THEN
    ALTER TABLE orders ADD COLUMN refund_type text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'refund_reason'
  ) THEN
    ALTER TABLE orders ADD COLUMN refund_reason text;
  END IF;
END $$;

-- Add order total fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'gross_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN gross_amount numeric(10, 2) DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN discount_amount numeric(10, 2) DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'net_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN net_amount numeric(10, 2) DEFAULT 0;
  END IF;
END $$;

-- Create index on refund_type for performance
CREATE INDEX IF NOT EXISTS idx_orders_refund_type ON orders(refund_type);

-- Create index on item_type for revenue breakdown queries
CREATE INDEX IF NOT EXISTS idx_order_items_item_type ON order_items(item_type);
