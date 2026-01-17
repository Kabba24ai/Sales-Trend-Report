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

## Date Filter Definitions

### Date Range Filter Options

The application provides several date range options for filtering sales data. Each option has specific behavior for determining the date range:

#### 1. 30 Day Rolling
Shows data for the last 30 days, **including today**.

**Example:** If today is Jan 17, this includes **Dec 19 – Jan 17** (30 days total)

**Implementation:**
- Start Date: Today minus 29 days
- End Date: Today (inclusive)
- **Note:** This is exactly 30 days including today

#### 2. This Month
Shows data from the 1st day of the current month through today.

**Example:** If today is Jan 17, this includes **Jan 1 – Jan 17**

**Implementation:**
- Start Date: First day of current month
- End Date: Today (inclusive)

#### 3. Last Month
Shows data for the entire previous calendar month.

**Example:** If today is Jan 17, this includes **Dec 1 – Dec 31**

**Implementation:**
- Start Date: First day of previous month
- End Date: Last day of previous month
- **CRITICAL:** Must handle variable month lengths (28, 29, 30, 31 days)

#### 4. This Year
Shows data from January 1st of the current year through today.

**Example:** If today is Jan 17, 2026, this includes **Jan 1, 2026 – Jan 17, 2026**

**Implementation:**
- Start Date: January 1st of current year
- End Date: Today (inclusive)

#### 5. Last Year
Shows data for the entire previous calendar year.

**Example:** If today is Jan 17, 2026, this includes **Jan 1, 2025 – Dec 31, 2025**

**Implementation:**
- Start Date: January 1st of previous year
- End Date: December 31st of previous year
- **Note:** Always a complete 365 or 366 day period (leap years)

#### 6. Custom Range
Lets you choose an exact start date and end date manually.

**Example:** Jan 5 – Jan 12

**Implementation:**
- Start Date: User-selected start date
- End Date: User-selected end date
- Both dates are inclusive

### Important Note About Demo Data

**Demo Data Dates:** The demo data in the database has fixed `payment_date` values. When you change date filters, the SQL queries correctly filter the data based on the selected date range, but you may not see visible changes in the charts if the demo data doesn't have transactions within the selected date range.

**For Production Use:** When using real transaction data with current dates, the date filters will work as expected and you'll see data changes when switching between date ranges.

**Testing Date Filters:** To test date filters with demo data, you can either:
1. Insert demo data with recent `payment_date` values that fall within your desired date ranges
2. Use the Custom Range option to select dates that match your existing demo data dates
3. Check the database to see what date ranges have transaction data

---

## Report Types & Date Logic (Charts)

The dashboard provides three different chart views with period-over-period comparison:

### 1. Rolling 30 Days Chart
- **Current Period**: Last 30 days (including today)
- **Previous Period**: 30 days before that (days 31-60)
- **Example** (Today = Jan 17, 2024):
  - Current: Dec 19, 2023 - Jan 17, 2024 (30 days)
  - Previous: Nov 19, 2023 - Dec 18, 2023 (30 days)

### 2. 7-Day Comparison Chart
- **Current Period**: Last 7 days (including today)
- **Previous Period**: 7 days before that (days 8-14)
- **Example** (Today = Jan 17, 2024):
  - Current: Jan 11, 2024 - Jan 17, 2024 (7 days)
  - Previous: Jan 4, 2024 - Jan 10, 2024 (7 days)

### 3. Last Month Chart
- **Current Period**: Previous complete calendar month
- **Previous Period**: Month before that
- **Example** (Today = Jan 17, 2024):
  - Current: December 2023 (Dec 1 - Dec 31)
  - Previous: November 2023 (Nov 1 - Nov 30)
- **Example** (Today = March 5, 2024):
  - Current: February 2024 (Feb 1 - Feb 29, leap year)
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

## Laravel Integration Guide

This section provides complete implementation details for Laravel developers to connect this React-based sales dashboard to a Laravel/Blade backend.

### Architecture Overview

```
React Frontend (Vite) ←→ Laravel API Backend ←→ MySQL/PostgreSQL Database
```

The React application will communicate with Laravel via RESTful API endpoints. Laravel handles authentication, database queries, and business logic.

---

### 1. Laravel API Endpoints to Implement

Create the following API routes in `routes/api.php`:

