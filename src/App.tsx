import { useState } from 'react';
import SalesTrendReport from './components/SalesTrendReport';
import PureSalesReport from './components/PureSalesReport';
import ProductPerformance from './components/ProductPerformance';
import GraphicalSalesReport from './components/GraphicalSalesReport';
import { TrendingUp, ShoppingCart, BarChart3, PieChart } from 'lucide-react';

type ReportView = 'trend' | 'sales' | 'performance' | 'graphical';

function App() {
  const [currentView, setCurrentView] = useState<ReportView>('sales');

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center gap-1 py-3">
            <button
              onClick={() => setCurrentView('sales')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
                currentView === 'sales'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-transparent text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ShoppingCart size={18} />
              Pure Sales Report
            </button>
            <button
              onClick={() => setCurrentView('performance')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
                currentView === 'performance'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-transparent text-slate-600 hover:bg-slate-50'
              }`}
            >
              <BarChart3 size={18} />
              Product Performance
            </button>
            <button
              onClick={() => setCurrentView('graphical')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
                currentView === 'graphical'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-transparent text-slate-600 hover:bg-slate-50'
              }`}
            >
              <PieChart size={18} />
              Graphical Sales Report
            </button>
            <button
              onClick={() => setCurrentView('trend')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
                currentView === 'trend'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-transparent text-slate-600 hover:bg-slate-50'
              }`}
            >
              <TrendingUp size={18} />
              Sales Trend Analysis
            </button>
          </div>
        </div>
      </div>

      {currentView === 'sales' && <PureSalesReport />}
      {currentView === 'performance' && <ProductPerformance />}
      {currentView === 'graphical' && <GraphicalSalesReport />}
      {currentView === 'trend' && <SalesTrendReport />}
    </div>
  );
}

export default App;
