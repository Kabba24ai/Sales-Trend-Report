import { supabase } from '../lib/supabase';

export interface SalesDataPoint {
  date: string;
  sales: number;
  period: 'current' | 'previous';
}

export interface TopProduct {
  id: string;
  name: string;
  total_sales: number;
  order_count: number;
}

export interface TopCategory {
  id: string;
  name: string;
  total_sales: number;
  order_count: number;
}

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

export interface SalesSummary {
  totalGrossSales: number;
  totalDiscounts: number;
  totalRefunds: number;
  totalNetSales: number;
  transactionCount: number;
  itemsSold: number;
  averageSaleValue: number;
  averageItemsPerSale: number;
}

export interface RevenueBreakdown {
  retailSales: number;
  rentalRevenue: number;
  deliveryRevenue: number;
  damageWaiverRevenue: number;
  trackInsuranceRevenue: number;
  prepaidFuelRevenue: number;
  prepaidCleaningRevenue: number;
  feesOtherRevenue: number;
}

export interface TaxAndPayments {
  salesTaxCollected: number;
  cashPayments: number;
  cardPayments: number;
  achPayments: number;
  checkPayments: number;
  accountPayments: number;
  otherPayments: number;
}

export interface DiscountsReport {
  totalDiscounts: number;
  discountPercentage: number;
  transactionsWithDiscounts: number;
  averageDiscountPerTransaction: number;
}

export interface RefundsReport {
  totalRefundAmount: number;
  refundTransactionCount: number;
  fullRefunds: number;
  partialRefunds: number;
  refundsByReason: { reason: string; count: number; amount: number }[];
}

export interface ProductSalesDetail {
  productId: string;
  productName: string;
  sku: string;
  quantitySold: number;
  grossSales: number;
  discountAmount: number;
  netSales: number;
  averageSellingPrice: number;
  refundQuantity: number;
  refundAmount: number;
  netQuantitySold: number;
  taxCollected: number;
}

