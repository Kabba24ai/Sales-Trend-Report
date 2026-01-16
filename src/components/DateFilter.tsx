import { Calendar, Check, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { DateRangeOption } from '../services/salesApi';

interface DateFilterProps {
  dateRange: DateRangeOption;
  startDate?: string;
  endDate?: string;
  onDateRangeChange: (range: DateRangeOption) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

const dateRangeOptions = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' },
];

export default function DateFilter({
  dateRange,
  startDate,
  endDate,
  onDateRangeChange,
  onStartDateChange,
  onEndDateChange
}: DateFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = dateRangeOptions.find(opt => opt.value === dateRange);

  return (
    <div className="flex items-end gap-4">
      <div style={{ width: '180px', flexShrink: 0 }} ref={dropdownRef}>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
          <Calendar size={16} />
          Date Range
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-left flex items-center justify-between hover:bg-slate-50"
          >
            <span>{selectedOption?.label}</span>
            <ChevronDown size={16} className="text-slate-400" />
          </button>

          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg overflow-hidden">
              {dateRangeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onDateRangeChange(option.value as DateRangeOption);
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 flex items-center justify-between"
                >
                  <span>{option.label}</span>
                  {dateRange === option.value && (
                    <Check size={16} className="text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
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
