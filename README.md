# Sales Trend Analysis Dashboard - Technical Documentation

## Overview

This is a full-stack React-based sales analytics dashboard with comprehensive period-over-period comparisons, store filtering, and advanced revenue analysis. The application uses Supabase as the backend database and authentication provider.

## Table of Contents

1. [Architecture](#architecture)
2. [Environment Setup](#environment-setup)
3. [Database Schema](#database-schema)
4. [Business Rules](#business-rules)
5. [API Functions](#api-functions)
6. [Store Configuration](#store-configuration)
7. [Filter System](#filter-system)
8. [Frontend Implementation](#frontend-implementation)
9. [Testing Guidelines](#testing-guidelines)

---

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS 3
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (ready for future implementation)
- **Charts**: Recharts
- **Icons**: Lucide React

### Data Flow
```
React Frontend → Supabase Client Library → PostgreSQL Database → Real-time Updates → Chart Visualization
```

### Key Features
- Rolling 30-day sales comparison
- 7-day sales comparison (labeled as "Current Month")
- Last complete month comparison
- Top 10 products analysis
- Top 5 categories analysis
- Multi-store filtering (Bon Aqua, Waverly)
- Advanced filter combinations
- Real-time data updates
- Responsive design

---

## Environment Setup

### Prerequisites
- Node.js 18+ and npm
- Supabase account (database already provisioned)
- Git

### Installation Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd <project-directory>
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Variables**

The project uses Supabase for database operations. Environment variables are stored in `.env`:

```env
VITE_SUPABASE_URL=<your-supabase-project-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

**Important**: These values are already configured in the project. DO NOT modify unless switching to a different Supabase instance.

4. **Start Development Server**
```bash
npm run dev
```

5. **Build for Production**
```bash
npm run build
```

---

## Database Schema

### Database: Supabase PostgreSQL

The application uses Supabase (PostgreSQL) with Row Level Security (RLS) enabled on all tables. Three migrations have been applied:

1. `20260114112157_create_sales_reporting_schema.sql` - Initial schema
2. `20260114131651_add_sales_tax_column.sql` - Added sales tax tracking
3. `20260114160615_add_stores_table.sql` - Added multi-store support

### Tables Overview

#### 1. `stores` Table
Stores information for multi-location filtering.

```sql
CREATE TABLE stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

**Default Stores:**
- Bon Aqua
- Waverly

**RLS Policy:** Anyone can read stores (public reference data)

#### 2. `categories` Table
Product categories for organizing inventory.

```sql
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

**RLS Policy:** Anyone can read categories

#### 3. `products` Table
Product catalog with category relationships.

```sql
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id),
  name text NOT NULL,
  price numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

**RLS Policy:** Anyone can read products

#### 4. `orders` Table
Order header information including payment status and store location.

```sql
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  payment_status text DEFAULT 'PENDING',
  payment_method text,
  payment_date timestamptz,
  sales_tax numeric DEFAULT 0,
  store_id uuid REFERENCES stores(id),
  created_at timestamptz DEFAULT now()
);
```

**Key Fields:**
- `payment_status`: PENDING, PAID, REFUNDED, FAILED
- `payment_date`: Must be NOT NULL for sales calculations
- `sales_tax`: Excluded from all revenue calculations
- `store_id`: Links order to specific store location

**RLS Policy:** Anyone can read orders

#### 5. `order_items` Table
Line items for each order with detailed revenue breakdown.

```sql
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) NOT NULL,
  product_id uuid REFERENCES products(id),
  category_id uuid REFERENCES categories(id),
  item_type text DEFAULT 'product',
  quantity integer DEFAULT 1,
  subtotal numeric DEFAULT 0,
  shipping_cost numeric DEFAULT 0,
  processing_fees numeric DEFAULT 0,
  sales_tax numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

**Item Types:**
- `rental`: Rental items
- `retail`: Retail/purchase items
- `damage_waiver`: Damage protection fees
- `thrown_track_insurance`: Insurance products
- `delivery`: Delivery/shipping fees

**Revenue Formula:**
```
revenue = subtotal + shipping_cost + processing_fees
(sales_tax is ALWAYS excluded)
```

**RLS Policy:** Anyone can read order items

### Database Connection

The application connects to Supabase using the `@supabase/supabase-js` client library:

**File:** `src/lib/supabase.ts`
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Migrations Location
All database migrations are stored in: `supabase/migrations/`

---

## Business Rules

### Critical Revenue Calculation Rules

#### Rule #1: PAID Orders and Refunds
- **PAID** orders with `payment_status = 'PAID'` are **ADDED** to sales totals
- **REFUNDED** orders with `payment_status = 'REFUNDED'` are **SUBTRACTED** from sales totals
- Orders with status `PENDING` or `FAILED` are **EXCLUDED** from all calculations
- `payment_date` must NOT be NULL for orders to be included

#### Rule #2: Sales Tax is EXCLUDED
- Sales tax is **NEVER** included in any revenue calculations
- The `sales_tax` column in the `orders` table is ignored for reporting
- All totals represent pre-tax revenue

#### Rule #3: Revenue Formula
```
For PAID orders:
Revenue Per Order Item = +(subtotal + shipping_cost + processing_fees)

For REFUNDED orders:
Revenue Per Order Item = -(subtotal + shipping_cost + processing_fees)
```

**Components:**
- `subtotal`: Base price of the item(s)
- `shipping_cost`: Shipping charges (can be excluded via filter)
- `processing_fees`: Payment processing fees
- **NO sales_tax**

**Note:** Refunded orders appear as negative values in the calculations, effectively reducing the net sales totals.

#### Rule #4: Filter Logic

**Store Filter**:
- `all`: Include all stores (default)
- `<store_id>`: Filter by specific store (Bon Aqua or Waverly)

**Item Type Filters** (Mutually Exclusive):
- `all`: Include all item types (default)
- `rental`: Only items where `item_type = 'rental'`
- `retail`: Only items where `item_type = 'retail'`

**Special Type Filters** (Can be combined with exclude filters):
- `excludeWaiver`: Exclude items where `item_type = 'damage_waiver'`
- `waiverOnly`: ONLY items where `item_type = 'damage_waiver'`
- `excludeInsurance`: Exclude items where `item_type = 'thrown_track_insurance'`
- `insuranceOnly`: ONLY items where `item_type = 'thrown_track_insurance'`
- `excludeDelivery`: Exclude items where `item_type = 'delivery'`
- `deliveryOnly`: ONLY items where `item_type = 'delivery'`
- `excludeShipping`: Set `shipping_cost = 0` in calculation (don't exclude rows)

**Category & Product Filters**:
- `category`: Filter by `category_id` (if not 'all')
- `product`: Filter by `product_id` (if not 'all', requires category selection first)

**Filter Combination Rules:**
- Exclude filters can be combined together (e.g., exclude waiver + exclude insurance)
- "Only" filters can be combined together (e.g., waiver only + insurance only)
- Exclude and "Only" filters CANNOT be mixed
- The UI automatically enforces these rules with visual feedback

---

## Store Configuration

### Multi-Store Setup

The application supports multiple store locations for sales tracking and analysis.

**Current Stores:**
1. **Bon Aqua** - Store location 1
2. **Waverly** - Store location 2

### Adding New Stores

To add a new store location:

1. **Via Supabase Dashboard:**
   - Navigate to your Supabase project
   - Go to Table Editor → `stores`
   - Insert new row with store name

2. **Via SQL Migration:**
```sql
INSERT INTO stores (name) VALUES ('New Store Name');
```

3. **Via API (future):**
   - Will require admin authentication
   - POST to store management endpoint

### Store Assignment

Orders are assigned to stores via the `store_id` field in the `orders` table. This allows:
- Store-specific sales reporting
- Multi-store comparison analysis
- Location-based performance tracking

---

## Filter System

### Filter UI Layout

The filter row is organized as follows:

```
Row 1: [Store] | [Item Type] | [Category] | [Product] | [Show Top 10 Products] | [Show Top 5 Categories]
Row 2: Checkboxes for exclude/only filters
```

### Filter State Interface

**File:** `src/services/salesApi.ts`

```typescript
export interface SalesFilters {
  store?: string;
  itemType?: 'all' | 'rental' | 'retail';
  category?: string;
  product?: string;
  excludeWaiver?: boolean;
  waiverOnly?: boolean;
  excludeInsurance?: boolean;
  insuranceOnly?: boolean;
  excludeShipping?: boolean;
  excludeDelivery?: boolean;
  deliveryOnly?: boolean;
}
```

### Filter Behavior

1. **Store Filter**
   - Dropdown selection
   - Default: "All Stores"
   - Options: All Stores, Bon Aqua, Waverly
   - Applies to all report types

2. **Item Type Filter**
   - Dropdown selection
   - Default: "All Items"
   - Options: All Items, Rental Only, Retail Only
   - When "Retail Only" is selected: rental-specific filters are hidden

3. **Category Filter**
   - Dropdown selection populated from database
   - Default: "All Categories"
   - Dynamically loads available categories

4. **Product Filter**
   - Dropdown selection
   - Disabled until category is selected
   - Automatically populates based on selected category
   - Resets to "All Products" when category changes

5. **Checkbox Filters**
   - Visual feedback: compatible filters shown in bold, incompatible grayed out
   - Mutually exclusive pairs auto-deselect opposite option
   - Rental-specific filters hidden when "Retail Only" is selected

### Clear Filters Button

Resets all filters to default state:
```typescript
{
  store: 'all',
  itemType: 'all',
  category: 'all',
  product: 'all',
  excludeWaiver: false,
  waiverOnly: false,
  excludeInsurance: false,
  insuranceOnly: false,
  excludeShipping: false,
  excludeDelivery: false,
  deliveryOnly: false
}
```

---

## Report Types & Date Logic

### 1. Rolling 30 Days
- **Current Period**: Last 30 days (including today)
- **Previous Period**: 30 days before that (days 31-60)
- **Example** (Today = Jan 15, 2024):
  - Current: Dec 16, 2023 - Jan 15, 2024
  - Previous: Nov 16, 2023 - Dec 15, 2023

### 2. Current Month (Labeled "Current Month" but actually 7-day comparison)
- **Current Period**: Last 7 days (including today)
- **Previous Period**: 7 days before that (days 8-14)
- **Example** (Today = Jan 15, 2024):
  - Current: Jan 9, 2024 - Jan 15, 2024
  - Previous: Jan 2, 2024 - Jan 8, 2024

### 3. Last Month
- **Current Period**: Previous complete calendar month
- **Previous Period**: Month before that
- **Example** (Today = Jan 15, 2024):
  - Current: December 2023 (Dec 1 - Dec 31)
  - Previous: November 2023 (Nov 1 - Nov 30)
- **Example** (Today = March 5, 2024):
  - Current: February 2024 (Feb 1 - Feb 29)
  - Previous: January 2024 (Jan 1 - Jan 31)

**CRITICAL**: Must handle variable month lengths correctly (28, 29, 30, 31 days)

---

## API Functions

### Location
All API functions are in `src/services/salesApi.ts`

### Supabase Client
Uses `@supabase/supabase-js` for database operations:
```typescript
import { supabase } from '../lib/supabase';
```

### Available Functions

#### 1. `getRolling30Days(filters)`
Retrieves 60 days of sales data (30 current + 30 previous).

**Parameters:**
```typescript
filters: SalesFilters = {}
```

**Returns:**
```typescript
Promise<SalesDataPoint[]>
```

**Response Structure:**
```typescript
[
  {
    date: "2024-01-15",
    sales: 1250.50,
    period: "current"
  },
  {
    date: "2023-12-15",
    sales: 1100.00,
    period: "previous"
  }
]
```

**Query Logic:**
- Fetches order_items with PAID and REFUNDED orders
- Joins with orders table to get payment_date, payment_status, and store_id
- PAID orders: amounts are added to totals (positive)
- REFUNDED orders: amounts are subtracted from totals (negative)
- Applies all filters from SalesFilters interface
- Aggregates sales by date
- Returns 60 data points (30 previous + 30 current)

#### 2. `get7DayComparison(filters)`
Retrieves 14 days of sales data (7 current + 7 previous).

**Parameters:**
```typescript
filters: SalesFilters = {}
```

**Returns:**
```typescript
Promise<SalesDataPoint[]>
```

**Response Structure:** Same as getRolling30Days

**Query Logic:**
- Fetches order_items with PAID and REFUNDED orders
- PAID orders add to totals, REFUNDED orders subtract from totals
- Similar to getRolling30Days but with 14-day window
- Returns 14 data points (7 previous + 7 current)

#### 3. `getLastMonthComparison(filters)`
Retrieves last complete month vs month before that.

**Parameters:**
```typescript
filters: SalesFilters = {}
```

**Returns:**
```typescript
Promise<SalesDataPoint[]>
```

**Response Structure:** Same as getRolling30Days

**Query Logic:**
- Fetches order_items with PAID and REFUNDED orders
- PAID orders add to totals, REFUNDED orders subtract from totals
- Calculates previous complete calendar month
- Calculates month before that
- Returns all days from both months
- Handles variable month lengths (28-31 days)

#### 4. `getTopProducts(limit)`
Retrieves top products by sales volume.

**Parameters:**
```typescript
limit: number = 10
```

**Returns:**
```typescript
Promise<TopProduct[]>
```

**Response Structure:**
```typescript
[
  {
    id: "uuid",
    name: "Product Name",
    total_sales: 25000.00,
    order_count: 45
  }
]
```

**Query Logic:**
- Fetches order_items with PAID and REFUNDED orders
- PAID orders add to product totals, REFUNDED orders subtract
- Excludes damage_waiver and thrown_track_insurance
- Groups by product_id
- Sums subtotal for each product (net of refunds)
- Counts distinct orders
- Orders by total_sales descending
- Limits results

#### 5. `getTopCategories(limit)`
Retrieves top categories by sales volume.

**Parameters:**
```typescript
limit: number = 5
```

**Returns:**
```typescript
Promise<TopCategory[]>
```

**Response Structure:**
```typescript
[
  {
    id: "uuid",
    name: "Category Name",
    total_sales: 50000.00,
    order_count: 120
  }
]
```

**Query Logic:**
- Fetches order_items with PAID and REFUNDED orders
- PAID orders add to category totals, REFUNDED orders subtract
- Similar to getTopProducts but groups by category_id
- Excludes damage_waiver and thrown_track_insurance
- Returns net sales per category (after refunds)

#### 6. `getCategories()`
Retrieves all available categories.

**Returns:**
```typescript
Promise<Array<{id: string, name: string}>>
```

**Response Structure:**
```typescript
[
  { id: "uuid", name: "Party Rentals" },
  { id: "uuid", name: "Event Equipment" }
]
```

#### 7. `getProducts(categoryId)`
Retrieves products, optionally filtered by category.

**Parameters:**
```typescript
categoryId?: string
```

**Returns:**
```typescript
Promise<Array<{id: string, name: string, category_id: string}>>
```

**Response Structure:**
```typescript
[
  { id: "uuid", name: "Bounce House", category_id: "uuid" },
  { id: "uuid", name: "Table Set", category_id: "uuid" }
]
```

#### 8. `getStores()`
Retrieves all available stores.

**Returns:**
```typescript
Promise<Array<{id: string, name: string}>>
```

**Response Structure:**
```typescript
[
  { id: "uuid", name: "Bon Aqua" },
  { id: "uuid", name: "Waverly" }
]
```

### TypeScript Interfaces

#### SalesDataPoint
```typescript
export interface SalesDataPoint {
  date: string;
  sales: number;
  period: 'current' | 'previous';
}
```

#### TopProduct
```typescript
export interface TopProduct {
  id: string;
  name: string;
  total_sales: number;
  order_count: number;
}
```

#### TopCategory
```typescript
export interface TopCategory {
  id: string;
  name: string;
  total_sales: number;
  order_count: number;
}
```

#### SalesFilters
```typescript
export interface SalesFilters {
  store?: string;
  itemType?: 'all' | 'rental' | 'retail';
  category?: string;
  product?: string;
  excludeWaiver?: boolean;
  waiverOnly?: boolean;
  excludeInsurance?: boolean;
  insuranceOnly?: boolean;
  excludeShipping?: boolean;
  excludeDelivery?: boolean;
  deliveryOnly?: boolean;
}
```

---

## Frontend Implementation

### Project Structure
```
src/
├── components/
│   └── SalesTrendReport.tsx    # Main dashboard component
├── services/
│   └── salesApi.ts              # Supabase API functions
├── lib/
│   └── supabase.ts              # Supabase client configuration
├── App.tsx                       # App entry point
├── main.tsx                      # React DOM render
└── index.css                     # Global styles (Tailwind)

supabase/
└── migrations/                   # Database migrations
    ├── 20260114112157_create_sales_reporting_schema.sql
    ├── 20260114131651_add_sales_tax_column.sql
    └── 20260114160615_add_stores_table.sql
```

### Component Overview: SalesTrendReport.tsx

The main dashboard component manages all state and UI logic.

**Key State Variables:**
- `reportType`: Current report view (rolling30, 7day, lastMonth)
- `chartData`: Sales data points for current view
- `topProducts`: Top 10 products data
- `topCategories`: Top 5 categories data
- `stores`: Available store locations
- `categories`: Available product categories
- `products`: Products filtered by selected category
- `filters`: Current filter state (SalesFilters interface)
- `loading`: Loading state for async operations

**Main Functions:**
- `loadStores()`: Fetches available stores on mount
- `loadCategories()`: Fetches available categories on mount
- `loadProducts(categoryId)`: Fetches products for selected category
- `loadData()`: Fetches sales data based on current report type and filters
- `loadTopProducts()`: Fetches top 10 products and switches view
- `loadTopCategories()`: Fetches top 5 categories and switches view

**React Effects:**
```typescript
// Load reference data on mount
useEffect(() => {
  loadStores();
  loadCategories();
}, []);

// Load products when category changes
useEffect(() => {
  if (filters.category && filters.category !== 'all') {
    loadProducts(filters.category);
  }
}, [filters.category]);

// Reload data when report type or filters change
useEffect(() => {
  loadData();
}, [reportType, filters]);
```

### Key Features Implementation

#### 1. Period Comparison Charts
Uses Recharts LineChart with two lines:
- Current Period (blue, solid line)
- Previous Period (gray, dashed line)

#### 2. Top Products/Categories Bar Charts
Uses Recharts BarChart with:
- Product/category names on X-axis
- Sales values on Y-axis
- Value labels on top of bars
- Click to toggle between list and trend view

#### 3. KPI Cards
Four summary cards showing:
- Total Sales (current period)
- Previous Period Sales
- Growth Rate (with trend icon)
- Daily Average

#### 4. Filter Panel
Two-row layout:
- Row 1: Dropdowns (Store, Item Type, Category, Product) + Action buttons
- Row 2: Checkboxes for exclusion/only filters

#### 5. Business Rules Display
Collapsible panel explaining:
- PAID orders are added to totals
- REFUNDED orders are subtracted from totals
- Sales tax excluded from all calculations
- Revenue formula
- Filter usage

---

## Deployment

### Build for Production

1. **Build the Application**
```bash
npm run build
```

This creates optimized production files in the `dist/` directory.

2. **Preview Production Build Locally**
```bash
npm run preview
```

### Environment Variables for Production

Ensure the following environment variables are set in your production environment:

```env
VITE_SUPABASE_URL=your-production-supabase-url
VITE_SUPABASE_ANON_KEY=your-production-anon-key
```

### Deployment Options

#### Option 1: Vercel (Recommended)
1. Connect your repository to Vercel
2. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Add environment variables in Vercel dashboard
4. Deploy

#### Option 2: Netlify
1. Connect your repository to Netlify
2. Configure build settings:
   - Build Command: `npm run build`
   - Publish Directory: `dist`
3. Add environment variables in Netlify dashboard
4. Deploy

#### Option 3: Custom Server
1. Build the application: `npm run build`
2. Copy `dist/` contents to your web server
3. Configure web server to serve `index.html` for all routes (SPA mode)
4. Ensure HTTPS is enabled

### Post-Deployment Checklist

- [ ] Verify environment variables are correct
- [ ] Test all three report types load correctly
- [ ] Verify store filter works (Bon Aqua, Waverly, All Stores)
- [ ] Test filter combinations
- [ ] Verify charts render properly
- [ ] Test on mobile devices
- [ ] Check browser console for errors
- [ ] Verify Supabase connection is working
- [ ] Test performance (page load time < 3 seconds)

---

## Testing Guidelines

### Data Validation Testing

Test that business rules are enforced:

#### 1. Revenue Calculation Tests
- Verify PAID orders are ADDED to sales totals (positive values)
- Verify REFUNDED orders are SUBTRACTED from sales totals (negative values)
- Verify PENDING and FAILED orders are excluded from calculations
- Verify sales_tax is excluded from revenue totals
- Verify formula:
  - PAID: revenue = +(subtotal + shipping_cost + processing_fees)
  - REFUNDED: revenue = -(subtotal + shipping_cost + processing_fees)
- Test excludeShipping filter sets shipping_cost to 0 in calculations
- Test scenario: $100 PAID order + $50 REFUND = $50 net sales

#### 2. Store Filter Tests
- Test "All Stores" shows combined data from all locations
- Test "Bon Aqua" shows only Bon Aqua store data
- Test "Waverly" shows only Waverly store data
- Verify orders without store_id are handled appropriately

#### 3. Filter Combination Tests
- Test multiple exclude filters together (e.g., exclude waiver + exclude insurance)
- Test multiple "only" filters together (e.g., waiver only + insurance only)
- Verify exclude and "only" filters are mutually exclusive
- Test category + product filters work together
- Test item type filter hides/shows appropriate checkboxes

#### 4. Date Range Tests
- Verify Rolling 30 Days returns exactly 60 data points
- Verify 7-Day Comparison returns exactly 14 data points
- Verify Last Month handles variable month lengths (28-31 days)
- Test data around month boundaries
- Test leap year handling (February 29)

### UI/UX Testing

#### Manual Testing Checklist
- [ ] All three report types load correctly
- [ ] Charts render with data
- [ ] Period comparison shows correctly
- [ ] Growth rate calculation is accurate
- [ ] Filters apply correctly
- [ ] Multiple filters work together
- [ ] Top products display correctly
- [ ] Loading states work
- [ ] Error states display properly
- [ ] Responsive design on mobile/tablet

#### Test Data Requirements
Create test data with:
- Orders with different payment statuses
- Orders spanning multiple months
- Various item types
- Different categories and products
- Orders with and without shipping
- Orders with processing fees

### Performance Considerations

1. **Database Indexing**: Supabase automatically creates indexes on:
   - Primary keys (all `id` columns)
   - Foreign keys (all reference columns)
   - Consider additional indexes for frequently filtered columns

2. **Query Optimization**:
   - Supabase client handles query optimization automatically
   - Use `.select()` to limit returned columns
   - Monitor query performance in Supabase dashboard

3. **Response Time Targets**:
   - Target: < 500ms for report data queries
   - Target: < 2 seconds for chart rendering
   - Consider implementing data caching for frequently accessed data

### Support & Maintenance

#### Regular Maintenance Tasks
1. Review Supabase dashboard for slow queries
2. Monitor database storage usage
3. Update test data to reflect current business rules
4. Review and optimize queries quarterly
5. Keep dependencies updated (`npm update`)

#### Database Maintenance
1. Periodically review RLS policies
2. Archive old data if needed (orders older than 2 years)
3. Monitor database connection limits
4. Review and update store locations as needed

---

## Contact & Resources

### Development Team Contacts
- **Project Lead**: [Name/Email]
- **Backend Developer**: [Name/Email]
- **Frontend Developer**: [Name/Email]

### Technical Resources
- **Supabase Documentation**: https://supabase.com/docs
- **Supabase JavaScript Client**: https://supabase.com/docs/reference/javascript
- **React Documentation**: https://react.dev
- **Recharts Documentation**: https://recharts.org
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Vite Documentation**: https://vitejs.dev
- **TypeScript Documentation**: https://www.typescriptlang.org/docs

### Supabase Dashboard
Access your Supabase project dashboard to:
- View and edit database tables
- Run SQL queries
- Manage RLS policies
- View API logs
- Monitor performance

---

## Common Issues & Troubleshooting

### Issue: Data Not Loading
**Possible Causes:**
- Supabase connection error
- RLS policies blocking access
- Invalid environment variables

**Solutions:**
1. Check browser console for errors
2. Verify `.env` file has correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
3. Check Supabase dashboard for RLS policy issues
4. Verify network connection

### Issue: Incorrect Sales Totals
**Possible Causes:**
- Orders without payment_date
- Incorrect payment_status values
- Sales tax being included
- Refunds not properly subtracted

**Solutions:**
1. Verify PAID and REFUNDED orders have payment_date set
2. Check order_items table for correct values
3. Verify business rule implementation: PAID adds, REFUNDED subtracts
4. Test with known data set: e.g., $100 PAID + $30 REFUND should = $70
5. Confirm PENDING and FAILED orders are excluded

### Issue: Store Filter Not Working
**Possible Causes:**
- Orders don't have store_id assigned
- Store doesn't exist in stores table

**Solutions:**
1. Check orders table for store_id values
2. Verify stores exist with correct IDs
3. Run query: `SELECT DISTINCT store_id FROM orders;`
4. Assign missing store_id values to orders

### Issue: Charts Not Rendering
**Possible Causes:**
- Invalid data format
- Missing or zero data points
- Recharts library error

**Solutions:**
1. Check browser console for Recharts errors
2. Verify data structure matches expected format
3. Check if loading state is stuck
4. Clear browser cache and reload

---

## Future Enhancements

### Planned Features
- Export to CSV/Excel functionality
- Email scheduled reports
- Custom date range selection
- Year-over-year comparisons
- Revenue forecasting
- Multi-currency support
- Customer segmentation analysis
- Store performance comparison dashboard

### Technical Improvements
- Implement data caching for faster load times
- Add authentication and user roles
- Create admin panel for store management
- Implement real-time data updates
- Add automated testing suite
- Performance optimizations for large datasets

---

**Document Version**: 2.1
**Last Updated**: January 14, 2026
**Next Review Date**: March 14, 2026

**Changelog:**
- v2.1 (2026-01-14): Updated refund handling - refunds now subtract from sales totals instead of being excluded
- v2.0 (2026-01-14): Updated for Supabase implementation, added store filtering
- v1.0 (2026-01-14): Initial Laravel-based documentation
