# Sales Trend Analysis Dashboard - Implementation Guide

## Overview

This React-based dashboard provides comprehensive sales trend analysis with period-over-period comparisons. It's designed to integrate with a Laravel backend via REST API endpoints.

## Table of Contents

1. [Architecture](#architecture)
2. [Database Schema](#database-schema)
3. [Business Rules](#business-rules)
4. [API Endpoints](#api-endpoints)
5. [Laravel Implementation](#laravel-implementation)
6. [Frontend Integration](#frontend-integration)
7. [Testing Guidelines](#testing-guidelines)

---

## Architecture

### Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Laravel (API)
- **Charts**: Recharts
- **Icons**: Lucide React

### Data Flow
```
React Frontend → Laravel API Endpoints → MySQL Database → Response Data → Chart Visualization
```

---

## Database Schema

### Required Tables

#### 1. `orders` Table
```sql
CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(255) NOT NULL UNIQUE,
    customer_id BIGINT UNSIGNED,
    payment_status ENUM('PENDING', 'PAID', 'REFUNDED', 'FAILED') NOT NULL,
    payment_date DATETIME NULL,
    sales_tax DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_payment_status (payment_status),
    INDEX idx_payment_date (payment_date),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);
```

#### 2. `order_items` Table
```sql
CREATE TABLE order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    item_type ENUM('rental', 'retail', 'damage_waiver', 'thrown_track_insurance', 'delivery') NOT NULL,
    category_id BIGINT UNSIGNED NULL,
    product_id BIGINT UNSIGNED NULL,
    product_name VARCHAR(255),
    subtotal DECIMAL(10, 2) NOT NULL,
    shipping_cost DECIMAL(10, 2) DEFAULT 0.00,
    processing_fees DECIMAL(10, 2) DEFAULT 0.00,
    quantity INT DEFAULT 1,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_order_id (order_id),
    INDEX idx_item_type (item_type),
    INDEX idx_category_id (category_id),
    INDEX idx_product_id (product_id),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);
```

#### 3. `categories` Table
```sql
CREATE TABLE categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);
```

#### 4. `products` Table
```sql
CREATE TABLE products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT UNSIGNED NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
```

---

## Business Rules

### Critical Revenue Calculation Rules

#### Rule #1: Only PAID Orders Count
- **ONLY** orders with `payment_status = 'PAID'` are included in sales calculations
- Orders with status `PENDING`, `REFUNDED`, or `FAILED` are **EXCLUDED**
- `payment_date` must NOT be NULL

#### Rule #2: Sales Tax is EXCLUDED
- Sales tax is **NEVER** included in any revenue calculations
- The `sales_tax` column in the `orders` table is ignored for reporting
- All totals represent pre-tax revenue

#### Rule #3: Revenue Formula
```
Revenue Per Order Item = subtotal + shipping_cost + processing_fees
```

**Components:**
- `subtotal`: Base price of the item(s)
- `shipping_cost`: Shipping charges (can be excluded via filter)
- `processing_fees`: Payment processing fees
- **NO sales_tax**

#### Rule #4: Filter Logic

**Item Type Filters** (Mutually Exclusive):
- `all`: Include all item types
- `rental`: Only items where `item_type = 'rental'`
- `retail`: Only items where `item_type = 'retail'`

**Special Type Filters** (Can be combined):
- `excludeWaiver`: Exclude items where `item_type = 'damage_waiver'`
- `waiverOnly`: ONLY items where `item_type = 'damage_waiver'`
- `excludeInsurance`: Exclude items where `item_type = 'thrown_track_insurance'`
- `insuranceOnly`: ONLY items where `item_type = 'thrown_track_insurance'`
- `excludeDelivery`: Exclude items where `item_type = 'delivery'`
- `deliveryOnly`: ONLY items where `item_type = 'delivery'`
- `excludeShipping`: Set `shipping_cost = 0` in calculation (don't exclude rows)

**Category & Product Filters**:
- `category`: Filter by `category_id` (if not 'all')
- `product`: Filter by `product_id` (if not 'all')

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

## API Endpoints

### Base URL
```
https://yourdomain.com/api/sales
```

### Authentication
All endpoints should require Laravel Sanctum or Passport authentication:
```
Authorization: Bearer {token}
```

### 1. Rolling 30 Days Report
```
GET /api/sales/rolling-30-days
```

**Query Parameters:**
```
itemType: string (optional) - 'all' | 'rental' | 'retail'
category: number (optional) - category_id
product: number (optional) - product_id
excludeWaiver: boolean (optional)
waiverOnly: boolean (optional)
excludeInsurance: boolean (optional)
insuranceOnly: boolean (optional)
excludeShipping: boolean (optional)
excludeDelivery: boolean (optional)
deliveryOnly: boolean (optional)
```

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-15",
      "sales": 1250.50,
      "period": "current"
    },
    {
      "date": "2024-01-14",
      "sales": 980.25,
      "period": "current"
    },
    {
      "date": "2023-12-15",
      "sales": 1100.00,
      "period": "previous"
    }
  ]
}
```

### 2. 7-Day Comparison Report
```
GET /api/sales/7-day-comparison
```

**Query Parameters:** Same as Rolling 30 Days

**Response Format:** Same structure as Rolling 30 Days

### 3. Last Month Report
```
GET /api/sales/last-month-comparison
```

**Query Parameters:** Same as Rolling 30 Days

**Response Format:** Same structure as Rolling 30 Days

### 4. Top Products Report
```
GET /api/sales/top-products
```

**Query Parameters:**
```
limit: number (optional, default: 10) - Number of top products to return
```

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "productName": "Premium Rental Package",
      "totalSales": 25000.00,
      "orderCount": 45
    },
    {
      "productName": "Damage Waiver",
      "totalSales": 18500.00,
      "orderCount": 123
    }
  ]
}
```

### 5. Filter Options (Dropdowns)
```
GET /api/sales/filter-options
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": 1,
        "name": "Party Rentals"
      },
      {
        "id": 2,
        "name": "Event Equipment"
      }
    ],
    "products": [
      {
        "id": 1,
        "name": "Bounce House",
        "categoryId": 1
      },
      {
        "id": 2,
        "name": "Table & Chairs Set",
        "categoryId": 1
      }
    ]
  }
}
```

---

## Laravel Implementation

### Directory Structure
```
app/
├── Http/
│   ├── Controllers/
│   │   └── Api/
│   │       └── SalesReportController.php
│   ├── Requests/
│   │   └── SalesReportRequest.php
│   └── Resources/
│       ├── SalesDataPointResource.php
│       └── TopProductResource.php
├── Services/
│   └── SalesReportService.php
└── Models/
    ├── Order.php
    ├── OrderItem.php
    ├── Category.php
    └── Product.php
```

### Step 1: Create Models

#### Order Model
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'order_number',
        'customer_id',
        'payment_status',
        'payment_date',
        'sales_tax',
    ];

    protected $casts = [
        'payment_date' => 'datetime',
        'sales_tax' => 'decimal:2',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function scopePaid($query)
    {
        return $query->where('payment_status', 'PAID')
                    ->whereNotNull('payment_date');
    }
}
```

#### OrderItem Model
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    protected $fillable = [
        'order_id',
        'item_type',
        'category_id',
        'product_id',
        'product_name',
        'subtotal',
        'shipping_cost',
        'processing_fees',
        'quantity',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'shipping_cost' => 'decimal:2',
        'processing_fees' => 'decimal:2',
        'quantity' => 'integer',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
```

### Step 2: Create Service Class

#### SalesReportService.php
```php
<?php

namespace App\Services;

use App\Models\OrderItem;
use Illuminate\Support\Collection;
use Carbon\Carbon;

class SalesReportService
{
    /**
     * Get rolling 30 days comparison
     */
    public function getRolling30Days(array $filters = []): Collection
    {
        $today = Carbon::today();
        $thirtyDaysAgo = $today->copy()->subDays(30);
        $sixtyDaysAgo = $today->copy()->subDays(60);

        $query = $this->buildBaseQuery($filters);
        $data = $query->get();

        return $this->formatDateRangeData(
            $data,
            $sixtyDaysAgo,
            $today,
            30,
            $filters
        );
    }

    /**
     * Get 7-day comparison
     */
    public function get7DayComparison(array $filters = []): Collection
    {
        $today = Carbon::today();
        $sevenDaysAgo = $today->copy()->subDays(7);
        $fourteenDaysAgo = $today->copy()->subDays(14);

        $query = $this->buildBaseQuery($filters);
        $data = $query->get();

        return $this->formatDateRangeData(
            $data,
            $fourteenDaysAgo,
            $today,
            7,
            $filters
        );
    }

    /**
     * Get last month comparison (complete previous month vs month before that)
     */
    public function getLastMonthComparison(array $filters = []): Collection
    {
        $today = Carbon::today();

        // Get first day of current month
        $firstDayCurrentMonth = $today->copy()->startOfMonth();

        // Last month (previous complete month)
        $lastMonthStart = $firstDayCurrentMonth->copy()->subMonth()->startOfMonth();
        $lastMonthEnd = $firstDayCurrentMonth->copy()->subMonth()->endOfMonth();

        // Month before last month
        $monthBeforeLastStart = $lastMonthStart->copy()->subMonth()->startOfMonth();
        $monthBeforeLastEnd = $lastMonthStart->copy()->subMonth()->endOfMonth();

        $query = $this->buildBaseQuery($filters);
        $data = $query->get();

        $salesByDate = $this->aggregateSalesByDate($data, $filters);

        $result = collect();

        // Add month before last (previous period)
        $daysInMonthBeforeLast = $monthBeforeLastStart->daysInMonth;
        for ($i = 0; $i < $daysInMonthBeforeLast; $i++) {
            $date = $monthBeforeLastStart->copy()->addDays($i);
            $dateStr = $date->format('Y-m-d');

            $result->push([
                'date' => $dateStr,
                'sales' => $salesByDate[$dateStr] ?? 0,
                'period' => 'previous'
            ]);
        }

        // Add last month (current period)
        $daysInLastMonth = $lastMonthStart->daysInMonth;
        for ($i = 0; $i < $daysInLastMonth; $i++) {
            $date = $lastMonthStart->copy()->addDays($i);
            $dateStr = $date->format('Y-m-d');

            $result->push([
                'date' => $dateStr,
                'sales' => $salesByDate[$dateStr] ?? 0,
                'period' => 'current'
            ]);
        }

        return $result;
    }

    /**
     * Get top products by sales
     */
    public function getTopProducts(int $limit = 10): Collection
    {
        return OrderItem::query()
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.payment_status', 'PAID')
            ->whereNotNull('orders.payment_date')
            ->selectRaw('
                order_items.product_name,
                SUM(order_items.subtotal +
                    COALESCE(order_items.shipping_cost, 0) +
                    COALESCE(order_items.processing_fees, 0)) as total_sales,
                COUNT(DISTINCT order_items.order_id) as order_count
            ')
            ->groupBy('order_items.product_name')
            ->orderByDesc('total_sales')
            ->limit($limit)
            ->get()
            ->map(fn($item) => [
                'productName' => $item->product_name,
                'totalSales' => (float) $item->total_sales,
                'orderCount' => (int) $item->order_count,
            ]);
    }

    /**
     * Build base query with filters
     */
    protected function buildBaseQuery(array $filters)
    {
        $query = OrderItem::query()
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.payment_status', 'PAID')
            ->whereNotNull('orders.payment_date')
            ->select(
                'order_items.*',
                'orders.payment_date'
            );

        // Category filter
        if (!empty($filters['category']) && $filters['category'] !== 'all') {
            $query->where('order_items.category_id', $filters['category']);
        }

        // Product filter
        if (!empty($filters['product']) && $filters['product'] !== 'all') {
            $query->where('order_items.product_id', $filters['product']);
        }

        // Item type filter
        if (!empty($filters['itemType'])) {
            if ($filters['itemType'] === 'rental') {
                $query->where('order_items.item_type', 'rental');
            } elseif ($filters['itemType'] === 'retail') {
                $query->where('order_items.item_type', 'retail');
            }
        }

        // Exclude/Only filters
        if (!empty($filters['excludeWaiver'])) {
            $query->where('order_items.item_type', '!=', 'damage_waiver');
        }

        if (!empty($filters['waiverOnly'])) {
            $query->where('order_items.item_type', 'damage_waiver');
        }

        if (!empty($filters['excludeInsurance'])) {
            $query->where('order_items.item_type', '!=', 'thrown_track_insurance');
        }

        if (!empty($filters['insuranceOnly'])) {
            $query->where('order_items.item_type', 'thrown_track_insurance');
        }

        if (!empty($filters['excludeDelivery'])) {
            $query->where('order_items.item_type', '!=', 'delivery');
        }

        if (!empty($filters['deliveryOnly'])) {
            $query->where('order_items.item_type', 'delivery');
        }

        return $query;
    }

    /**
     * Aggregate sales by date
     */
    protected function aggregateSalesByDate(Collection $data, array $filters): array
    {
        $salesByDate = [];
        $excludeShipping = !empty($filters['excludeShipping']);

        foreach ($data as $item) {
            $date = Carbon::parse($item->payment_date)->format('Y-m-d');
            $shippingCost = $excludeShipping ? 0 : (float) $item->shipping_cost;

            // Revenue formula: subtotal + shipping + fees (NO tax)
            $amount = (float) $item->subtotal + $shippingCost + (float) $item->processing_fees;

            if (!isset($salesByDate[$date])) {
                $salesByDate[$date] = 0;
            }
            $salesByDate[$date] += $amount;
        }

        return $salesByDate;
    }

    /**
     * Format data for date range comparison
     */
    protected function formatDateRangeData(
        Collection $data,
        Carbon $startDate,
        Carbon $endDate,
        int $periodDays,
        array $filters
    ): Collection {
        $salesByDate = $this->aggregateSalesByDate($data, $filters);
        $result = collect();

        // Previous period
        for ($i = 0; $i < $periodDays; $i++) {
            $date = $startDate->copy()->addDays($i);
            $dateStr = $date->format('Y-m-d');

            $result->push([
                'date' => $dateStr,
                'sales' => $salesByDate[$dateStr] ?? 0,
                'period' => 'previous'
            ]);
        }

        // Current period
        $currentStart = $endDate->copy()->subDays($periodDays);
        for ($i = 0; $i < $periodDays; $i++) {
            $date = $currentStart->copy()->addDays($i);
            $dateStr = $date->format('Y-m-d');

            $result->push([
                'date' => $dateStr,
                'sales' => $salesByDate[$dateStr] ?? 0,
                'period' => 'current'
            ]);
        }

        return $result;
    }
}
```

### Step 3: Create Controller

#### SalesReportController.php
```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SalesReportService;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SalesReportController extends Controller
{
    protected SalesReportService $salesService;

    public function __construct(SalesReportService $salesService)
    {
        $this->salesService = $salesService;
    }

    /**
     * Rolling 30 days report
     */
    public function rolling30Days(Request $request): JsonResponse
    {
        $filters = $this->getFilters($request);
        $data = $this->salesService->getRolling30Days($filters);

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    /**
     * 7-day comparison report
     */
    public function sevenDayComparison(Request $request): JsonResponse
    {
        $filters = $this->getFilters($request);
        $data = $this->salesService->get7DayComparison($filters);

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    /**
     * Last month comparison report
     */
    public function lastMonthComparison(Request $request): JsonResponse
    {
        $filters = $this->getFilters($request);
        $data = $this->salesService->getLastMonthComparison($filters);

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    /**
     * Top products report
     */
    public function topProducts(Request $request): JsonResponse
    {
        $limit = $request->input('limit', 10);
        $data = $this->salesService->getTopProducts($limit);

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    /**
     * Get filter options (categories and products)
     */
    public function filterOptions(): JsonResponse
    {
        $categories = Category::select('id', 'name')
            ->orderBy('name')
            ->get();

        $products = Product::select('id', 'name', 'category_id')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'categories' => $categories,
                'products' => $products
            ]
        ]);
    }

    /**
     * Extract filters from request
     */
    protected function getFilters(Request $request): array
    {
        return [
            'itemType' => $request->input('itemType', 'all'),
            'category' => $request->input('category', 'all'),
            'product' => $request->input('product', 'all'),
            'excludeWaiver' => $request->boolean('excludeWaiver'),
            'waiverOnly' => $request->boolean('waiverOnly'),
            'excludeInsurance' => $request->boolean('excludeInsurance'),
            'insuranceOnly' => $request->boolean('insuranceOnly'),
            'excludeShipping' => $request->boolean('excludeShipping'),
            'excludeDelivery' => $request->boolean('excludeDelivery'),
            'deliveryOnly' => $request->boolean('deliveryOnly'),
        ];
    }
}
```

### Step 4: Register Routes

#### routes/api.php
```php
<?php

use App\Http\Controllers\Api\SalesReportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->prefix('sales')->group(function () {
    Route::get('/rolling-30-days', [SalesReportController::class, 'rolling30Days']);
    Route::get('/7-day-comparison', [SalesReportController::class, 'sevenDayComparison']);
    Route::get('/last-month-comparison', [SalesReportController::class, 'lastMonthComparison']);
    Route::get('/top-products', [SalesReportController::class, 'topProducts']);
    Route::get('/filter-options', [SalesReportController::class, 'filterOptions']);
});
```

### Step 5: Create Migrations

#### Create Orders Migration
```bash
php artisan make:migration create_orders_table
```

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('payment_status', ['PENDING', 'PAID', 'REFUNDED', 'FAILED']);
            $table->dateTime('payment_date')->nullable();
            $table->decimal('sales_tax', 10, 2)->default(0);
            $table->timestamps();

            $table->index('payment_status');
            $table->index('payment_date');
        });
    }

    public function down()
    {
        Schema::dropIfExists('orders');
    }
};
```

#### Create Order Items Migration
```bash
php artisan make:migration create_order_items_table
```

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->enum('item_type', [
                'rental',
                'retail',
                'damage_waiver',
                'thrown_track_insurance',
                'delivery'
            ]);
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_name');
            $table->decimal('subtotal', 10, 2);
            $table->decimal('shipping_cost', 10, 2)->default(0);
            $table->decimal('processing_fees', 10, 2)->default(0);
            $table->integer('quantity')->default(1);
            $table->timestamps();

            $table->index('item_type');
            $table->index('category_id');
            $table->index('product_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('order_items');
    }
};
```

