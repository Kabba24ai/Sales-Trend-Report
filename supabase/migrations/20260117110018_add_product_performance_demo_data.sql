/*
  # Add Product Performance Demo Data

  ## Overview
  Creates sample orders with both rental and retail products to demonstrate
  the Product Performance reporting features. Includes various rental durations
  and retail transactions to showcase the normalized rental usage calculations.

  ## Demo Data Includes
    - Rental orders with daily, weekend, weekly, and monthly durations
    - Retail product orders
    - Mix of PAID and REFUNDED orders
    - Various quantities and price points
    - Multiple products to show top/bottom performers

  ## Notes
    - Uses existing product IDs from initial migration
    - Data spans recent dates for relevant reporting
    - Includes variety to populate all report sections
*/

-- Insert demo orders for rental products
INSERT INTO orders (id, order_number, customer_name, payment_status, payment_method, payment_date, created_at) VALUES
  ('a0000001-0001-0001-0001-000000000001', 'RENT-2024-001', 'Alice Johnson', 'PAID', 'credit_card', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  ('a0000001-0001-0001-0001-000000000002', 'RENT-2024-002', 'Bob Smith', 'PAID', 'credit_card', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
  ('a0000001-0001-0001-0001-000000000003', 'RENT-2024-003', 'Carol White', 'PAID', 'ach', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
  ('a0000001-0001-0001-0001-000000000004', 'RENT-2024-004', 'David Brown', 'PAID', 'credit_card', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
  ('a0000001-0001-0001-0001-000000000005', 'RENT-2024-005', 'Emma Davis', 'PAID', 'credit_card', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
  ('a0000001-0001-0001-0001-000000000006', 'RENT-2024-006', 'Frank Miller', 'REFUNDED', 'credit_card', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- Insert rental order items with various rental types
INSERT INTO order_items (id, order_id, product_id, category_id, item_type, rental_type, quantity, subtotal, gross_sales, sales_tax, created_at) VALUES
  -- Weekly tent rentals (popular)
  ('b0000001-0001-0001-0001-000000000001', 'a0000001-0001-0001-0001-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'rental', 'weekly', 2, 700.00, 700.00, 56.00, NOW() - INTERVAL '5 days'),
  ('b0000001-0001-0001-0001-000000000002', 'a0000001-0001-0001-0001-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'rental', 'weekly', 1, 350.00, 350.00, 28.00, NOW() - INTERVAL '10 days'),
  ('b0000001-0001-0001-0001-000000000003', 'a0000001-0001-0001-0001-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'rental', 'weekend', 1, 350.00, 350.00, 28.00, NOW() - INTERVAL '15 days'),
  
  -- Monthly tent rental (high usage)
  ('b0000001-0001-0001-0001-000000000004', 'a0000001-0001-0001-0001-000000000004', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'rental', 'monthly', 1, 2500.00, 2500.00, 200.00, NOW() - INTERVAL '20 days'),
  
  -- Bounce house rentals (various durations)
  ('b0000001-0001-0001-0001-000000000005', 'a0000001-0001-0001-0001-000000000005', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33333333-3333-3333-3333-333333333333', 'rental', 'daily', 3, 600.00, 600.00, 48.00, NOW() - INTERVAL '25 days'),
  ('b0000001-0001-0001-0001-000000000006', 'a0000001-0001-0001-0001-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33333333-3333-3333-3333-333333333333', 'rental', 'weekend', 1, 200.00, 200.00, 16.00, NOW() - INTERVAL '5 days'),
  
  -- Water slide rental (refunded)
  ('b0000001-0001-0001-0001-000000000007', 'a0000001-0001-0001-0001-000000000006', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '33333333-3333-3333-3333-333333333333', 'rental', 'weekend', 1, 300.00, 300.00, 24.00, NOW() - INTERVAL '8 days'),
  
  -- Table rentals (low quantity items)
  ('b0000001-0001-0001-0001-000000000008', 'a0000001-0001-0001-0001-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'rental', 'daily', 5, 60.00, 60.00, 4.80, NOW() - INTERVAL '10 days'),
  ('b0000001-0001-0001-0001-000000000009', 'a0000001-0001-0001-0001-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'rental', 'weekend', 2, 30.00, 30.00, 2.40, NOW() - INTERVAL '15 days')
ON CONFLICT (id) DO NOTHING;

-- Insert demo orders for retail products
INSERT INTO orders (id, order_number, customer_name, payment_status, payment_method, payment_date, created_at) VALUES
  ('c0000001-0001-0001-0001-000000000001', 'SALE-2024-001', 'Grace Lee', 'PAID', 'credit_card', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  ('c0000001-0001-0001-0001-000000000002', 'SALE-2024-002', 'Henry Wilson', 'PAID', 'cash', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
  ('c0000001-0001-0001-0001-000000000003', 'SALE-2024-003', 'Iris Martinez', 'PAID', 'credit_card', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),
  ('c0000001-0001-0001-0001-000000000004', 'SALE-2024-004', 'Jack Anderson', 'PAID', 'credit_card', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),
  ('c0000001-0001-0001-0001-000000000005', 'SALE-2024-005', 'Kate Taylor', 'REFUNDED', 'credit_card', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days')
ON CONFLICT (id) DO NOTHING;

-- Insert retail order items (no rental_type for retail)
INSERT INTO order_items (id, order_id, product_id, category_id, item_type, rental_type, quantity, subtotal, gross_sales, shipping_cost, sales_tax, created_at) VALUES
  -- Folding chairs (high volume retail item)
  ('d0000001-0001-0001-0001-000000000001', 'c0000001-0001-0001-0001-000000000001', '10000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'retail', NULL, 50, 125.00, 125.00, 15.00, 10.00, NOW() - INTERVAL '3 days'),
  ('d0000001-0001-0001-0001-000000000002', 'c0000001-0001-0001-0001-000000000002', '10000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'retail', NULL, 30, 75.00, 75.00, 10.00, 6.00, NOW() - INTERVAL '7 days'),
  ('d0000001-0001-0001-0001-000000000003', 'c0000001-0001-0001-0001-000000000003', '10000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'retail', NULL, 20, 50.00, 50.00, 8.00, 4.00, NOW() - INTERVAL '12 days'),
  
  -- Tablecloths (medium volume)
  ('d0000001-0001-0001-0001-000000000004', 'c0000001-0001-0001-0001-000000000001', '10000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', 'retail', NULL, 15, 120.00, 120.00, 12.00, 9.60, NOW() - INTERVAL '3 days'),
  ('d0000001-0001-0001-0001-000000000005', 'c0000001-0001-0001-0001-000000000004', '10000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', 'retail', NULL, 10, 80.00, 80.00, 8.00, 6.40, NOW() - INTERVAL '18 days'),
  
  -- Tables (lower volume, higher price)
  ('d0000001-0001-0001-0001-000000000006', 'c0000001-0001-0001-0001-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'retail', NULL, 3, 36.00, 36.00, 25.00, 2.88, NOW() - INTERVAL '7 days'),
  ('d0000001-0001-0001-0001-000000000007', 'c0000001-0001-0001-0001-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'retail', NULL, 2, 30.00, 30.00, 20.00, 2.40, NOW() - INTERVAL '12 days'),
  
  -- Refunded retail order
  ('d0000001-0001-0001-0001-000000000008', 'c0000001-0001-0001-0001-000000000005', '10000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'retail', NULL, 10, 25.00, 25.00, 5.00, 2.00, NOW() - INTERVAL '6 days')
ON CONFLICT (id) DO NOTHING;