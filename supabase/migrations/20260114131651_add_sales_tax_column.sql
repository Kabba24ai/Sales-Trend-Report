/*
  # Add sales_tax column to order_items

  1. Changes
    - Add `sales_tax` (numeric) column to `order_items` table
    - This column tracks sales tax for each order item
    - Sales tax should NOT be included in revenue calculations
  
  2. Notes
    - Default value is 0 for existing records
    - Sales formula remains: subtotal + shipping_cost + processing_fees (excluding sales_tax)
*/

-- Add sales_tax column to order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'sales_tax'
  ) THEN
    ALTER TABLE order_items ADD COLUMN sales_tax numeric(10, 2) DEFAULT 0;
  END IF;
END $$;