```php
// API Routes for Sales Dashboard
Route::prefix('api/sales')->middleware(['api'])->group(function () {
    // Reference data endpoints
    Route::get('/stores', [SalesController::class, 'getStores']);
    Route::get('/categories', [SalesController::class, 'getCategories']);
    Route::get('/products', [SalesController::class, 'getProducts']);

    // Sales data endpoints with date filtering
    Route::post('/data', [SalesController::class, 'getSalesData']);
    Route::post('/top-products', [SalesController::class, 'getTopProducts']);
    Route::post('/top-categories', [SalesController::class, 'getTopCategories']);

    // Period comparison endpoints
    Route::post('/rolling-30', [SalesController::class, 'getRolling30Days']);
    Route::post('/7-day-comparison', [SalesController::class, 'get7DayComparison']);
    Route::post('/last-month', [SalesController::class, 'getLastMonth']);
});
```

**Important:** Add authentication middleware if needed:
```php
Route::prefix('api/sales')->middleware(['api', 'auth:sanctum'])->group(function () {
    // ... routes
});
```

---

### 2. Controller Implementation

Create `app/Http/Controllers/SalesController.php`:

#### Key Methods to Implement

**getStores() - Returns all store locations**
```php
public function getStores()
{
    return response()->json(
        Store::select('id', 'name')->orderBy('name')->get()
    );
}
```

**Expected Response:**
```json
[
    {"id": "uuid-1", "name": "Bon Aqua"},
    {"id": "uuid-2", "name": "Waverly"}
]
```

---

**getCategories() - Returns all product categories**
```php
public function getCategories()
{
    return response()->json(
        Category::select('id', 'name')->orderBy('name')->get()
    );
}
```

**Expected Response:**
```json
[
    {"id": "uuid-1", "name": "Party Rentals"},
    {"id": "uuid-2", "name": "Event Equipment"}
]
```

---

**getProducts() - Returns products, optionally filtered by category**
```php
public function getProducts(Request $request)
{
    $query = Product::select('id', 'name', 'category_id');

    if ($request->has('category_id') && $request->category_id !== 'all') {
        $query->where('category_id', $request->category_id);
    }

    return response()->json($query->orderBy('name')->get());
}
```

**Expected Response:**
```json
[
    {"id": "uuid-1", "name": "Bounce House", "category_id": "uuid-x"},
    {"id": "uuid-2", "name": "Table Set", "category_id": "uuid-y"}
]
```

---

**getSalesData() - Main sales query with filters**

This is the core method that handles all filtering and date range logic.

**Request Payload Example:**
```json
{
    "dateRange": "30_day_rolling",
    "customStartDate": null,
    "customEndDate": null,
    "filters": {
        "store": "all",
        "itemType": "all",
        "category": "all",
        "product": "all",
        "excludeWaiver": false,
        "waiverOnly": false,
        "excludeInsurance": false,
        "insuranceOnly": false,
        "excludeShipping": false,
        "excludeDelivery": false,
        "deliveryOnly": false
    }
}
```

**Date Range Options:**
- `30_day_rolling`: Last 30 days including today
- `this_month`: 1st of current month through today
- `last_month`: Entire previous calendar month
- `this_year`: Jan 1 of current year through today
- `last_year`: Entire previous calendar year
- `custom`: Use customStartDate and customEndDate

**Implementation Skeleton:**
```php
public function getSalesData(Request $request)
{
    $dateRange = $request->input('dateRange', '30_day_rolling');
    $filters = $request->input('filters', []);
    $customStartDate = $request->input('customStartDate');
    $customEndDate = $request->input('customEndDate');

    // 1. Calculate date range based on $dateRange
    [$startDate, $endDate] = $this->calculateDateRange($dateRange, $customStartDate, $customEndDate);

    // 2. Build query with filters
    $query = $this->buildSalesQuery($startDate, $endDate, $filters);

    // 3. Execute and return results
    return response()->json($query->get());
}

private function calculateDateRange($dateRange, $customStart, $customEnd)
{
    $today = now();

    switch ($dateRange) {
        case '30_day_rolling':
            return [
                $today->copy()->subDays(29)->startOfDay(),
                $today->copy()->endOfDay()
            ];

        case 'this_month':
            return [
                $today->copy()->startOfMonth(),
                $today->copy()->endOfDay()
            ];

        case 'last_month':
            return [
                $today->copy()->subMonth()->startOfMonth(),
                $today->copy()->subMonth()->endOfMonth()
            ];

        case 'this_year':
            return [
                $today->copy()->startOfYear(),
                $today->copy()->endOfDay()
            ];

        case 'last_year':
            return [
                $today->copy()->subYear()->startOfYear(),
                $today->copy()->subYear()->endOfYear()
            ];

        case 'custom':
            return [
                Carbon::parse($customStart)->startOfDay(),
                Carbon::parse($customEnd)->endOfDay()
            ];

        default:
            return [
                $today->copy()->subDays(29)->startOfDay(),
                $today->copy()->endOfDay()
            ];
    }
}
```

