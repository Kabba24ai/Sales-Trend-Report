/*
  # Add More Demo Products for Top 10 Report

  ## Overview
  Adds 4 additional products with corresponding orders to ensure the Product Performance
  report displays a full "Top 10" list in all views.

  ## New Products Added
    1. 10x10 Pop-up Tent (Camping/Tents category) - rental item
    2. Cocktail Table (Furniture/Tables category) - rental item
    3. Chair Covers (Linens category) - retail item
    4. LED Uplighting (Inflatables/Party Equipment category) - rental item

  ## Demo Data Includes
    - 4 new products across different categories
    - Orders with both rental and retail transactions
    - Various quantities and price points
    - Mix of rental types (daily, weekend, weekly)

  ## Notes
    - Ensures Product Performance report shows full Top 10
    - Maintains variety in product types and categories
*/

-- Add 4 new products
INSERT INTO products (id, category_id, name, price, created_at) VALUES
  ('e0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '10x10 Pop-up Tent', 40.00, NOW()),
  ('e0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Cocktail Table', 25.00, NOW()),
  ('e0000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', 'Chair Covers', 3.00, NOW()),
  ('e0000000-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333', 'LED Uplighting', 40.00, NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert new orders for rental products
INSERT INTO orders (id, order_number, customer_name, payment_status, payment_method, payment_date, created_at) VALUES
  ('e0000001-0001-0001-0001-000000000001', 'RENT-2024-007', 'Laura Thompson', 'PAID', 'credit_card', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
  ('e0000001-0001-0001-0001-000000000002', 'RENT-2024-008', 'Mike Roberts', 'PAID', 'ach', NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days'),
  ('e0000001-0001-0001-0001-000000000003', 'RENT-2024-009', 'Nina Garcia', 'PAID', 'credit_card', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days')
ON CONFLICT (id) DO NOTHING;

-- Insert rental order items for new products
INSERT INTO order_items (id, order_id, product_id, category_id, item_type, rental_type, quantity, subtotal, gross_sales, sales_tax, created_at) VALUES
  -- Pop-up tents (various rental types)
  ('e1000001-0001-0001-0001-000000000001', 'e0000001-0001-0001-0001-000000000001', 'e0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'rental', 'daily', 4, 160.00, 160.00, 12.80, NOW() - INTERVAL '4 days'),
  ('e1000001-0001-0001-0001-000000000002', 'e0000001-0001-0001-0001-000000000002', 'e0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'rental', 'weekend', 2, 80.00, 80.00, 6.40, NOW() - INTERVAL '9 days'),
  ('e1000001-0001-0001-0001-000000000003', 'e0000001-0001-0001-0001-000000000003', 'e0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'rental', 'weekly', 1, 40.00, 40.00, 3.20, NOW() - INTERVAL '14 days'),
  
  -- Cocktail tables
  ('e1000001-0001-0001-0001-000000000004', 'e0000001-0001-0001-0001-000000000001', 'e0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'rental', 'weekend', 6, 150.00, 150.00, 12.00, NOW() - INTERVAL '4 days'),
  ('e1000001-0001-0001-0001-000000000005', 'e0000001-0001-0001-0001-000000000002', 'e0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'rental', 'daily', 4, 100.00, 100.00, 8.00, NOW() - INTERVAL '9 days'),
  
  -- LED Uplighting
  ('e1000001-0001-0001-0001-000000000006', 'e0000001-0001-0001-0001-000000000001', 'e0000000-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333', 'rental', 'weekend', 8, 320.00, 320.00, 25.60, NOW() - INTERVAL '4 days'),
  ('e1000001-0001-0001-0001-000000000007', 'e0000001-0001-0001-0001-000000000003', 'e0000000-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333', 'rental', 'daily', 6, 240.00, 240.00, 19.20, NOW() - INTERVAL '14 days')
ON CONFLICT (id) DO NOTHING;

-- Insert new orders for retail products
INSERT INTO orders (id, order_number, customer_name, payment_status, payment_method, payment_date, created_at) VALUES
  ('f0000001-0001-0001-0001-000000000001', 'SALE-2024-006', 'Oscar Chen', 'PAID', 'credit_card', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  ('f0000001-0001-0001-0001-000000000002', 'SALE-2024-007', 'Patricia Moore', 'PAID', 'credit_card', NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days'),
  ('f0000001-0001-0001-0001-000000000003', 'SALE-2024-008', 'Quincy Walker', 'PAID', 'cash', NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days')
ON CONFLICT (id) DO NOTHING;

-- Insert retail order items for new products
INSERT INTO order_items (id, order_id, product_id, category_id, item_type, rental_type, quantity, subtotal, gross_sales, shipping_cost, sales_tax, created_at) VALUES
  -- Chair covers (high volume retail)
  ('f1000001-0001-0001-0001-000000000001', 'f0000001-0001-0001-0001-000000000001', 'e0000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', 'retail', NULL, 40, 120.00, 120.00, 10.00, 9.60, NOW() - INTERVAL '5 days'),
  ('f1000001-0001-0001-0001-000000000002', 'f0000001-0001-0001-0001-000000000002', 'e0000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', 'retail', NULL, 25, 75.00, 75.00, 8.00, 6.00, NOW() - INTERVAL '11 days'),
  
  -- Pop-up tents (retail)
  ('f1000001-0001-0001-0001-000000000003', 'f0000001-0001-0001-0001-000000000001', 'e0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'retail', NULL, 5, 200.00, 200.00, 15.00, 16.00, NOW() - INTERVAL '5 days'),
  ('f1000001-0001-0001-0001-000000000004', 'f0000001-0001-0001-0001-000000000003', 'e0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'retail', NULL, 3, 120.00, 120.00, 12.00, 9.60, NOW() - INTERVAL '16 days'),
  
  -- Cocktail tables (retail)
  ('f1000001-0001-0001-0001-000000000005', 'f0000001-0001-0001-0001-000000000002', 'e0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'retail', NULL, 2, 50.00, 50.00, 20.00, 4.00, NOW() - INTERVAL '11 days'),
  
  -- LED Uplighting (retail)
  ('f1000001-0001-0001-0001-000000000006', 'f0000001-0001-0001-0001-000000000003', 'e0000000-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333', 'retail', NULL, 4, 160.00, 160.00, 18.00, 12.80, NOW() - INTERVAL '16 days')
ON CONFLICT (id) DO NOTHING;