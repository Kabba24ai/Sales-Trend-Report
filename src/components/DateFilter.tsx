import { Calendar } from 'lucide-react';
import { DateRangeOption } from '../services/salesApi';

interface DateFilterProps {
  dateRange: DateRangeOption;
  startDate?: string;
  endDate?: string;
  onDateRangeChange: (range: DateRangeOption) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export default function DateFilter({
  dateRange,
  startDate,
  endDate,
  onDateRangeChange,
  onStartDateChange,
  onEndDateChange
}: DateFilterProps) {
  return (
    <div className="flex items-end gap-4">
      <div style={{ width: '180px', flexShrink: 0 }}>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
          <Calendar size={16} />
          Date Range
        </label>
        <select
          value={dateRange}
          onChange={(e) => onDateRangeChange(e.target.value as DateRangeOption)}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="this_week">This Week</option>
          <option value="last_week">Last Week</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="this_year">This Year</option>
          <option value="last_year">Last Year</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      {dateRange === 'custom' && (
        <>
          <div style={{ width: '160px', flexShrink: 0 }}>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate || ''}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
          <div style={{ width: '160px', flexShrink: 0 }}>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate || ''}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
        </>
      )}
    </div>
  );
}