---

**buildSalesQuery() - Core query builder with business rules**

```php
private function buildSalesQuery($startDate, $endDate, $filters)
{
    $query = DB::table('order_items')
        ->join('orders', 'order_items.order_id', '=', 'orders.id')
        ->whereIn('orders.payment_status', ['PAID', 'REFUNDED'])
        ->whereNotNull('orders.payment_date')
        ->whereBetween('orders.payment_date', [$startDate, $endDate]);

    // Apply store filter
    if (!empty($filters['store']) && $filters['store'] !== 'all') {
        $query->where('orders.store_id', $filters['store']);
    }

    // Apply item type filter (rental/retail)
    if (!empty($filters['itemType']) && $filters['itemType'] !== 'all') {
        $query->where('order_items.item_type', $filters['itemType']);
    }

    // Apply category filter
    if (!empty($filters['category']) && $filters['category'] !== 'all') {
        $query->where('order_items.category_id', $filters['category']);
    }

    // Apply product filter
    if (!empty($filters['product']) && $filters['product'] !== 'all') {
        $query->where('order_items.product_id', $filters['product']);
    }

    // Apply waiver filters
    if (!empty($filters['excludeWaiver'])) {
        $query->where('order_items.item_type', '!=', 'damage_waiver');
    }
    if (!empty($filters['waiverOnly'])) {
        $query->where('order_items.item_type', 'damage_waiver');
    }

    // Apply insurance filters
    if (!empty($filters['excludeInsurance'])) {
        $query->where('order_items.item_type', '!=', 'thrown_track_insurance');
    }
    if (!empty($filters['insuranceOnly'])) {
        $query->where('order_items.item_type', 'thrown_track_insurance');
    }

    // Apply delivery filters
    if (!empty($filters['excludeDelivery'])) {
        $query->where('order_items.item_type', '!=', 'delivery');
    }
    if (!empty($filters['deliveryOnly'])) {
        $query->where('order_items.item_type', 'delivery');
    }

    // Calculate revenue (CRITICAL BUSINESS RULES)
    // PAID orders: revenue is ADDED (positive)
    // REFUNDED orders: revenue is SUBTRACTED (negative)
    // Sales tax is ALWAYS excluded

    $shippingCost = !empty($filters['excludeShipping']) ? '0' : 'order_items.shipping_cost';

    $query->selectRaw("
        DATE(orders.payment_date) as date,
        SUM(
            CASE
                WHEN orders.payment_status = 'PAID' THEN
                    (order_items.subtotal + {$shippingCost} + order_items.processing_fees)
                WHEN orders.payment_status = 'REFUNDED' THEN
                    -(order_items.subtotal + {$shippingCost} + order_items.processing_fees)
                ELSE 0
            END
        ) as sales
    ")
    ->groupBy('date')
    ->orderBy('date');

    return $query;
}
```

**Expected Response:**
```json
[
    {"date": "2026-01-15", "sales": 1250.50},
    {"date": "2026-01-16", "sales": 890.25},
    {"date": "2026-01-17", "sales": 1450.00}
]
```

---

**getTopProducts() - Top 10 products by revenue**

**Request Payload:**
```json
{
    "limit": 10,
    "filters": { /* same as getSalesData */ }
}
```

