import { useState, useEffect } from 'react';
import { Filter, Info, X } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import {
  salesApi,
  SalesFilters,
  ProductSalesDetail
} from '../services/salesApi';

export default function ProductPerformance() {
  const [loading, setLoading] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showSlowMovers, setShowSlowMovers] = useState(false);
  const [stores, setStores] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productDetails, setProductDetails] = useState<ProductSalesDetail[]>([]);

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
    deliveryOnly: false
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

  const loadData = async () => {
    setLoading(true);
    try {
      const productsData = await salesApi.getProductSalesDetails(filters);
      setProductDetails(productsData);
    } catch (error) {
      console.error('Error loading product performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getTopProducts = (count: number) => {
    return [...productDetails]
      .sort((a, b) => b.netSales - a.netSales)
      .slice(0, count);
  };

  const getBottomProducts = (count: number) => {
    return [...productDetails]
      .sort((a, b) => a.netSales - b.netSales)
      .slice(0, count);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-slate-900">Product Performance</h1>
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
              <h2 className="text-lg font-semibold text-blue-900">Report Overview</h2>
              <button
                onClick={() => setShowInstructions(false)}
                className="text-blue-600 hover:text-blue-800"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 text-sm text-blue-800">
              <p><strong>Purpose:</strong> Visualize and compare product performance by quantity sold and revenue generated</p>
              <p><strong>Top Sellers:</strong> View the 10 best-performing products by net sales revenue</p>
              <p><strong>Slow Movers:</strong> Identify the 10 lowest-performing products that may need attention</p>
              <p><strong>Filters:</strong> Use filters to analyze specific stores, categories, or product types</p>
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
                deliveryOnly: false
              })}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>

          <div className="flex items-end gap-6 mb-4">
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

            <div style={{ width: '115px', flexShrink: 0 }}>
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
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            {(() => {
              const hasExcludeFilters = filters.excludeWaiver || filters.excludeInsurance || filters.excludeDelivery || filters.excludeShipping;
              const hasOnlyFilters = filters.waiverOnly || filters.insuranceOnly || filters.deliveryOnly;

              const getLabelClass = (isExcludeFilter: boolean) => {
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

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">Performance Charts</h2>
            <button
              onClick={() => setShowSlowMovers(!showSlowMovers)}
              className={`px-5 py-2 text-sm rounded-lg font-medium transition-all ${
                showSlowMovers
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {showSlowMovers ? 'Show Top 10 Best Sellers' : 'Show Bottom 10 Slow Movers'}
            </button>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            {!showSlowMovers ? (
              <>
                <h3 className="text-sm font-semibold text-green-700 mb-4">Top 10 Best Sellers (Quantity vs Revenue)</h3>
                {loading ? (
                  <div className="h-96 flex items-center justify-center">
                    <div className="text-slate-400">Loading chart data...</div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={500}>
                    <BarChart
                      data={getTopProducts(10).map(p => ({
                        name: p.productName.length > 25 ? p.productName.substring(0, 25) + '...' : p.productName,
                        quantity: p.quantitySold,
                        revenue: p.netSales
                      }))}
                      margin={{ top: 40, right: 40, left: 20, bottom: 100 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        stroke="#94a3b8"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        stroke="#10b981"
                        style={{ fontSize: '12px' }}
                        label={{ value: 'Quantity', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#10b981' } }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#3b82f6"
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                        style={{ fontSize: '12px' }}
                        label={{ value: 'Revenue ($)', angle: 90, position: 'insideRight', style: { fontSize: '12px', fill: '#3b82f6' } }}
                      />
                      <Tooltip
                        formatter={(value: any, name: string) => {
                          if (name === 'revenue') return [formatCurrency(value), 'Revenue'];
                          return [formatNumber(value) + ' units', 'Quantity'];
                        }}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '12px' }}
                        formatter={(value) => {
                          if (value === 'quantity') return 'Quantity Sold';
                          if (value === 'revenue') return 'Net Revenue';
                          return value;
                        }}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="quantity"
                        fill="#10b981"
                        name="quantity"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey="quantity"
                          position="top"
                          style={{ fontSize: '11px', fill: '#059669', fontWeight: 600 }}
                          formatter={(value: number) => formatNumber(value)}
                        />
                      </Bar>
                      <Bar
                        yAxisId="right"
                        dataKey="revenue"
                        fill="#3b82f6"
                        name="revenue"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey="revenue"
                          position="top"
                          style={{ fontSize: '11px', fill: '#2563eb', fontWeight: 600 }}
                          formatter={(value: number) => `$${(value / 1000).toFixed(1)}k`}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-orange-700 mb-4">Bottom 10 Slow Movers (Quantity vs Revenue)</h3>
                {loading ? (
                  <div className="h-96 flex items-center justify-center">
                    <div className="text-slate-400">Loading chart data...</div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={500}>
                    <BarChart
                      data={getBottomProducts(10).map(p => ({
                        name: p.productName.length > 25 ? p.productName.substring(0, 25) + '...' : p.productName,
                        quantity: p.quantitySold,
                        revenue: p.netSales
                      }))}
                      margin={{ top: 40, right: 40, left: 20, bottom: 100 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        stroke="#94a3b8"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        stroke="#f97316"
                        style={{ fontSize: '12px' }}
                        label={{ value: 'Quantity', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#f97316' } }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#ef4444"
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                        style={{ fontSize: '12px' }}
                        label={{ value: 'Revenue ($)', angle: 90, position: 'insideRight', style: { fontSize: '12px', fill: '#ef4444' } }}
                      />
                      <Tooltip
                        formatter={(value: any, name: string) => {
                          if (name === 'revenue') return [formatCurrency(value), 'Revenue'];
                          return [formatNumber(value) + ' units', 'Quantity'];
                        }}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '12px' }}
                        formatter={(value) => {
                          if (value === 'quantity') return 'Quantity Sold';
                          if (value === 'revenue') return 'Net Revenue';
                          return value;
                        }}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="quantity"
                        fill="#f97316"
                        name="quantity"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey="quantity"
                          position="top"
                          style={{ fontSize: '11px', fill: '#ea580c', fontWeight: 600 }}
                          formatter={(value: number) => formatNumber(value)}
                        />
                      </Bar>
                      <Bar
                        yAxisId="right"
                        dataKey="revenue"
                        fill="#ef4444"
                        name="revenue"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey="revenue"
                          position="top"
                          style={{ fontSize: '11px', fill: '#dc2626', fontWeight: 600 }}
                          formatter={(value: number) => `$${(value / 1000).toFixed(1)}k`}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
