# Laravel Backend Integration - Quick Start Guide

This guide provides Laravel developers with everything needed to integrate the React Sales Dashboard with a Laravel backend.

## Table of Contents
1. [API Routes Setup](#api-routes-setup)
2. [Controller Structure](#controller-structure)
3. [Critical Business Rules](#critical-business-rules)
4. [Date Range Logic](#date-range-logic)
5. [Required Endpoints](#required-endpoints)
6. [CORS Configuration](#cors-configuration)
7. [Testing Endpoints](#testing-endpoints)

---

## API Routes Setup

Add to `routes/api.php`:

```php
<?php

use App\Http\Controllers\SalesController;

Route::prefix('api/sales')->middleware(['api'])->group(function () {
    // Reference data
    Route::get('/stores', [SalesController::class, 'getStores']);
    Route::get('/categories', [SalesController::class, 'getCategories']);
    Route::get('/products', [SalesController::class, 'getProducts']);

    // Sales data with date filtering
    Route::post('/data', [SalesController::class, 'getSalesData']);
    Route::post('/top-products', [SalesController::class, 'getTopProducts']);
    Route::post('/top-categories', [SalesController::class, 'getTopCategories']);

    // Period comparison charts
    Route::post('/rolling-30', [SalesController::class, 'getRolling30Days']);
    Route::post('/7-day-comparison', [SalesController::class, 'get7DayComparison']);
    Route::post('/last-month', [SalesController::class, 'getLastMonth']);
});
```

For authenticated endpoints, add `auth:sanctum` middleware:
```php
Route::prefix('api/sales')->middleware(['api', 'auth:sanctum'])->group(function () {
    // ... routes
});
```

---

## Controller Structure

Create `app/Http/Controllers/SalesController.php`:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Models\Store;
use App\Models\Category;
use App\Models\Product;

class SalesController extends Controller
{
    /**
     * Get all stores
     */
    public function getStores()
    {
        return response()->json(
            Store::select('id', 'name')->orderBy('name')->get()
        );
    }

    /**
     * Get all categories
     */
    public function getCategories()
    {
        return response()->json(
            Category::select('id', 'name')->orderBy('name')->get()
        );
    }

    /**
     * Get products, optionally filtered by category
     */
    public function getProducts(Request $request)
    {
        $query = Product::select('id', 'name', 'category_id');

        if ($request->has('category_id') && $request->category_id !== 'all') {
            $query->where('category_id', $request->category_id);
        }

        return response()->json($query->orderBy('name')->get());
    }

    /**
     * Get sales data with date filtering
     */
    public function getSalesData(Request $request)
    {
        $dateRange = $request->input('dateRange', '30_day_rolling');
        $filters = $request->input('filters', []);
        $customStartDate = $request->input('customStartDate');
        $customEndDate = $request->input('customEndDate');

        [$startDate, $endDate] = $this->calculateDateRange(
            $dateRange,
            $customStartDate,
            $customEndDate
        );

        $query = $this->buildSalesQuery($startDate, $endDate, $filters);

        return response()->json($query->get());
    }

    /**
     * Calculate date range based on filter type
     */
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

    /**
     * Build sales query with filters and business rules
     */
    private function buildSalesQuery($startDate, $endDate, $filters)
    {
        $query = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->whereIn('orders.payment_status', ['PAID', 'REFUNDED'])
            ->whereNotNull('orders.payment_date')
            ->whereBetween('orders.payment_date', [$startDate, $endDate]);

        // Store filter
        if (!empty($filters['store']) && $filters['store'] !== 'all') {
            $query->where('orders.store_id', $filters['store']);
        }

        // Item type filter (rental/retail)
        if (!empty($filters['itemType']) && $filters['itemType'] !== 'all') {
            $query->where('order_items.item_type', $filters['itemType']);
        }

        // Category filter
        if (!empty($filters['category']) && $filters['category'] !== 'all') {
            $query->where('order_items.category_id', $filters['category']);
        }

        // Product filter
        if (!empty($filters['product']) && $filters['product'] !== 'all') {
            $query->where('order_items.product_id', $filters['product']);
        }

        // Waiver filters
        if (!empty($filters['excludeWaiver'])) {
            $query->where('order_items.item_type', '!=', 'damage_waiver');
        }
        if (!empty($filters['waiverOnly'])) {
            $query->where('order_items.item_type', 'damage_waiver');
        }

        // Insurance filters
        if (!empty($filters['excludeInsurance'])) {
            $query->where('order_items.item_type', '!=', 'thrown_track_insurance');
        }
        if (!empty($filters['insuranceOnly'])) {
            $query->where('order_items.item_type', 'thrown_track_insurance');
        }

        // Delivery filters
        if (!empty($filters['excludeDelivery'])) {
            $query->where('order_items.item_type', '!=', 'delivery');
        }
        if (!empty($filters['deliveryOnly'])) {
            $query->where('order_items.item_type', 'delivery');
        }

        // CRITICAL: Apply business rules for revenue calculation
        // PAID orders: ADD revenue (positive)
        // REFUNDED orders: SUBTRACT revenue (negative)
        // Sales tax: ALWAYS excluded

        $shippingCost = !empty($filters['excludeShipping'])
            ? '0'
            : 'order_items.shipping_cost';

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

    /**
     * Get top products by revenue
     */
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

        // Apply filters (same logic as buildSalesQuery for store, category, etc.)
        if (!empty($filters['store']) && $filters['store'] !== 'all') {
            $query->where('orders.store_id', $filters['store']);
        }

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

    /**
     * Get top categories by revenue
     */
    public function getTopCategories(Request $request)
    {
        $limit = $request->input('limit', 5);
        $filters = $request->input('filters', []);

        $query = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('categories', 'order_items.category_id', '=', 'categories.id')
            ->whereIn('orders.payment_status', ['PAID', 'REFUNDED'])
            ->whereNotNull('orders.payment_date')
            ->whereNotIn('order_items.item_type', ['damage_waiver', 'thrown_track_insurance']);

        // Apply filters
        if (!empty($filters['store']) && $filters['store'] !== 'all') {
            $query->where('orders.store_id', $filters['store']);
        }

        $query->selectRaw("
            categories.id,
            categories.name,
            SUM(
                CASE
                    WHEN orders.payment_status = 'PAID' THEN order_items.subtotal
                    WHEN orders.payment_status = 'REFUNDED' THEN -order_items.subtotal
                    ELSE 0
                END
            ) as total_sales,
            COUNT(DISTINCT orders.id) as order_count
        ")
        ->groupBy('categories.id', 'categories.name')
        ->orderByDesc('total_sales')
        ->limit($limit);

        return response()->json($query->get());
    }

    /**
     * Rolling 30 days comparison (current vs previous 30 days)
     */
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

    /**
     * 7-day comparison (current vs previous 7 days)
     */
    public function get7DayComparison(Request $request)
    {
        $filters = $request->input('filters', []);
        $today = now();

        // Current period: Last 7 days
        $currentStart = $today->copy()->subDays(6)->startOfDay();
        $currentEnd = $today->copy()->endOfDay();

        // Previous period: 7 days before that
        $previousStart = $today->copy()->subDays(13)->startOfDay();
        $previousEnd = $today->copy()->subDays(7)->endOfDay();

        $currentData = $this->buildSalesQuery($currentStart, $currentEnd, $filters)
            ->get()
            ->map(function($item) {
                $item->period = 'current';
                return $item;
            });

        $previousData = $this->buildSalesQuery($previousStart, $previousEnd, $filters)
            ->get()
            ->map(function($item) {
                $item->period = 'previous';
                return $item;
            });

        return response()->json($currentData->concat($previousData));
    }

    /**
     * Last month comparison (last complete month vs month before)
     */
    public function getLastMonth(Request $request)
    {
        $filters = $request->input('filters', []);
        $today = now();

        // Current period: Last complete month
        $currentStart = $today->copy()->subMonth()->startOfMonth();
        $currentEnd = $today->copy()->subMonth()->endOfMonth();

        // Previous period: Month before that
        $previousStart = $today->copy()->subMonths(2)->startOfMonth();
        $previousEnd = $today->copy()->subMonths(2)->endOfMonth();

        $currentData = $this->buildSalesQuery($currentStart, $currentEnd, $filters)
            ->get()
            ->map(function($item) {
                $item->period = 'current';
                return $item;
            });

        $previousData = $this->buildSalesQuery($previousStart, $previousEnd, $filters)
            ->get()
            ->map(function($item) {
                $item->period = 'previous';
                return $item;
            });

        return response()->json($currentData->concat($previousData));
    }
}
```

---

## Critical Business Rules

**MUST IMPLEMENT EXACTLY AS SPECIFIED:**

### Revenue Calculation

```
For PAID orders:
    revenue = +(subtotal + shipping_cost + processing_fees)

For REFUNDED orders:
    revenue = -(subtotal + shipping_cost + processing_fees)

For PENDING or FAILED orders:
    EXCLUDE from all calculations

Sales Tax:
    ALWAYS excluded from revenue calculations
```

### Order Filtering Rules

1. **Only include orders where:**
   - `payment_status` is 'PAID' or 'REFUNDED'
   - `payment_date` is NOT NULL
   - `payment_date` falls within the specified date range

2. **PAID orders contribute POSITIVE amounts to totals**
3. **REFUNDED orders contribute NEGATIVE amounts to totals**
4. **Example:** $100 PAID + $30 REFUND = $70 net sales

---

## Date Range Logic

### Date Filter Types

```php
'30_day_rolling'  => Today minus 29 days through today (30 days total)
'this_month'      => 1st of current month through today
'last_month'      => 1st through last day of previous month
'this_year'       => January 1st of current year through today
'last_year'       => January 1st through December 31st of previous year
'custom'          => User-provided start and end dates
```

### Implementation Examples

```php
// 30 Day Rolling
$start = now()->subDays(29)->startOfDay();  // 29 days ago
$end = now()->endOfDay();                   // Today

// This Month
$start = now()->startOfMonth();             // 1st of current month
$end = now()->endOfDay();                   // Today

// Last Month
$start = now()->subMonth()->startOfMonth(); // 1st of previous month
$end = now()->subMonth()->endOfMonth();     // Last day of previous month

// This Year
$start = now()->startOfYear();              // Jan 1 of current year
$end = now()->endOfDay();                   // Today

// Last Year
$start = now()->subYear()->startOfYear();   // Jan 1 of previous year
$end = now()->subYear()->endOfYear();       // Dec 31 of previous year
```

**Important:** Always use `startOfDay()` and `endOfDay()` to ensure complete date ranges.

---

## Required Endpoints

### 1. GET /api/sales/stores
Returns list of all store locations.

**Response:**
```json
[
    {"id": "uuid-1", "name": "Bon Aqua"},
    {"id": "uuid-2", "name": "Waverly"}
]
```

### 2. GET /api/sales/categories
Returns list of all product categories.

**Response:**
```json
[
    {"id": "uuid-1", "name": "Party Rentals"},
    {"id": "uuid-2", "name": "Event Equipment"}
]
```

### 3. GET /api/sales/products?category_id={id}
Returns products, optionally filtered by category.

**Response:**
```json
[
    {"id": "uuid-1", "name": "Bounce House", "category_id": "uuid-x"},
    {"id": "uuid-2", "name": "Table Set", "category_id": "uuid-y"}
]
```

### 4. POST /api/sales/data
Main sales data endpoint with date filtering.

**Request:**
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

**Response:**
```json
[
    {"date": "2026-01-15", "sales": 1250.50},
    {"date": "2026-01-16", "sales": 890.25},
    {"date": "2026-01-17", "sales": 1450.00}
]
```

### 5. POST /api/sales/top-products
Returns top N products by revenue.

**Request:**
```json
{
    "limit": 10,
    "filters": { /* same as /data endpoint */ }
}
```

**Response:**
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

### 6. POST /api/sales/top-categories
Returns top N categories by revenue (similar to top-products).

### 7. POST /api/sales/rolling-30
Returns 60 days of data (30 current + 30 previous) for comparison chart.

**Response:**
```json
[
    {"date": "2026-01-17", "sales": 1250.50, "period": "current"},
    {"date": "2025-12-18", "sales": 1100.00, "period": "previous"}
]
```

### 8. POST /api/sales/7-day-comparison
Returns 14 days of data (7 current + 7 previous) for comparison chart.

### 9. POST /api/sales/last-month
Returns last complete month + previous month for comparison chart.

---

## CORS Configuration

Add to `config/cors.php`:

```php
<?php

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

**For Production:** Update `allowed_origins` with your production domain:
```php
'allowed_origins' => [
    'https://yourdomain.com',
    env('FRONTEND_URL'),
],
```

---

## Testing Endpoints

### Using curl

```bash
# Test stores
curl http://localhost:8000/api/sales/stores

# Test categories
curl http://localhost:8000/api/sales/categories

# Test products
curl "http://localhost:8000/api/sales/products?category_id=uuid-123"

# Test sales data
curl -X POST http://localhost:8000/api/sales/data \
  -H "Content-Type: application/json" \
  -d '{
    "dateRange": "30_day_rolling",
    "filters": {
      "store": "all",
      "itemType": "all"
    }
  }'

# Test top products
curl -X POST http://localhost:8000/api/sales/top-products \
  -H "Content-Type: application/json" \
  -d '{"limit": 10, "filters": {"store": "all"}}'

# Test rolling 30 days chart
curl -X POST http://localhost:8000/api/sales/rolling-30 \
  -H "Content-Type: application/json" \
  -d '{"filters": {"store": "all"}}'
```

### Using Postman

1. Create a new collection: "Sales Dashboard API"
2. Add requests for each endpoint above
3. Set headers: `Content-Type: application/json`
4. For POST requests, add JSON body as shown above
5. Test with different filter combinations

---

## Environment Setup

### Laravel .env

```env
# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_database
DB_USERNAME=your_username
DB_PASSWORD=your_password

# CORS
FRONTEND_URL=http://localhost:5173

# Optional: Sanctum for auth
SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:3000
SESSION_DOMAIN=localhost
```

### React .env

```env
# Laravel API endpoint
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## Quick Start Commands

```bash
# Start Laravel backend
php artisan serve
# Running on http://localhost:8000

# In separate terminal, start React frontend
npm run dev
# Running on http://localhost:5173
```

---

## Common Issues

### CORS Errors
- Verify `config/cors.php` includes your frontend URL
- Check that routes are in `api/*` path
- Clear config cache: `php artisan config:cache`

### Empty Data
- Verify orders have `payment_date` set
- Check that `payment_status` is 'PAID' or 'REFUNDED'
- Ensure date ranges include actual data dates

### Incorrect Totals
- Verify PAID orders are added (positive)
- Verify REFUNDED orders are subtracted (negative)
- Confirm sales tax is excluded from calculations
- Test with known data: $100 PAID + $30 REFUND = $70

---

## Support

For complete documentation, see `README.md` in the project root.

**Key Sections:**
- Database Schema (line 92)
- Business Rules (line 226)
- Date Filter Definitions (line 410)
- API Functions (line 519)

---

**Document Version:** 1.0
**Last Updated:** January 17, 2026