export const salesApi = {
  async getRolling30Days(filters: SalesFilters = {}): Promise<SalesDataPoint[]> {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(today.getDate() - 60);

    let query = supabase
      .from('order_items')
      .select(`
        subtotal,
        shipping_cost,
        processing_fees,
        item_type,
        orders!inner(
          payment_status,
          payment_date
        )
      `)
      .in('orders.payment_status', ['PAID', 'REFUNDED'])
      .not('orders.payment_date', 'is', null);

    if (filters.category && filters.category !== 'all') {
      query = query.eq('category_id', filters.category);
    }

    if (filters.product && filters.product !== 'all') {
      query = query.eq('product_id', filters.product);
    }

    if (filters.itemType === 'rental') {
      query = query.eq('item_type', 'rental');
    } else if (filters.itemType === 'retail') {
      query = query.eq('item_type', 'retail');
    }

    if (filters.excludeWaiver) {
      query = query.neq('item_type', 'damage_waiver');
    }

    if (filters.waiverOnly) {
      query = query.eq('item_type', 'damage_waiver');
    }

    if (filters.excludeInsurance) {
      query = query.neq('item_type', 'thrown_track_insurance');
    }

    if (filters.insuranceOnly) {
      query = query.eq('item_type', 'thrown_track_insurance');
    }

    if (filters.excludeDelivery) {
      query = query.neq('item_type', 'delivery');
    }

    if (filters.deliveryOnly) {
      query = query.eq('item_type', 'delivery');
    }

    const { data, error } = await query;

    if (error) throw error;

    const salesByDate: Record<string, number> = {};

    data?.forEach((item: any) => {
      const paymentDate = new Date(item.orders.payment_date);
      const dateStr = paymentDate.toISOString().split('T')[0];
      const shippingCost = filters.excludeShipping ? 0 : Number(item.shipping_cost || 0);
      // Revenue calculation: All revenue sources excluding Sales Tax
      let amount = Number(item.subtotal) + shippingCost + Number(item.processing_fees || 0);

      // Subtract refunded amounts from totals
      if (item.orders.payment_status === 'REFUNDED') {
        amount = -amount;
      }

      if (!salesByDate[dateStr]) {
        salesByDate[dateStr] = 0;
      }
      salesByDate[dateStr] += amount;
    });

    const result: SalesDataPoint[] = [];

    for (let i = 60; i >= 1; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      result.push({
        date: dateStr,
        sales: salesByDate[dateStr] || 0,
        period: i <= 30 ? 'current' : 'previous'
      });
    }

    return result;
  },

  async getLastMonthComparison(filters: SalesFilters = {}): Promise<SalesDataPoint[]> {
    const today = new Date();

    // Get first day of current month
    const firstDayCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get last month (previous complete month)
    const lastMonthStart = new Date(firstDayCurrentMonth);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

    const lastMonthEnd = new Date(firstDayCurrentMonth);
    lastMonthEnd.setDate(lastMonthEnd.getDate() - 1);

    // Get month before last month
    const monthBeforeLastStart = new Date(lastMonthStart);
    monthBeforeLastStart.setMonth(monthBeforeLastStart.getMonth() - 1);

    const monthBeforeLastEnd = new Date(lastMonthStart);
    monthBeforeLastEnd.setDate(monthBeforeLastEnd.getDate() - 1);

    let query = supabase
      .from('order_items')
      .select(`
        subtotal,
        shipping_cost,
        processing_fees,
        item_type,
        orders!inner(
          payment_status,
          payment_date,
          store_id
        )
      `)
      .in('orders.payment_status', ['PAID', 'REFUNDED'])
      .not('orders.payment_date', 'is', null);

    if (filters.store && filters.store !== 'all') {
      query = query.eq('orders.store_id', filters.store);
    }

    if (filters.category && filters.category !== 'all') {
      query = query.eq('category_id', filters.category);
    }

    if (filters.product && filters.product !== 'all') {
      query = query.eq('product_id', filters.product);
    }

    if (filters.itemType === 'rental') {
      query = query.eq('item_type', 'rental');
    } else if (filters.itemType === 'retail') {
      query = query.eq('item_type', 'retail');
    }

    if (filters.excludeWaiver) {
      query = query.neq('item_type', 'damage_waiver');
    }

    if (filters.waiverOnly) {
      query = query.eq('item_type', 'damage_waiver');
    }

    if (filters.excludeInsurance) {
      query = query.neq('item_type', 'thrown_track_insurance');
    }

    if (filters.insuranceOnly) {
      query = query.eq('item_type', 'thrown_track_insurance');
    }

    if (filters.excludeDelivery) {
      query = query.neq('item_type', 'delivery');
    }

    if (filters.deliveryOnly) {
      query = query.eq('item_type', 'delivery');
    }

    const { data, error } = await query;

    if (error) throw error;

    const salesByDate: Record<string, number> = {};

    data?.forEach((item: any) => {
      const paymentDate = new Date(item.orders.payment_date);
      const dateStr = paymentDate.toISOString().split('T')[0];
      const shippingCost = filters.excludeShipping ? 0 : Number(item.shipping_cost || 0);
      // Revenue calculation: All revenue sources excluding Sales Tax
      let amount = Number(item.subtotal) + shippingCost + Number(item.processing_fees || 0);

      // Subtract refunded amounts from totals
      if (item.orders.payment_status === 'REFUNDED') {
        amount = -amount;
      }

      if (!salesByDate[dateStr]) {
        salesByDate[dateStr] = 0;
      }
      salesByDate[dateStr] += amount;
    });

    const result: SalesDataPoint[] = [];

    // Get number of days in last month
    const daysInLastMonth = new Date(lastMonthStart.getFullYear(), lastMonthStart.getMonth() + 1, 0).getDate();
    const daysInMonthBeforeLast = new Date(monthBeforeLastStart.getFullYear(), monthBeforeLastStart.getMonth() + 1, 0).getDate();

    // Add month before last (previous period)
    for (let i = 0; i < daysInMonthBeforeLast; i++) {
      const date = new Date(monthBeforeLastStart);
      date.setDate(monthBeforeLastStart.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      result.push({
        date: dateStr,
        sales: salesByDate[dateStr] || 0,
        period: 'previous'
      });
    }

    // Add last month (current period)
    for (let i = 0; i < daysInLastMonth; i++) {
      const date = new Date(lastMonthStart);
      date.setDate(lastMonthStart.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      result.push({
        date: dateStr,
        sales: salesByDate[dateStr] || 0,
        period: 'current'
      });
    }

    return result;
  },

  async get7DayComparison(filters: SalesFilters = {}): Promise<SalesDataPoint[]> {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(today.getDate() - 14);

    let query = supabase
      .from('order_items')
      .select(`
        subtotal,
        shipping_cost,
        processing_fees,
        item_type,
        orders!inner(
          payment_status,
          payment_date,
          store_id
        )
      `)
      .in('orders.payment_status', ['PAID', 'REFUNDED'])
      .not('orders.payment_date', 'is', null);

    if (filters.store && filters.store !== 'all') {
      query = query.eq('orders.store_id', filters.store);
    }

    if (filters.category && filters.category !== 'all') {
      query = query.eq('category_id', filters.category);
    }

    if (filters.product && filters.product !== 'all') {
      query = query.eq('product_id', filters.product);
    }

    if (filters.itemType === 'rental') {
      query = query.eq('item_type', 'rental');
    } else if (filters.itemType === 'retail') {
      query = query.eq('item_type', 'retail');
    }

    if (filters.excludeWaiver) {
      query = query.neq('item_type', 'damage_waiver');
    }

    if (filters.waiverOnly) {
      query = query.eq('item_type', 'damage_waiver');
    }

    if (filters.excludeInsurance) {
      query = query.neq('item_type', 'thrown_track_insurance');
    }

    if (filters.insuranceOnly) {
      query = query.eq('item_type', 'thrown_track_insurance');
    }

    if (filters.excludeDelivery) {
      query = query.neq('item_type', 'delivery');
    }

    if (filters.deliveryOnly) {
      query = query.eq('item_type', 'delivery');
    }

    const { data, error } = await query;

    if (error) throw error;

    const salesByDate: Record<string, number> = {};

    data?.forEach((item: any) => {
      const paymentDate = new Date(item.orders.payment_date);
      const dateStr = paymentDate.toISOString().split('T')[0];
      const shippingCost = filters.excludeShipping ? 0 : Number(item.shipping_cost || 0);
      // Revenue calculation: All revenue sources excluding Sales Tax
      let amount = Number(item.subtotal) + shippingCost + Number(item.processing_fees || 0);

      // Subtract refunded amounts from totals
      if (item.orders.payment_status === 'REFUNDED') {
        amount = -amount;
      }

      if (!salesByDate[dateStr]) {
        salesByDate[dateStr] = 0;
      }
      salesByDate[dateStr] += amount;
    });

    const result: SalesDataPoint[] = [];

    for (let i = 14; i >= 1; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      result.push({
        date: dateStr,
        sales: salesByDate[dateStr] || 0,
        period: i <= 7 ? 'current' : 'previous'
      });
    }

    return result;
  },

  async getTopProducts(limit: number = 10): Promise<TopProduct[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('order_items')
      .select(`
        product_id,
        subtotal,
        order_id,
        products(name),
        orders!inner(
          payment_status,
          payment_date
        )
      `)
      .in('orders.payment_status', ['PAID', 'REFUNDED'])
      .neq('item_type', 'damage_waiver')
      .neq('item_type', 'thrown_track_insurance')
      .not('product_id', 'is', null);

    if (error) throw error;

    const productSales: Record<string, { name: string; total: number; orders: Set<string> }> = {};

    data?.forEach((item: any) => {
      const productId = item.product_id;
      const productName = item.products?.name || 'Unknown Product';
      let amount = Number(item.subtotal);

      // Subtract refunded amounts from totals
      if (item.orders.payment_status === 'REFUNDED') {
        amount = -amount;
      }

      if (!productSales[productId]) {
        productSales[productId] = {
          name: productName,
          total: 0,
          orders: new Set()
        };
      }

      productSales[productId].total += amount;
      productSales[productId].orders.add(item.order_id);
    });

    const result: TopProduct[] = Object.entries(productSales)
      .map(([id, data]) => ({
        id,
        name: data.name,
        total_sales: data.total,
        order_count: data.orders.size
      }))
      .sort((a, b) => b.total_sales - a.total_sales)
      .slice(0, limit);

    return result;
  },

  async getTopCategories(limit: number = 5): Promise<TopCategory[]> {
    const { data, error } = await supabase
      .from('order_items')
      .select(`
        category_id,
        subtotal,
        order_id,
        categories(name),
        orders!inner(
          payment_status,
          payment_date
        )
      `)
      .in('orders.payment_status', ['PAID', 'REFUNDED'])
      .neq('item_type', 'damage_waiver')
      .neq('item_type', 'thrown_track_insurance')
      .not('category_id', 'is', null);

    if (error) throw error;

    const categorySales: Record<string, { name: string; total: number; orders: Set<string> }> = {};

    data?.forEach((item: any) => {
      const categoryId = item.category_id;
      const categoryName = item.categories?.name || 'Unknown Category';
      let amount = Number(item.subtotal);

      // Subtract refunded amounts from totals
      if (item.orders.payment_status === 'REFUNDED') {
        amount = -amount;
      }

      if (!categorySales[categoryId]) {
        categorySales[categoryId] = {
          name: categoryName,
          total: 0,
          orders: new Set()
        };
      }

      categorySales[categoryId].total += amount;
      categorySales[categoryId].orders.add(item.order_id);
    });

    const result: TopCategory[] = Object.entries(categorySales)
      .map(([id, data]) => ({
        id,
        name: data.name,
        total_sales: data.total,
        order_count: data.orders.size
      }))
      .sort((a, b) => b.total_sales - a.total_sales)
      .slice(0, limit);

    return result;
  },

  async getCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getProducts(categoryId?: string) {
    let query = supabase
      .from('products')
      .select('id, name, category_id')
      .order('name');

    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getStores() {
    const { data, error } = await supabase
      .from('stores')
      .select('id, name')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getSalesSummary(filters: SalesFilters = {}): Promise<SalesSummary> {
    let query = supabase
      .from('order_items')
      .select(`
        subtotal,
        gross_sales,
        discount_amount,
        shipping_cost,
        processing_fees,
        quantity,
        item_type,
        orders!inner(
          id,
          payment_status,
          payment_date,
          store_id
        )
      `)
      .in('orders.payment_status', ['PAID', 'REFUNDED'])
      .not('orders.payment_date', 'is', null);

    query = this.applyFilters(query, filters);

    const { data, error } = await query;
    if (error) throw error;

    let totalGross = 0;
    let totalDiscounts = 0;
    let totalRefunds = 0;
    let totalNet = 0;
    let itemsSold = 0;
    const orderIds = new Set<string>();

    data?.forEach((item: any) => {
      const gross = Number(item.gross_sales || item.subtotal);
      const discount = Number(item.discount_amount || 0);
      const shipping = filters.excludeShipping ? 0 : Number(item.shipping_cost || 0);
      const fees = Number(item.processing_fees || 0);
      const quantity = Number(item.quantity || 0);

      const itemTotal = Number(item.subtotal) + shipping + fees;

      if (item.orders.payment_status === 'PAID') {
        totalGross += gross + shipping + fees;
        totalDiscounts += discount;
        totalNet += itemTotal;
        itemsSold += quantity;
        orderIds.add(item.orders.id);
      } else if (item.orders.payment_status === 'REFUNDED') {
        totalRefunds += itemTotal;
      }
    });

    const transactionCount = orderIds.size;
    const averageSaleValue = transactionCount > 0 ? totalNet / transactionCount : 0;
    const averageItemsPerSale = transactionCount > 0 ? itemsSold / transactionCount : 0;

    return {
      totalGrossSales: totalGross,
      totalDiscounts,
      totalRefunds,
      totalNetSales: totalNet - totalRefunds,
      transactionCount,
      itemsSold,
      averageSaleValue,
      averageItemsPerSale
    };
  },

  async getRevenueBreakdown(filters: SalesFilters = {}): Promise<RevenueBreakdown> {
    let query = supabase
      .from('order_items')
      .select(`
        subtotal,
        shipping_cost,
        processing_fees,
        item_type,
        orders!inner(
          payment_status,
          payment_date,
          store_id
        )
      `)
      .in('orders.payment_status', ['PAID', 'REFUNDED'])
      .not('orders.payment_date', 'is', null);

    query = this.applyFilters(query, filters);

    const { data, error } = await query;
    if (error) throw error;

    const breakdown: RevenueBreakdown = {
      retailSales: 0,
      rentalRevenue: 0,
      deliveryRevenue: 0,
      damageWaiverRevenue: 0,
      trackInsuranceRevenue: 0,
      prepaidFuelRevenue: 0,
      prepaidCleaningRevenue: 0,
      feesOtherRevenue: 0
    };

    data?.forEach((item: any) => {
      const shipping = filters.excludeShipping ? 0 : Number(item.shipping_cost || 0);
      let amount = Number(item.subtotal) + shipping + Number(item.processing_fees || 0);

      if (item.orders.payment_status === 'REFUNDED') {
        amount = -amount;
      }

      const itemType = item.item_type;
      if (itemType === 'retail') {
        breakdown.retailSales += amount;
      } else if (itemType === 'rental') {
        breakdown.rentalRevenue += amount;
      } else if (itemType === 'delivery') {
        breakdown.deliveryRevenue += amount;
      } else if (itemType === 'damage_waiver') {
        breakdown.damageWaiverRevenue += amount;
      } else if (itemType === 'thrown_track_insurance') {
        breakdown.trackInsuranceRevenue += amount;
      } else if (itemType === 'prepaid_fuel') {
        breakdown.prepaidFuelRevenue += amount;
      } else if (itemType === 'prepaid_cleaning') {
        breakdown.prepaidCleaningRevenue += amount;
      } else {
        breakdown.feesOtherRevenue += amount;
      }
    });

    return breakdown;
  },

  async getTaxAndPayments(filters: SalesFilters = {}): Promise<TaxAndPayments> {
    let query = supabase
      .from('orders')
      .select(`
        id,
        payment_status,
        payment_method,
        payment_date,
        store_id,
        order_items(
          subtotal,
          shipping_cost,
          processing_fees,
          sales_tax
        )
      `)
      .in('payment_status', ['PAID', 'REFUNDED'])
      .not('payment_date', 'is', null);

    if (filters.store && filters.store !== 'all') {
      query = query.eq('store_id', filters.store);
    }

    const { data, error } = await query;
    if (error) throw error;

    let salesTaxCollected = 0;
    const payments: TaxAndPayments = {
      salesTaxCollected: 0,
      cashPayments: 0,
      cardPayments: 0,
      achPayments: 0,
      checkPayments: 0,
      accountPayments: 0,
      otherPayments: 0
    };

    data?.forEach((order: any) => {
      let orderTotal = 0;
      let orderTax = 0;

      order.order_items?.forEach((item: any) => {
        const shipping = filters.excludeShipping ? 0 : Number(item.shipping_cost || 0);
        orderTotal += Number(item.subtotal) + shipping + Number(item.processing_fees || 0);
        orderTax += Number(item.sales_tax || 0);
      });

      if (order.payment_status === 'REFUNDED') {
        orderTotal = -orderTotal;
        orderTax = -orderTax;
      }

      salesTaxCollected += orderTax;

      const paymentMethod = order.payment_method?.toLowerCase() || 'other';
      if (paymentMethod === 'cash') {
        payments.cashPayments += orderTotal;
      } else if (paymentMethod === 'credit_card' || paymentMethod === 'debit_card') {
        payments.cardPayments += orderTotal;
      } else if (paymentMethod === 'ach') {
        payments.achPayments += orderTotal;
      } else if (paymentMethod === 'check') {
        payments.checkPayments += orderTotal;
      } else if (paymentMethod === 'account') {
        payments.accountPayments += orderTotal;
      } else {
        payments.otherPayments += orderTotal;
      }
    });

    payments.salesTaxCollected = salesTaxCollected;
    return payments;
  },

  async getDiscountsReport(filters: SalesFilters = {}): Promise<DiscountsReport> {
    let query = supabase
      .from('orders')
      .select(`
        id,
        payment_status,
        payment_date,
        discount_amount,
        gross_amount,
        store_id
      `)
      .eq('payment_status', 'PAID')
      .not('payment_date', 'is', null)
      .gt('discount_amount', 0);

    if (filters.store && filters.store !== 'all') {
      query = query.eq('store_id', filters.store);
    }

    const { data, error } = await query;
    if (error) throw error;

    let totalDiscounts = 0;
    let totalGross = 0;
    const transactionsWithDiscounts = data?.length || 0;

    data?.forEach((order: any) => {
      totalDiscounts += Number(order.discount_amount || 0);
      totalGross += Number(order.gross_amount || 0);
    });

    const discountPercentage = totalGross > 0 ? (totalDiscounts / totalGross) * 100 : 0;
    const averageDiscountPerTransaction = transactionsWithDiscounts > 0 ? totalDiscounts / transactionsWithDiscounts : 0;

    return {
      totalDiscounts,
      discountPercentage,
      transactionsWithDiscounts,
      averageDiscountPerTransaction
    };
  },

  async getRefundsReport(filters: SalesFilters = {}): Promise<RefundsReport> {
    let query = supabase
      .from('orders')
      .select(`
        id,
        payment_status,
        payment_date,
        refund_type,
        refund_reason,
        store_id,
        order_items(
          subtotal,
          shipping_cost,
          processing_fees
        )
      `)
      .eq('payment_status', 'REFUNDED')
      .not('payment_date', 'is', null);

    if (filters.store && filters.store !== 'all') {
      query = query.eq('store_id', filters.store);
    }

    const { data, error } = await query;
    if (error) throw error;

    let totalRefundAmount = 0;
    let fullRefunds = 0;
    let partialRefunds = 0;
    const reasonsMap = new Map<string, { count: number; amount: number }>();

    data?.forEach((order: any) => {
      let orderTotal = 0;

      order.order_items?.forEach((item: any) => {
        const shipping = filters.excludeShipping ? 0 : Number(item.shipping_cost || 0);
        orderTotal += Number(item.subtotal) + shipping + Number(item.processing_fees || 0);
      });

      totalRefundAmount += orderTotal;

      if (order.refund_type === 'full') {
        fullRefunds++;
      } else if (order.refund_type === 'partial') {
        partialRefunds++;
      }

      const reason = order.refund_reason || 'Not specified';
      const existing = reasonsMap.get(reason) || { count: 0, amount: 0 };
      reasonsMap.set(reason, {
        count: existing.count + 1,
        amount: existing.amount + orderTotal
      });
    });

    const refundsByReason = Array.from(reasonsMap.entries()).map(([reason, data]) => ({
      reason,
      count: data.count,
      amount: data.amount
    }));

    return {
      totalRefundAmount,
      refundTransactionCount: data?.length || 0,
      fullRefunds,
      partialRefunds,
      refundsByReason
    };
  },

  async getProductSalesDetails(filters: SalesFilters = {}): Promise<ProductSalesDetail[]> {
    let query = supabase
      .from('order_items')
      .select(`
        product_id,
        quantity,
        subtotal,
        gross_sales,
        discount_amount,
        sales_tax,
        item_type,
        products(name),
        orders!inner(
          payment_status,
          payment_date,
          store_id
        )
      `)
      .in('orders.payment_status', ['PAID', 'REFUNDED'])
      .not('orders.payment_date', 'is', null)
      .not('product_id', 'is', null);

    query = this.applyFilters(query, filters);

    const { data, error } = await query;
    if (error) throw error;

    const productMap = new Map<string, {
      name: string;
      quantitySold: number;
      grossSales: number;
      discountAmount: number;
      netSales: number;
      refundQuantity: number;
      refundAmount: number;
      taxCollected: number;
      salesCount: number;
    }>();

    data?.forEach((item: any) => {
      const productId = item.product_id;
      const productName = item.products?.name || 'Unknown';
      const quantity = Number(item.quantity || 0);
      const gross = Number(item.gross_sales || item.subtotal);
      const discount = Number(item.discount_amount || 0);
      const net = Number(item.subtotal);
      const tax = Number(item.sales_tax || 0);

      if (!productMap.has(productId)) {
        productMap.set(productId, {
          name: productName,
          quantitySold: 0,
          grossSales: 0,
          discountAmount: 0,
          netSales: 0,
          refundQuantity: 0,
          refundAmount: 0,
          taxCollected: 0,
          salesCount: 0
        });
      }

      const product = productMap.get(productId)!;

      if (item.orders.payment_status === 'PAID') {
        product.quantitySold += quantity;
        product.grossSales += gross;
        product.discountAmount += discount;
        product.netSales += net;
        product.taxCollected += tax;
        product.salesCount++;
      } else if (item.orders.payment_status === 'REFUNDED') {
        product.refundQuantity += quantity;
        product.refundAmount += net;
      }
    });

    return Array.from(productMap.entries()).map(([productId, data]) => ({
      productId,
      productName: data.name,
      sku: productId.substring(0, 8).toUpperCase(),
      quantitySold: data.quantitySold,
      grossSales: data.grossSales,
      discountAmount: data.discountAmount,
      netSales: data.netSales,
      averageSellingPrice: data.salesCount > 0 ? data.netSales / data.salesCount : 0,
      refundQuantity: data.refundQuantity,
      refundAmount: data.refundAmount,
      netQuantitySold: data.quantitySold - data.refundQuantity,
      taxCollected: data.taxCollected
    }));
  },

  applyFilters(query: any, filters: SalesFilters) {
    if (filters.store && filters.store !== 'all') {
      query = query.eq('orders.store_id', filters.store);
    }

    if (filters.category && filters.category !== 'all') {
      query = query.eq('category_id', filters.category);
    }

    if (filters.product && filters.product !== 'all') {
      query = query.eq('product_id', filters.product);
    }

    if (filters.itemType === 'rental') {
      query = query.eq('item_type', 'rental');
    } else if (filters.itemType === 'retail') {
      query = query.eq('item_type', 'retail');
    }

    if (filters.excludeWaiver) {
      query = query.neq('item_type', 'damage_waiver');
    }

    if (filters.waiverOnly) {
      query = query.eq('item_type', 'damage_waiver');
    }

    if (filters.excludeInsurance) {
      query = query.neq('item_type', 'thrown_track_insurance');
    }

    if (filters.insuranceOnly) {
      query = query.eq('item_type', 'thrown_track_insurance');
    }

    if (filters.excludeDelivery) {
      query = query.neq('item_type', 'delivery');
    }

    if (filters.deliveryOnly) {
      query = query.eq('item_type', 'delivery');
    }

    return query;
  }
};
