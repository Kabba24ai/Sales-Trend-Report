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
      .eq('orders.payment_status', 'PAID')
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
      const amount = Number(item.subtotal) + shippingCost + Number(item.processing_fees || 0);

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
          payment_date
        )
      `)
      .eq('orders.payment_status', 'PAID')
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
      const amount = Number(item.subtotal) + shippingCost + Number(item.processing_fees || 0);

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
          payment_date
        )
      `)
      .eq('orders.payment_status', 'PAID')
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
      const amount = Number(item.subtotal) + shippingCost + Number(item.processing_fees || 0);

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
      .eq('orders.payment_status', 'PAID')
      .neq('item_type', 'damage_waiver')
      .neq('item_type', 'thrown_track_insurance')
      .not('product_id', 'is', null);

    if (error) throw error;

    const productSales: Record<string, { name: string; total: number; orders: Set<string> }> = {};

    data?.forEach((item: any) => {
      const productId = item.product_id;
      const productName = item.products?.name || 'Unknown Product';
      const amount = Number(item.subtotal);

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
      .eq('orders.payment_status', 'PAID')
      .neq('item_type', 'damage_waiver')
      .neq('item_type', 'thrown_track_insurance')
      .not('category_id', 'is', null);

    if (error) throw error;

    const categorySales: Record<string, { name: string; total: number; orders: Set<string> }> = {};

    data?.forEach((item: any) => {
      const categoryId = item.category_id;
      const categoryName = item.categories?.name || 'Unknown Category';
      const amount = Number(item.subtotal);

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
  }
};