**Implementation:**
```php
public function getTopProducts(Request $request)
{
    $limit = $request->input('limit', 10);
    $filters = $request->input('filters', []);

    $query = DB::table('order_items')
        ->join('orders', 'order_items.order_id', '=', 'orders.id')
        ->join('products', 'order_items.product_id', '=', 'products.id')
        ->whereIn('orders.payment_status', ['PAID', 'REFUNDED'])
        ->whereNotNull('orders.payment_date')
        ->whereNotIn('order_items.item_type', ['damage_waiver', 'thrown_track_insurance']);

    // Apply filters (same logic as buildSalesQuery)

    $query->selectRaw("
        products.id,
        products.name,
        SUM(
            CASE
                WHEN orders.payment_status = 'PAID' THEN order_items.subtotal
                WHEN orders.payment_status = 'REFUNDED' THEN -order_items.subtotal
                ELSE 0
            END
        ) as total_sales,
        COUNT(DISTINCT orders.id) as order_count
    ")
    ->groupBy('products.id', 'products.name')
    ->orderByDesc('total_sales')
    ->limit($limit);

    return response()->json($query->get());
}
```

**Expected Response:**
```json
[
    {
        "id": "uuid-1",
        "name": "Bounce House Deluxe",
        "total_sales": 25000.00,
        "order_count": 45
    }
]
```

---

**getTopCategories() - Top 5 categories by revenue**

Similar implementation to getTopProducts but groups by category.

---

**getRolling30Days(), get7DayComparison(), getLastMonth()**

These methods are for the chart comparison views. They need to return data for TWO periods (current and previous).

**Request Payload:**
```json
{
    "filters": { /* same as getSalesData */ }
}
```

**Implementation Example for getRolling30Days:**
```php
public function getRolling30Days(Request $request)
{
    $filters = $request->input('filters', []);
    $today = now();

    // Current period: Last 30 days
    $currentStart = $today->copy()->subDays(29)->startOfDay();
    $currentEnd = $today->copy()->endOfDay();

    // Previous period: 30 days before that
    $previousStart = $today->copy()->subDays(59)->startOfDay();
    $previousEnd = $today->copy()->subDays(30)->endOfDay();

    // Get current period data
    $currentData = $this->buildSalesQuery($currentStart, $currentEnd, $filters)
        ->get()
        ->map(function($item) {
            $item->period = 'current';
            return $item;
        });

    // Get previous period data
    $previousData = $this->buildSalesQuery($previousStart, $previousEnd, $filters)
        ->get()
        ->map(function($item) {
            $item->period = 'previous';
            return $item;
        });

    return response()->json($currentData->concat($previousData));
}
```

**Expected Response:**
```json
[
    {"date": "2026-01-17", "sales": 1250.50, "period": "current"},
    {"date": "2025-12-18", "sales": 1100.00, "period": "previous"}
]
```

---

### 3. Database Migration

Use the SQL migrations in `supabase/migrations/` folder as reference to create Laravel migrations. The schema is database-agnostic (works with MySQL and PostgreSQL).

**Key Tables:**
- `stores` - Store locations
- `categories` - Product categories
- `products` - Product catalog
- `orders` - Order headers with payment info
- `order_items` - Line items with revenue breakdown

**Run existing migrations:**
```bash
php artisan migrate
```

See the "Database Schema" section above for complete table structures.

---

### 4. Frontend Configuration

Update the React frontend to connect to Laravel API:

**File:** `src/services/salesApi.ts`

Replace the Supabase client calls with Laravel API calls:

```typescript
// Change from Supabase
import { supabase } from '../lib/supabase';

// To Laravel API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Example: getStores function
export async function getStores() {
    const response = await fetch(`${API_BASE_URL}/sales/stores`);
    if (!response.ok) throw new Error('Failed to fetch stores');
    return response.json();
}

// Example: getSalesData function
export async function getSalesData(
    dateRange: string,
    filters: SalesFilters,
    customStartDate?: string,
    customEndDate?: string
) {
    const response = await fetch(`${API_BASE_URL}/sales/data`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            dateRange,
            customStartDate,
            customEndDate,
            filters
        })
    });

    if (!response.ok) throw new Error('Failed to fetch sales data');
    return response.json();
}
```

---

### 5. Environment Variables

**Laravel `.env`:**
```env
# Database connection (use your existing config)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_database
DB_USERNAME=your_username
DB_PASSWORD=your_password

# CORS settings for React frontend
SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:3000
SESSION_DOMAIN=localhost
```

**React `.env`:**
```env
# Laravel API endpoint
VITE_API_BASE_URL=http://localhost:8000/api

# Remove Supabase variables (no longer needed)
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
```

---

### 6. CORS Configuration

Laravel needs to allow requests from the React frontend.

**File:** `config/cors.php`

```php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        'http://localhost:5173',  // Vite dev server
        'http://localhost:3000',  // Alternative React port
        env('FRONTEND_URL', 'http://localhost:5173'),
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
```

