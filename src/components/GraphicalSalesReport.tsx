import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  DollarSign,
  Filter,
  Info,
  X,
  TrendingUp,
  Package,
  ShoppingBag
} from 'lucide-react';
import { salesApi, SalesFilters } from '../services/salesApi';
import DateFilter from './DateFilter';

interface DailySalesData {
  date: string;
  sales: number;
}

interface RevenueBreakdownData {
  name: string;
  value: number;
  color: string;
}

export default function GraphicalSalesReport() {
  const [showInstructions, setShowInstructions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [revenueViewMode, setRevenueViewMode] = useState<'dollars' | 'percentage'>('dollars');

  const [dailySales, setDailySales] = useState<DailySalesData[]>([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdownData[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topCategories, setTopCategories] = useState<any[]>([]);
  const [salesSummary, setSalesSummary] = useState<any>(null);
  const [showTopProducts, setShowTopProducts] = useState(false);
  const [showTopCategories, setShowTopCategories] = useState(false);

  const [filters, setFilters] = useState<SalesFilters>({
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
    deliveryOnly: false,
    dateRange: 'rolling_30',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadStores();
    loadCategories();
  }, []);

  useEffect(() => {
    if (filters.category && filters.category !== 'all') {
      loadProducts(filters.category);
    } else {
      setProducts([]);
      setFilters(prev => ({ ...prev, product: 'all' }));
    }
  }, [filters.category]);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadStores = async () => {
    try {
      const data = await salesApi.getStores();
      setStores(data);
    } catch (error) {
      console.error('Error loading stores:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await salesApi.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProducts = async (categoryId: string) => {
    try {
      const data = await salesApi.getProducts(categoryId);
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadTopProducts = async () => {
    try {
      const data = await salesApi.getTopProducts(10);
      setTopProducts(data);
      setShowTopProducts(true);
      setShowTopCategories(false);
    } catch (error) {
      console.error('Error loading top products:', error);
    }
  };

  const loadTopCategories = async () => {
    try {
      const data = await salesApi.getTopCategories(5);
      setTopCategories(data);
      setShowTopCategories(true);
      setShowTopProducts(false);
    } catch (error) {
      console.error('Error loading top categories:', error);
    }
  };

  const hideTopLists = () => {
    setShowTopProducts(false);
    setShowTopCategories(false);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [salesData, revenueData, productsData, summaryData] = await Promise.all([
        salesApi.getRolling30Days(filters),
        salesApi.getRevenueBreakdown(filters),
        salesApi.getTopProducts(10),
        salesApi.getSalesSummary(filters)
      ]);

      const currentPeriod = salesData.filter(d => d.period === 'current');
      setDailySales(currentPeriod.map(d => ({
        date: d.date,
        sales: d.sales
      })));

      const breakdown: RevenueBreakdownData[] = [
        { name: 'Retail Sales', value: revenueData.retailSales, color: '#3b82f6' },
        { name: 'Rental Revenue', value: revenueData.rentalRevenue, color: '#10b981' },
        { name: 'Delivery', value: revenueData.deliveryRevenue, color: '#f59e0b' },
        { name: 'Damage Waiver', value: revenueData.damageWaiverRevenue, color: '#8b5cf6' },
        { name: 'Track Insurance', value: revenueData.trackInsuranceRevenue, color: '#ec4899' },
        { name: 'Other Fees', value: revenueData.feesOtherRevenue, color: '#6366f1' }
      ].filter(item => item.value > 0);

      setRevenueBreakdown(breakdown);
      setTopProducts(productsData);
      setSalesSummary(summaryData);
    } catch (error) {
      console.error('Error loading sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
  };

  const totalRevenue = revenueBreakdown.reduce((sum, item) => sum + item.value, 0);

  const getLabelClass = (isExcludeFilter: boolean) => {
    const hasExcludeFilters = filters.excludeWaiver || filters.excludeInsurance || filters.excludeDelivery || filters.excludeShipping;
    const hasOnlyFilters = filters.waiverOnly || filters.insuranceOnly || filters.deliveryOnly;

    if (!hasExcludeFilters && !hasOnlyFilters) {
      return "text-sm text-slate-700";
    }

    if (hasExcludeFilters && isExcludeFilter) {
      return "text-sm text-slate-700 font-bold";
    }

    if (hasOnlyFilters && !isExcludeFilter) {
      return "text-sm text-slate-700 font-bold";
    }

    return "text-sm text-slate-400";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-slate-900">Graphical Sales Report</h1>
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <Info size={18} />
              {showInstructions ? 'Hide' : 'Show'} Instructions
            </button>
          </div>
        </div>

        {showInstructions && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold text-blue-900">Business Rules</h2>
              <button
                onClick={() => setShowInstructions(false)}
                className="text-blue-600 hover:text-blue-800"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 text-sm text-blue-800">
              <p><strong>Rule #1:</strong> PAID orders are ADDED to sales totals; REFUNDED orders are SUBTRACTED from sales totals</p>
              <p><strong>Rule #2:</strong> Sales tax is excluded from all totals</p>
              <p><strong>Rule #3:</strong> Formula: PAID = +(subtotal + shipping + fees); REFUNDED = -(subtotal + shipping + fees)</p>
              <p><strong>Filters:</strong> Use filters to analyze specific categories, products, or revenue types</p>
            </div>
          </div>
        )}

        <div className="mb-6 bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Filter className="text-slate-600" size={18} />
              <h2 className="text-base font-semibold text-slate-900">Filters</h2>
            </div>
            <button
              onClick={() => setFilters({
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
                deliveryOnly: false,
                dateRange: 'rolling_30',
                startDate: '',
                endDate: ''
              })}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>

          <div className="flex items-end gap-4 mb-4">
            <DateFilter
              dateRange={filters.dateRange || 'rolling_30'}
              startDate={filters.startDate}
              endDate={filters.endDate}
              onDateRangeChange={(range) => setFilters({ ...filters, dateRange: range })}
              onStartDateChange={(date) => setFilters({ ...filters, startDate: date })}
              onEndDateChange={(date) => setFilters({ ...filters, endDate: date })}
            />

            <div style={{ width: '115px', flexShrink: 0 }}>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Store
              </label>
              <select
                value={filters.store}
                onChange={(e) => setFilters({ ...filters, store: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="all">All Stores</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>

            <div style={{ width: '120px', flexShrink: 0 }}>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Item Type
              </label>
              <select
                value={filters.itemType}
                onChange={(e) => setFilters({ ...filters, itemType: e.target.value as 'all' | 'rental' | 'retail' })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="all">All Items</option>
                <option value="rental">Rental Only</option>
                <option value="retail">Retail Only</option>
              </select>
            </div>

            <div style={{ width: '200px', flexShrink: 0 }}>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div style={{ width: '200px', flexShrink: 0 }}>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Product
              </label>
              <select
                value={filters.product}
                onChange={(e) => setFilters({ ...filters, product: e.target.value })}
                disabled={filters.category === 'all'}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="all">All Products</option>
                {products.map(prod => (
                  <option key={prod.id} value={prod.id}>{prod.name}</option>
                ))}
              </select>
            </div>

            <div style={{ width: '200px', flexShrink: 0 }}>
              <select
                value={showTopProducts ? 'products' : showTopCategories ? 'categories' : 'none'}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'products') {
                    loadTopProducts();
                  } else if (value === 'categories') {
                    loadTopCategories();
                  } else {
                    hideTopLists();
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="none">Select List...</option>
                <option value="products">Top 10 Products</option>
                <option value="categories">Top 5 Categories</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            {filters.itemType !== 'retail' && (
              <>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.excludeWaiver || false}
                    onChange={(e) => setFilters({
                      ...filters,
                      excludeWaiver: e.target.checked,
                      waiverOnly: false
                    })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className={getLabelClass(true)}>Exclude Damage Waiver</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.waiverOnly || false}
                    onChange={(e) => setFilters({
                      ...filters,
                      waiverOnly: e.target.checked,
                      excludeWaiver: false
                    })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className={getLabelClass(false)}>Damage Waiver Only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.excludeInsurance || false}
                    onChange={(e) => setFilters({
                      ...filters,
                      excludeInsurance: e.target.checked,
                      insuranceOnly: false
                    })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className={getLabelClass(true)}>Exclude Track Ins.</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.insuranceOnly || false}
                    onChange={(e) => setFilters({
                      ...filters,
                      insuranceOnly: e.target.checked,
                      excludeInsurance: false
                    })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className={getLabelClass(false)}>Track Ins. Only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.excludeDelivery || false}
                    onChange={(e) => setFilters({
                      ...filters,
                      excludeDelivery: e.target.checked,
                      deliveryOnly: false
                    })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className={getLabelClass(true)}>Exclude Delivery</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.deliveryOnly || false}
                    onChange={(e) => setFilters({
                      ...filters,
                      deliveryOnly: e.target.checked,
                      excludeDelivery: false
                    })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className={getLabelClass(false)}>Delivery Only</span>
                </label>
              </>
            )}
            {filters.itemType !== 'rental' && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.excludeShipping || false}
                  onChange={(e) => setFilters({
                    ...filters,
                    excludeShipping: e.target.checked
                  })}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className={getLabelClass(true)}>Exclude Shipping</span>
              </label>
            )}
          </div>
        </div>

        <div className="flex gap-4 mb-8">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4 text-center flex-1">
            <div className="text-xs font-medium text-slate-600 mb-2">Total Net Sales</div>
            <div className="text-2xl font-bold text-blue-600">
              {loading ? '...' : formatCurrency(salesSummary?.totalNetSales || 0)}
            </div>
          </div>

          <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-4 text-center flex-1">
            <div className="text-xs font-medium text-slate-600 mb-2">Transactions</div>
            <div className="text-2xl font-bold text-green-600">
              {loading ? '...' : (salesSummary?.transactionCount || 0).toLocaleString()}
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-4 text-center flex-1">
            <div className="text-xs font-medium text-slate-600 mb-2">Avg Sale Value</div>
            <div className="text-2xl font-bold text-orange-600">
              {loading ? '...' : formatCurrency(salesSummary?.averageSaleValue || 0)}
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-100 rounded-2xl px-4 py-4 text-center flex-1">
            <div className="text-xs font-medium text-slate-600 mb-2">Items Sold</div>
            <div className="text-2xl font-bold text-purple-600">
              {loading ? '...' : (salesSummary?.itemsSold || 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Daily Sales Trend</h2>
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            {loading ? (
              <div className="h-96 flex items-center justify-center">
                <div className="text-slate-400">Loading chart data...</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={dailySales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    stroke="#94a3b8"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                    stroke="#94a3b8"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    formatter={(value: any) => formatCurrency(value)}
                    labelFormatter={formatDate}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={{ fill: '#3b82f6', r: 3 }}
                    activeDot={{ r: 5 }}
                    name="Daily Sales"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">Revenue Breakdown</h2>
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setRevenueViewMode('dollars')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                    revenueViewMode === 'dollars'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Dollars
                </button>
                <button
                  onClick={() => setRevenueViewMode('percentage')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                    revenueViewMode === 'percentage'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Percentage
                </button>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              {loading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-slate-400">Loading chart data...</div>
                </div>
              ) : revenueBreakdown.length > 0 ? (
                <div className="flex items-center">
                  <ResponsiveContainer width="60%" height={300}>
                    <PieChart>
                      <Pie
                        data={revenueBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {revenueBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) =>
                          revenueViewMode === 'dollars'
                            ? formatCurrency(value)
                            : `${((value / totalRevenue) * 100).toFixed(1)}%`
                        }
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="w-40% pl-4">
                    {revenueBreakdown.map((item, index) => (
                      <div key={index} className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-xs text-slate-700">{item.name}</span>
                        </div>
                        <div className="text-xs font-semibold text-slate-900">
                          {revenueViewMode === 'dollars'
                            ? formatCurrency(item.value)
                            : `${((item.value / totalRevenue) * 100).toFixed(1)}%`
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-slate-400">
                  No revenue data available
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              {showTopCategories ? 'Top 5 Categories' : 'Top 10 Products'}
            </h2>
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              {loading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-slate-400">Loading chart data...</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={showTopCategories ? topCategories : topProducts}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      stroke="#94a3b8"
                      style={{ fontSize: '11px' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      stroke="#94a3b8"
                      style={{ fontSize: '10px' }}
                    />
                    <Tooltip
                      formatter={(value: any) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar
                      dataKey="total_sales"
                      fill={showTopCategories ? '#10b981' : '#3b82f6'}
                      name="Total Sales"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
