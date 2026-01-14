import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Filter,
  Info,
  X
} from 'lucide-react';
import { salesApi, SalesDataPoint, TopProduct, SalesFilters } from '../services/salesApi';

type ReportType = 'rolling30' | '7day' | 'lastMonth' | 'ytd';

export default function SalesTrendReport() {
  const [reportType, setReportType] = useState<ReportType>('rolling30');
  const [chartData, setChartData] = useState<SalesDataPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [showTopProducts, setShowTopProducts] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [filters, setFilters] = useState<SalesFilters>({
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
  });

  useEffect(() => {
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
  }, [reportType, filters]);

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

  const loadData = async () => {
    setLoading(true);
    try {
      let data: SalesDataPoint[] = [];

      if (reportType === 'rolling30') {
        data = await salesApi.getRolling30Days(filters);
      } else if (reportType === '7day') {
        data = await salesApi.get7DayComparison(filters);
      } else if (reportType === 'lastMonth') {
        data = await salesApi.getLastMonthComparison(filters);
      }

      setChartData(data);

      if (showTopProducts) {
        const topProductsData = await salesApi.getTopProducts(10);
        setTopProducts(topProductsData);
      }
    } catch (error) {
      console.error('Error loading sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTopProducts = async () => {
    try {
      const data = await salesApi.getTopProducts(10);
      setTopProducts(data);
      setShowTopProducts(true);
    } catch (error) {
      console.error('Error loading top products:', error);
    }
  };

  const currentPeriodData = chartData.filter(d => d.period === 'current');
  const previousPeriodData = chartData.filter(d => d.period === 'previous');

  const currentTotal = currentPeriodData.reduce((sum, d) => sum + d.sales, 0);
  const previousTotal = previousPeriodData.reduce((sum, d) => sum + d.sales, 0);
  const growthRate = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;
  const currentAverage = currentTotal / (currentPeriodData.length || 1);

  const comparisonChartData = currentPeriodData.map((current, index) => {
    const previous = previousPeriodData[index];
    return {
      date: current.date,
      dayLabel: `Day ${index + 1}`,
      currentPeriod: current.sales,
      previousPeriod: previous?.sales || 0
    };
  });

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.itemType !== 'all') count++;
    if (filters.category !== 'all') count++;
    if (filters.product !== 'all') count++;
    if (filters.excludeWaiver) count++;
    if (filters.waiverOnly) count++;
    if (filters.excludeInsurance) count++;
    if (filters.insuranceOnly) count++;
    if (filters.excludeShipping) count++;
    if (filters.excludeDelivery) count++;
    if (filters.deliveryOnly) count++;
    return count;
  };

  const clearAllFilters = () => {
    setFilters({
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
    });
  };

  const hideTopProducts = () => {
    setShowTopProducts(false);
    setFilters({
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
    });
  };

  const getReportDescription = () => {
    switch (reportType) {
      case 'rolling30':
        return 'Compare last 30 days vs previous 30 days';
      case '7day':
        return 'Compare last 7 days vs previous 7 days';
      case 'lastMonth':
        return 'Compare previous complete month vs month before that';
      case 'ytd':
        return 'Year-to-date comparison with previous year';
      default:
        return '';
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
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-slate-900">Sales Trend Analysis</h1>
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
              <p><strong>Rule #1:</strong> Only PAID orders count in sales calculations</p>
              <p><strong>Rule #2:</strong> Sales tax is excluded from all totals</p>
              <p><strong>Rule #3:</strong> Formula: sales = subtotal + shipping + fees (no tax)</p>
              <p><strong>Filters:</strong> Use filters to analyze specific categories, products, or revenue types</p>
            </div>
          </div>
        )}

        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setReportType('rolling30')}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
              reportType === 'rolling30'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Rolling 30 Days
          </button>
          <button
            onClick={() => setReportType('7day')}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
              reportType === '7day'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Current Month
          </button>
          <button
            onClick={() => setReportType('lastMonth')}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
              reportType === 'lastMonth'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Last Month
          </button>
        </div>

        <div className="mb-6 bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Filter className="text-slate-600" size={18} />
              <h2 className="text-base font-semibold text-slate-900">Filters</h2>
            </div>
            <button
              onClick={() => setFilters({
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
              })}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>

          <div className="flex items-end gap-6 mb-4">
            <div className="flex-1">
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

            <div className="flex-1">
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

            <div className="flex-1">
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

            <button
              onClick={showTopProducts ? hideTopProducts : loadTopProducts}
              className={`px-5 py-2 text-sm rounded-lg font-medium transition-all whitespace-nowrap ${
                showTopProducts
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {showTopProducts ? 'Hide Top 10 Products' : 'Show Top 10 Products'}
            </button>
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            {(() => {
              // Determine which filter types are active
              const hasExcludeFilters = filters.excludeWaiver || filters.excludeInsurance || filters.excludeDelivery || filters.excludeShipping;
              const hasOnlyFilters = filters.waiverOnly || filters.insuranceOnly || filters.deliveryOnly;

              // Helper function to get label styling
              const getLabelClass = (isExcludeFilter: boolean) => {
                if (!hasExcludeFilters && !hasOnlyFilters) {
                  return "text-sm text-slate-700"; // Normal state
                }

                if (hasExcludeFilters && isExcludeFilter) {
                  return "text-sm text-slate-700 font-bold"; // Bold for combinable excludes
                }

                if (hasOnlyFilters && !isExcludeFilter) {
                  return "text-sm text-slate-700 font-bold"; // Bold for combinable onlys
                }

                return "text-sm text-slate-400"; // Grey out incompatible
              };

              return (
                <>
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
                </>
              );
            })()}
          </div>
        </div>

        <div className="flex gap-4 mb-8 max-w-3xl mx-auto">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4 text-center flex-1">
            <div className="text-xs font-medium text-slate-600 mb-2">Total Sales</div>
            <div className="text-2xl font-bold text-blue-600">
              {loading ? '...' : formatCurrency(currentTotal)}
            </div>
          </div>

          <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-4 text-center flex-1">
            <div className="text-xs font-medium text-slate-600 mb-2">Previous Period</div>
            <div className="text-2xl font-bold text-green-600">
              {loading ? '...' : formatCurrency(previousTotal)}
            </div>
          </div>

          <div className="bg-teal-50 border border-teal-100 rounded-2xl px-4 py-4 text-center flex-1">
            <div className="text-xs font-medium text-slate-600 mb-2">Growth Rate</div>
            <div className={`text-2xl font-bold flex items-center justify-center gap-2 ${
              growthRate >= 0 ? 'text-teal-600' : 'text-red-600'
            }`}>
              {growthRate >= 0 ? (
                <TrendingUp size={20} />
              ) : (
                <TrendingDown size={20} />
              )}
              {loading ? '...' : `${growthRate.toFixed(1)}%`}
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-100 rounded-2xl px-4 py-4 text-center flex-1">
            <div className="text-xs font-medium text-slate-600 mb-2">Daily Average</div>
            <div className="text-2xl font-bold text-purple-600">
              {loading ? '...' : formatCurrency(currentAverage)}
            </div>
          </div>
        </div>

        {!showTopProducts ? (
          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-4">Sales Trend</h2>
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              {loading ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="text-slate-400">Loading chart data...</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={450}>
                  <LineChart data={comparisonChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      angle={-45}
                      textAnchor="end"
                      height={100}
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
                    <Legend
                      wrapperStyle={{ fontSize: '12px' }}
                      iconType="line"
                    />
                    <Line
                      type="monotone"
                      dataKey="currentPeriod"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={{ fill: '#3b82f6', r: 3 }}
                      activeDot={{ r: 5 }}
                      name="Current Period"
                    />
                    <Line
                      type="monotone"
                      dataKey="previousPeriod"
                      stroke="#94a3b8"
                      strokeWidth={2.5}
                      strokeDasharray="5 5"
                      dot={{ fill: '#94a3b8', r: 3 }}
                      activeDot={{ r: 5 }}
                      name="Previous Period"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">Top 10 Products</h2>
              <button
                onClick={() => setShowTopProducts(false)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Back to Trend
              </button>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={120}
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
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar
                    dataKey="total_sales"
                    fill="#3b82f6"
                    name="Total Sales"
                    radius={[4, 4, 0, 0]}
                    label={{
                      position: 'top',
                      formatter: (value: number) => formatCurrency(value),
                      style: { fontSize: '11px', fontWeight: '600', fill: '#1e293b' }
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
