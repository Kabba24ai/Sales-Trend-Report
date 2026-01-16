import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Filter,
  Info,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import {
  salesApi,
  SalesFilters,
  SalesSummary,
  RevenueBreakdown,
  TaxAndPayments,
  DiscountsReport,
  RefundsReport,
  ProductSalesDetail
} from '../services/salesApi';

type SortField = 'name' | 'quantity' | 'gross' | 'net' | 'discount' | 'refund';
type SortDirection = 'asc' | 'desc';

export default function PureSalesReport() {
  const [loading, setLoading] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showBottomProducts, setShowBottomProducts] = useState(false);
  const [stores, setStores] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [revenue, setRevenue] = useState<RevenueBreakdown | null>(null);
  const [taxPayments, setTaxPayments] = useState<TaxAndPayments | null>(null);
  const [discounts, setDiscounts] = useState<DiscountsReport | null>(null);
  const [refunds, setRefunds] = useState<RefundsReport | null>(null);
  const [productDetails, setProductDetails] = useState<ProductSalesDetail[]>([]);

  const [sortField, setSortField] = useState<SortField>('net');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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
      const [
        summaryData,
        revenueData,
        taxPaymentsData,
        discountsData,
        refundsData,
        productsData
      ] = await Promise.all([
        salesApi.getSalesSummary(filters),
        salesApi.getRevenueBreakdown(filters),
        salesApi.getTaxAndPayments(filters),
        salesApi.getDiscountsReport(filters),
        salesApi.getRefundsReport(filters),
        salesApi.getProductSalesDetails(filters)
      ]);

      setSummary(summaryData);
      setRevenue(revenueData);
      setTaxPayments(taxPaymentsData);
      setDiscounts(discountsData);
      setRefunds(refundsData);
      setProductDetails(productsData);
    } catch (error) {
      console.error('Error loading sales report data:', error);
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortedProducts = () => {
    const sorted = [...productDetails].sort((a, b) => {
      let aVal = 0;
      let bVal = 0;

      switch (sortField) {
        case 'name':
          return sortDirection === 'asc'
            ? a.productName.localeCompare(b.productName)
            : b.productName.localeCompare(a.productName);
        case 'quantity':
          aVal = a.quantitySold;
          bVal = b.quantitySold;
          break;
        case 'gross':
          aVal = a.grossSales;
          bVal = b.grossSales;
          break;
        case 'net':
          aVal = a.netSales;
          bVal = b.netSales;
          break;
        case 'discount':
          aVal = a.discountAmount;
          bVal = b.discountAmount;
          break;
        case 'refund':
          aVal = a.refundAmount;
          bVal = b.refundAmount;
          break;
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-slate-400" />;
    return sortDirection === 'asc' ? (
      <ArrowUp size={14} className="text-blue-600" />
    ) : (
      <ArrowDown size={14} className="text-blue-600" />
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-slate-900">Pure Sales Report</h1>
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
              <p><strong>Purpose:</strong> Comprehensive view of sales performance, revenue breakdown, and financial metrics</p>
              <p><strong>Metrics:</strong> Track gross sales, discounts, refunds, net revenue, payment methods, and product performance</p>
              <p><strong>Filters:</strong> Use filters to drill down into specific stores, categories, products, or revenue types</p>
              <p><strong>Note:</strong> All amounts exclude sales tax per company policy</p>
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
          <h2 className="text-base font-semibold text-slate-900 mb-4">Sales Summary</h2>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4">
              <div className="text-xs font-medium text-slate-600 mb-2">Total Gross Sales</div>
              <div className="text-2xl font-bold text-blue-600">
                {loading ? '...' : formatCurrency(summary?.totalGrossSales || 0)}
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-4">
              <div className="text-xs font-medium text-slate-600 mb-2">Total Discounts</div>
              <div className="text-2xl font-bold text-orange-600">
                {loading ? '...' : formatCurrency(summary?.totalDiscounts || 0)}
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-4">
              <div className="text-xs font-medium text-slate-600 mb-2">Total Refunds</div>
              <div className="text-2xl font-bold text-red-600">
                {loading ? '...' : formatCurrency(summary?.totalRefunds || 0)}
              </div>
            </div>

            <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-4">
              <div className="text-xs font-medium text-slate-600 mb-2">Total Net Sales</div>
              <div className="text-2xl font-bold text-green-600">
                {loading ? '...' : formatCurrency(summary?.totalNetSales || 0)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4">
              <div className="text-xs font-medium text-slate-600 mb-2"># of Transactions</div>
              <div className="text-2xl font-bold text-slate-700">
                {loading ? '...' : formatNumber(summary?.transactionCount || 0)}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4">
              <div className="text-xs font-medium text-slate-600 mb-2"># of Items Sold</div>
              <div className="text-2xl font-bold text-slate-700">
                {loading ? '...' : formatNumber(summary?.itemsSold || 0)}
              </div>
            </div>

            <div className="bg-teal-50 border border-teal-100 rounded-2xl px-4 py-4">
              <div className="text-xs font-medium text-slate-600 mb-2">Avg Sale Value (AOV)</div>
              <div className="text-2xl font-bold text-teal-600">
                {loading ? '...' : formatCurrency(summary?.averageSaleValue || 0)}
              </div>
            </div>

            <div className="bg-teal-50 border border-teal-100 rounded-2xl px-4 py-4">
              <div className="text-xs font-medium text-slate-600 mb-2">Avg Items Per Sale</div>
              <div className="text-2xl font-bold text-teal-600">
                {loading ? '...' : (summary?.averageItemsPerSale || 0).toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Revenue Breakdown by Type</h2>
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-700">Retail Product Sales</span>
                <span className="text-sm font-bold text-slate-900">
                  {loading ? '...' : formatCurrency(revenue?.retailSales || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-700">Rental Revenue</span>
                <span className="text-sm font-bold text-slate-900">
                  {loading ? '...' : formatCurrency(revenue?.rentalRevenue || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-700">Delivery Revenue</span>
                <span className="text-sm font-bold text-slate-900">
                  {loading ? '...' : formatCurrency(revenue?.deliveryRevenue || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-700">Damage Waiver Revenue</span>
                <span className="text-sm font-bold text-slate-900">
                  {loading ? '...' : formatCurrency(revenue?.damageWaiverRevenue || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-700">Track Insurance Revenue</span>
                <span className="text-sm font-bold text-slate-900">
                  {loading ? '...' : formatCurrency(revenue?.trackInsuranceRevenue || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-700">Prepaid Fuel Revenue</span>
                <span className="text-sm font-bold text-slate-900">
                  {loading ? '...' : formatCurrency(revenue?.prepaidFuelRevenue || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-700">Prepaid Cleaning Revenue</span>
                <span className="text-sm font-bold text-slate-900">
                  {loading ? '...' : formatCurrency(revenue?.prepaidCleaningRevenue || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-700">Fees / Other Revenue</span>
                <span className="text-sm font-bold text-slate-900">
                  {loading ? '...' : formatCurrency(revenue?.feesOtherRevenue || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-4">Taxes + Payments Collected</h2>
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="mb-6 pb-4 border-b border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-700">Sales Tax Collected</span>
                  <span className="text-lg font-bold text-green-600">
                    {loading ? '...' : formatCurrency(taxPayments?.salesTaxCollected || 0)}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Payments by Method
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-slate-700">Cash Payments</span>
                  <span className="text-sm font-medium text-slate-900">
                    {loading ? '...' : formatCurrency(taxPayments?.cashPayments || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-slate-700">Card Payments</span>
                  <span className="text-sm font-medium text-slate-900">
                    {loading ? '...' : formatCurrency(taxPayments?.cardPayments || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-slate-700">ACH Payments</span>
                  <span className="text-sm font-medium text-slate-900">
                    {loading ? '...' : formatCurrency(taxPayments?.achPayments || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-slate-700">Check Payments</span>
                  <span className="text-sm font-medium text-slate-900">
                    {loading ? '...' : formatCurrency(taxPayments?.checkPayments || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-slate-700">Account Payments</span>
                  <span className="text-sm font-medium text-slate-900">
                    {loading ? '...' : formatCurrency(taxPayments?.accountPayments || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-slate-700">Other Payments</span>
                  <span className="text-sm font-medium text-slate-900">
                    {loading ? '...' : formatCurrency(taxPayments?.otherPayments || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-4">Discounts + Refunds</h2>

            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
                Manual Discounts
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-700">Total Discounts Given</span>
                  <span className="text-sm font-bold text-orange-600">
                    {loading ? '...' : formatCurrency(discounts?.totalDiscounts || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-700">Discount % of Gross Sales</span>
                  <span className="text-sm font-medium text-slate-900">
                    {loading ? '...' : `${(discounts?.discountPercentage || 0).toFixed(2)}%`}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-700"># Transactions with Discounts</span>
                  <span className="text-sm font-medium text-slate-900">
                    {loading ? '...' : formatNumber(discounts?.transactionsWithDiscounts || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-700">Avg Discount Per Transaction</span>
                  <span className="text-sm font-medium text-slate-900">
                    {loading ? '...' : formatCurrency(discounts?.averageDiscountPerTransaction || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
                Refunds
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-700">Total Refund Amount</span>
                  <span className="text-sm font-bold text-red-600">
                    {loading ? '...' : formatCurrency(refunds?.totalRefundAmount || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-700"># of Refund Transactions</span>
                  <span className="text-sm font-medium text-slate-900">
                    {loading ? '...' : formatNumber(refunds?.refundTransactionCount || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-700">Full Refunds</span>
                  <span className="text-sm font-medium text-slate-900">
                    {loading ? '...' : formatNumber(refunds?.fullRefunds || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-700">Partial Refunds</span>
                  <span className="text-sm font-medium text-slate-900">
                    {loading ? '...' : formatNumber(refunds?.partialRefunds || 0)}
                  </span>
                </div>
              </div>

              {refunds && refunds.refundsByReason.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    Refund Reasons
                  </div>
                  <div className="space-y-2">
                    {refunds.refundsByReason.map((reason, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="text-slate-600">{reason.reason}</span>
                        <span className="font-medium text-slate-900">
                          {reason.count} ({formatCurrency(reason.amount)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">Product Sales Table</h2>
            <button
              onClick={() => setShowBottomProducts(!showBottomProducts)}
              className={`px-5 py-2 text-sm rounded-lg font-medium transition-all ${
                showBottomProducts
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {showBottomProducts ? 'Show All Products' : 'Show Bottom 10 Slow Movers'}
            </button>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide hover:text-slate-900"
                      >
                        Product Name
                        <SortIcon field="name" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSort('quantity')}
                        className="flex items-center gap-2 ml-auto text-xs font-semibold text-slate-600 uppercase tracking-wide hover:text-slate-900"
                      >
                        Qty Sold
                        <SortIcon field="quantity" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSort('gross')}
                        className="flex items-center gap-2 ml-auto text-xs font-semibold text-slate-600 uppercase tracking-wide hover:text-slate-900"
                      >
                        Gross Sales
                        <SortIcon field="gross" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSort('discount')}
                        className="flex items-center gap-2 ml-auto text-xs font-semibold text-slate-600 uppercase tracking-wide hover:text-slate-900"
                      >
                        Discount
                        <SortIcon field="discount" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSort('net')}
                        className="flex items-center gap-2 ml-auto text-xs font-semibold text-slate-600 uppercase tracking-wide hover:text-slate-900"
                      >
                        Net Sales
                        <SortIcon field="net" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Avg Price
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSort('refund')}
                        className="flex items-center gap-2 ml-auto text-xs font-semibold text-slate-600 uppercase tracking-wide hover:text-slate-900"
                      >
                        Refund Amt
                        <SortIcon field="refund" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Net Qty
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                        Loading product data...
                      </td>
                    </tr>
                  ) : (
                    <>
                      {!showBottomProducts && getSortedProducts().map((product) => (
                        <tr key={product.productId} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">
                            {product.productName}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {product.sku}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-slate-900">
                            {formatNumber(product.quantitySold)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-slate-900">
                            {formatCurrency(product.grossSales)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-orange-600">
                            {formatCurrency(product.discountAmount)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                            {formatCurrency(product.netSales)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-slate-900">
                            {formatCurrency(product.averageSellingPrice)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-red-600">
                            {formatCurrency(product.refundAmount)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-slate-900">
                            {formatNumber(product.netQuantitySold)}
                          </td>
                        </tr>
                      ))}

                      {showBottomProducts && getBottomProducts(10).map((product) => (
                        <tr key={product.productId} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">
                            {product.productName}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {product.sku}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-slate-900">
                            {formatNumber(product.quantitySold)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-slate-900">
                            {formatCurrency(product.grossSales)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-orange-600">
                            {formatCurrency(product.discountAmount)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                            {formatCurrency(product.netSales)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-slate-900">
                            {formatCurrency(product.averageSellingPrice)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-red-600">
                            {formatCurrency(product.refundAmount)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-slate-900">
                            {formatNumber(product.netQuantitySold)}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
