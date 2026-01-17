/*
  # Add Rental Duration Fields to Order Items

  ## Overview
  Adds rental duration tracking to support accurate rental quantity calculations
  for product performance reporting. Rental businesses need to track not just
  the number of items rented, but also the duration (daily, weekend, weekly, monthly)
  to properly calculate rental usage metrics.

  ## Changes to `order_items` Table
    - `rental_type` (text) - Duration type for rental items:
      - 'daily' - Daily rental (multiplier: 1)
      - 'weekend' - Weekend rental (multiplier: 2.5)
      - 'weekly' - Weekly rental (multiplier: 7)
      - 'monthly' - Monthly rental (multiplier: 28)
      - NULL for non-rental items (retail, fees, etc.)

  ## Rental Usage Calculation Logic
  For rental performance reporting, "Quantity" must account for rental duration:
  
  **Rental Usage Quantity = Units Rented × Duration Multiplier**
  
  Examples:
    - 1 weekly rental → 1 × 7 = 7 usage units
    - 2 weekly rentals → 2 × 7 = 14 usage units
    - 1 weekend rental → 1 × 2.5 = 2.5 usage units
    - 1 monthly rental → 1 × 28 = 28 usage units

  ## Notes
    - This field is only populated for rental items (item_type = 'rental')
    - Retail items and fees will have NULL rental_type
    - This migration is idempotent and safe to run multiple times
*/

-- Add rental_type to order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'rental_type'
  ) THEN
    ALTER TABLE order_items ADD COLUMN rental_type text;
  END IF;
END $$;

-- Create index on rental_type for performance
CREATE INDEX IF NOT EXISTS idx_order_items_rental_type ON order_items(rental_type);

-- Add a check constraint to ensure valid rental_type values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'order_items' AND constraint_name = 'order_items_rental_type_check'
  ) THEN
    ALTER TABLE order_items ADD CONSTRAINT order_items_rental_type_check
      CHECK (rental_type IS NULL OR rental_type IN ('daily', 'weekend', 'weekly', 'monthly'));
  END IF;
END $$;