---

## Frontend Integration

### Step 1: Update Environment Variables

Create or update `.env` file in your React project:

```env
VITE_API_BASE_URL=https://yourdomain.com/api
VITE_API_TOKEN=your_laravel_sanctum_token
```

### Step 2: Update API Service

Update `src/services/salesApi.ts` to use Laravel endpoints:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_TOKEN = import.meta.env.VITE_API_TOKEN;

const headers = {
  'Authorization': `Bearer ${API_TOKEN}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Update each function to use Laravel endpoints
async getRolling30Days(filters: SalesFilters = {}): Promise<SalesDataPoint[]> {
  const queryString = new URLSearchParams(
    Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== 'all' && value !== false) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  const response = await fetch(
    `${API_BASE_URL}/sales/rolling-30-days?${queryString}`,
    { headers }
  );

  const result = await response.json();
  return result.data;
}
```

### Step 3: Deploy React App

#### Option A: Separate Domain
Deploy React app to a separate domain (e.g., dashboard.yourdomain.com)

#### Option B: Laravel Integration
Place built React files in Laravel's public directory:

1. Build the React app:
```bash
npm run build
```

2. Copy `dist` folder contents to Laravel:
```bash
cp -r dist/* /path/to/laravel/public/dashboard/
```

3. Create a Laravel route to serve the React app:
```php
// routes/web.php
Route::get('/dashboard/{any}', function () {
    return view('dashboard');
})->where('any', '.*');
```

4. Create blade view:
```blade
<!-- resources/views/dashboard.blade.php -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sales Dashboard</title>
    <link rel="stylesheet" href="{{ asset('dashboard/assets/index.css') }}">
</head>
<body>
    <div id="root"></div>
    <script type="module" src="{{ asset('dashboard/assets/index.js') }}"></script>
</body>
</html>
```

---

## Testing Guidelines

### Backend Testing

#### 1. Unit Tests for Service Layer
```bash
php artisan make:test SalesReportServiceTest --unit
```

Test cases:
- Verify only PAID orders are included
- Verify sales tax is excluded
- Verify revenue formula (subtotal + shipping + fees)
- Test each filter independently
- Test filter combinations
- Verify date range calculations

#### 2. Feature Tests for API Endpoints
```bash
php artisan make:test SalesReportApiTest
```

Test cases:
- Test each endpoint returns correct structure
- Test authentication requirements
- Test filter parameters
- Test empty results
- Test large datasets

### Frontend Testing

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

1. **Database Indexing**: Ensure indexes exist on:
   - `orders.payment_status`
   - `orders.payment_date`
   - `order_items.order_id`
   - `order_items.item_type`
   - `order_items.category_id`
   - `order_items.product_id`

2. **Query Optimization**:
   - Use eager loading for relationships
   - Consider caching for filter options
   - Add database query logging in development

3. **API Response Time**:
   - Target: < 500ms for report endpoints
   - Consider Redis caching for heavy queries
   - Use database query caching

---

## Deployment Checklist

### Backend (Laravel)
- [ ] Run migrations on production database
- [ ] Configure CORS for frontend domain
- [ ] Set up Sanctum authentication
- [ ] Configure rate limiting on API routes
- [ ] Test API endpoints with Postman/Insomnia
- [ ] Set up error logging and monitoring
- [ ] Configure database indexes
- [ ] Set up scheduled tasks (if needed for data aggregation)

### Frontend (React)
- [ ] Update `.env` with production API URL
- [ ] Build production bundle
- [ ] Deploy to hosting/CDN
- [ ] Test all report types in production
- [ ] Verify authentication flow
- [ ] Test on multiple browsers
- [ ] Test responsive design
- [ ] Set up error tracking (e.g., Sentry)

### Documentation
- [ ] Update API documentation
- [ ] Document authentication setup
- [ ] Create user guide for dashboard
- [ ] Document filter behavior
- [ ] Create troubleshooting guide

---

## Common Issues & Solutions

### Issue: Incorrect Sales Totals
**Solution**: Verify:
1. Only PAID orders are being counted
2. Sales tax is NOT included in calculations
3. Shipping cost exclusion filter is working
4. Item type filters are applied correctly

### Issue: Date Ranges Don't Match
**Solution**: Check:
1. Server timezone matches expected timezone
2. Carbon date calculations in service layer
3. Frontend date formatting matches backend

### Issue: Performance Issues
**Solution**:
1. Add database indexes
2. Implement query caching
3. Use pagination for top products
4. Consider data aggregation tables for large datasets

### Issue: CORS Errors
**Solution**: Update `config/cors.php`:
```php
'paths' => ['api/*'],
'allowed_origins' => ['https://dashboard.yourdomain.com'],
'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
'allowed_headers' => ['*'],
```

---

## Support & Maintenance

### Regular Maintenance Tasks
1. Review query performance monthly
2. Archive old sales data (keep aggregated totals)
3. Update test data to reflect current business rules
4. Review and optimize indexes
5. Monitor API response times

### Future Enhancements
- Export to CSV/Excel
- Email scheduled reports
- Custom date range selection
- Year-over-year comparisons
- Revenue forecasting
- Product category drill-down
- Customer segmentation analysis

---

## Contact & Resources

### Development Team Contacts
- **Project Lead**: [Name/Email]
- **Backend Developer**: [Name/Email]
- **Frontend Developer**: [Name/Email]

### Technical Resources
- Laravel Documentation: https://laravel.com/docs
- React Documentation: https://react.dev
- Recharts Documentation: https://recharts.org
- Carbon (PHP Dates): https://carbon.nesbot.com/docs

---

**Document Version**: 1.0
**Last Updated**: January 14, 2026
**Next Review Date**: March 14, 2026
