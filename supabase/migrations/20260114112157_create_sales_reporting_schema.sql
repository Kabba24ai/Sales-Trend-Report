/*
  # Sales Reporting Schema for Kabba

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text) - Category name (e.g., Tables, Tents, Inflatables)
      - `created_at` (timestamptz)
    
    - `products`
      - `id` (uuid, primary key)
      - `category_id` (uuid, foreign key to categories)
      - `name` (text) - Product name
      - `price` (numeric) - Base rental price
      - `created_at` (timestamptz)
    
    - `orders`
      - `id` (uuid, primary key)
      - `order_number` (text, unique) - Human-readable order number
      - `customer_name` (text)
      - `payment_status` (text) - PAID, PENDING, FAILED, CANCELLED
      - `payment_method` (text) - credit_card, COD, account
      - `payment_date` (timestamptz) - When payment was received
      - `created_at` (timestamptz)
    
    - `order_items`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key to orders)
      - `product_id` (uuid, foreign key to products, nullable)
      - `category_id` (uuid, foreign key to categories)
      - `item_type` (text) - product, damage_waiver, thrown_track_insurance
      - `quantity` (integer)
      - `subtotal` (numeric) - Product price excluding tax
      - `shipping_cost` (numeric, default 0)
      - `processing_fees` (numeric, default 0)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read data
    - Public access for reading (as this is a business reporting tool)

  3. Indexes
    - Index on payment_date for fast date range queries
    - Index on payment_status for filtering paid orders
    - Index on category_id and product_id for filtering
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  price numeric(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  payment_status text NOT NULL DEFAULT 'PENDING',
  payment_method text,
  payment_date timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  item_type text NOT NULL DEFAULT 'product',
  quantity integer NOT NULL DEFAULT 1,
  subtotal numeric(10, 2) NOT NULL DEFAULT 0,
  shipping_cost numeric(10, 2) DEFAULT 0,
  processing_fees numeric(10, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_payment_date ON orders(payment_date);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_order_items_category ON order_items(category_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_type ON order_items(item_type);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (business reporting tool)
-- In production, you'd want to restrict this to authenticated users

CREATE POLICY "Allow public read access to categories"
  ON categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to products"
  ON products FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to orders"
  ON orders FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to order_items"
  ON order_items FOR SELECT
  TO anon, authenticated
  USING (true);

-- Insert sample categories
INSERT INTO categories (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Tables'),
  ('22222222-2222-2222-2222-222222222222', 'Tents'),
  ('33333333-3333-3333-3333-333333333333', 'Inflatables'),
  ('44444444-4444-4444-4444-444444444444', 'Chairs'),
  ('55555555-5555-5555-5555-555555555555', 'Linens')
ON CONFLICT (id) DO NOTHING;

-- Insert sample products
INSERT INTO products (id, category_id, name, price) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '6ft Banquet Table', 12.00),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '8ft Banquet Table', 15.00),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', '20x20 Frame Tent', 350.00),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', '30x30 Frame Tent', 750.00),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33333333-3333-3333-3333-333333333333', 'Bounce House', 200.00),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '33333333-3333-3333-3333-333333333333', 'Water Slide', 300.00),
  ('10000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'Folding Chair', 2.50),
  ('10000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', 'White Tablecloth', 8.00)
ON CONFLICT (id) DO NOTHING;