**Important:** Update `allowed_origins` for production with your actual domain.

---

### 7. Authentication (Optional)

If you want to protect the API with authentication:

**Install Laravel Sanctum:**
```bash
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

**Add middleware to routes:**
```php
Route::prefix('api/sales')
    ->middleware(['api', 'auth:sanctum'])
    ->group(function () {
        // ... routes
    });
```

**Frontend authentication:**
```typescript
// Login and store token
const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
});
const { token } = await response.json();
localStorage.setItem('auth_token', token);

// Include token in requests
const response = await fetch(`${API_BASE_URL}/sales/data`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    },
    body: JSON.stringify({ dateRange, filters })
});
```

---

### 8. Testing the Integration

**Step 1: Start Laravel backend**
```bash
php artisan serve
# Running on http://localhost:8000
```

**Step 2: Test API endpoints with Postman or curl**
```bash
# Test stores endpoint
curl http://localhost:8000/api/sales/stores

# Test sales data endpoint
curl -X POST http://localhost:8000/api/sales/data \
  -H "Content-Type: application/json" \
  -d '{"dateRange":"30_day_rolling","filters":{"store":"all"}}'
```

**Step 3: Start React frontend**
```bash
npm run dev
# Running on http://localhost:5173
```

**Step 4: Verify connection**
- Open browser to http://localhost:5173
- Check browser console for API calls
- Verify data loads correctly in charts

---

### 9. Deployment Checklist

**Laravel Backend:**
- [ ] Deploy to production server (Laravel Forge, AWS, etc.)
- [ ] Set production environment variables
- [ ] Run migrations: `php artisan migrate --force`
- [ ] Configure CORS for production domain
- [ ] Set up SSL/HTTPS
- [ ] Configure caching: `php artisan config:cache`

**React Frontend:**
- [ ] Update `VITE_API_BASE_URL` to production API URL
- [ ] Build for production: `npm run build`
- [ ] Deploy `dist/` folder to hosting (Vercel, Netlify, S3)
- [ ] Verify CORS allows production domain
- [ ] Test all API endpoints from production frontend

---

### 10. Key Integration Points Summary

**API Endpoints Needed:**
1. `GET /api/sales/stores` - Store list
2. `GET /api/sales/categories` - Category list
3. `GET /api/sales/products?category_id={id}` - Product list
4. `POST /api/sales/data` - Main sales data with date filter
5. `POST /api/sales/top-products` - Top 10 products
6. `POST /api/sales/top-categories` - Top 5 categories
7. `POST /api/sales/rolling-30` - 30-day comparison chart
8. `POST /api/sales/7-day-comparison` - 7-day comparison chart
9. `POST /api/sales/last-month` - Last month comparison chart

**Critical Business Rules to Implement:**
- PAID orders: revenue is ADDED to totals (positive values)
- REFUNDED orders: revenue is SUBTRACTED from totals (negative values)
- PENDING and FAILED orders: EXCLUDED from all calculations
- Sales tax: ALWAYS excluded from revenue calculations
- Revenue formula: `subtotal + shipping_cost + processing_fees` (sales tax excluded)
- Date filters must include BOTH start and end dates (inclusive)

**Date Range Calculations:**
- 30 Day Rolling: Today minus 29 days through today (30 days total)
- This Month: 1st of current month through today
- Last Month: 1st through last day of previous month
- This Year: January 1st of current year through today
- Last Year: January 1st through December 31st of previous year
- Custom: User-selected start and end dates

**Response Formats:**
All responses should return JSON matching the TypeScript interfaces defined in `src/services/salesApi.ts`.

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

**Document Version**: 3.0
**Last Updated**: January 17, 2026
**Next Review Date**: March 17, 2026

**Changelog:**
- v3.0 (2026-01-17): Added comprehensive Laravel Integration Guide with API endpoints, controller implementations, CORS configuration, authentication setup, and deployment checklists
- v2.2 (2026-01-17): Added comprehensive date filter definitions (30 Day Rolling, This Month, Last Month, This Year, Last Year, Custom Range) with accurate date range calculations and demo data notes
- v2.1 (2026-01-14): Updated refund handling - refunds now subtract from sales totals instead of being excluded
- v2.0 (2026-01-14): Updated for Supabase implementation, added store filtering
- v1.0 (2026-01-14): Initial Laravel-based documentation
