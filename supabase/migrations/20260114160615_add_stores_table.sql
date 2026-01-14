/*
  # Add Stores Table and Link to Orders

  1. New Tables
    - `stores`
      - `id` (uuid, primary key)
      - `name` (text) - Store name (e.g., "Bon Aqua", "Waverly")
      - `created_at` (timestamptz)

  2. Changes
    - Add `store_id` column to `orders` table (nullable, references stores.id)
    - Insert default stores: "Bon Aqua" and "Waverly"

  3. Security
    - Enable RLS on `stores` table
    - Add policy for anyone to read stores (public data)
*/

-- Create stores table
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read stores (they're public reference data)
CREATE POLICY "Anyone can read stores"
  ON stores
  FOR SELECT
  USING (true);

-- Add store_id to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN store_id uuid REFERENCES stores(id);
  END IF;
END $$;

-- Insert default stores
INSERT INTO stores (name) VALUES ('Bon Aqua'), ('Waverly')
ON CONFLICT DO NOTHING;