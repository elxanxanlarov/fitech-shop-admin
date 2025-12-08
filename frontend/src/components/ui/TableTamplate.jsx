import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import { useClickOutside } from '../../hooks';
import {
  Search,
  Filter,
  ChevronDown,
  Trash2,
  Edit,
  Eye,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

export default function TableTamplate({
  data = [],
  columns = [],
  onEdit,
  onDelete,
  onView,
  onBulkDelete,
  searchFields = [],
  filterOptions = {},
  title = "Data Table",
  showBulkActions = true,
  showFilters = true,
  showSearch = true,
  showDateFilter = true,
  loading = false,
  emptyState = {
    icon: 'users',
    title: 'No data found',
    description: 'There are no items to display at the moment.',
    actionText: 'Add new item',
    onAction: null,
    showAction: false
  },
  // Server-side pagination props
  serverSidePagination = false,
  pagination = null,
  onPageChange = null,
  onLimitChange = null,
  // Server-side filter and search callbacks
  onSearchChange = null,
  searchValue = '',
  onDateRangeChange = null,
  dateRangeValue = { start: '', end: '' },
  onDatePresetChange = null,
  datePresetValue = 'today',
  onClearFilters = null,
  searchPlaceholder = ''
}) {
  const { t } = useTranslation('admin-panel');
  const { t: tProduct } = useTranslation('product');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState({});
  const [dateRange, setDateRange] = useState(() => {
    // If server-side pagination with date range value, use it, otherwise default
    if (serverSidePagination && dateRangeValue && (dateRangeValue.start || dateRangeValue.end)) {
      return dateRangeValue;
    }
    // Default to today for server-side
    if (serverSidePagination) {
      const today = new Date().toISOString().split('T')[0];
      return { start: today, end: today };
    }
    return { start: '', end: '' };
  });
  const [datePreset, setDatePreset] = useState(() => {
    return serverSidePagination && datePresetValue ? datePresetValue : 'today';
  });
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [columnWidths, setColumnWidths] = useState({});
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef({ columnKey: null, startX: 0, startWidth: 0 });

  // Use custom hook for click outside functionality
  const filterDropdownRef = useClickOutside(showFilterDropdown, () => setShowFilterDropdown(false));

  // Sync dateRange and datePreset with props for server-side pagination
  useEffect(() => {
    if (serverSidePagination) {
      if (dateRangeValue && (dateRangeValue.start || dateRangeValue.end)) {
        setDateRange(dateRangeValue);
      }
      if (datePresetValue) {
        setDatePreset(datePresetValue);
      }
    }
  }, [serverSidePagination, dateRangeValue, datePresetValue]);

  const filteredData = useMemo(() => {
    // If server-side pagination, skip client-side filtering
    if (serverSidePagination) {
      return data;
    }

    let filtered = data;

    if (searchTerm && searchFields.length > 0) {
      filtered = filtered.filter(item =>
        searchFields.some(field =>
          item[field]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        // Custom filter logic for specific fields
        if (key === 'stockStatus') {
          const stockValue = value.toLowerCase().trim();
          filtered = filtered.filter(item => {
            const stock = parseInt(item.stock || 0);
            // Exact match for stock status
            if (stockValue === 'stokda var' || stockValue === 'in stock') {
              return stock > 10;
            } else if (stockValue === 'az stok' || stockValue === 'low stock') {
              return stock > 0 && stock <= 10;
            } else if (stockValue === 'stokda yoxdur' || stockValue === 'out of stock') {
              return stock === 0;
            }
            return true;
          });
        } else if (key === 'categoryName') {
          filtered = filtered.filter(item => {
            const categoryName = item.category?.name || '';
            return categoryName.toLowerCase().includes(value.toLowerCase());
          });
        } else if (key === 'isActive') {
          const isActiveValue = value.toLowerCase().trim();
          filtered = filtered.filter(item => {
            const isActive = item.isActive !== undefined ? item.isActive : true;
            // Exact match for active/inactive
            if (isActiveValue === 'aktiv' || isActiveValue === 'active') {
              return isActive === true;
            } else if (isActiveValue === 'qeyri-aktiv' || isActiveValue === 'inactive') {
              return isActive === false;
            }
            return true;
          });
        } else if (key === 'isOfficial') {
          const isOfficialValue = value.toLowerCase().trim();
          filtered = filtered.filter(item => {
            const isOfficial = item.isOfficial !== undefined ? item.isOfficial : false;
            // Exact match for official/unofficial
            if (isOfficialValue === 'rəsmi' || isOfficialValue === 'official') {
              return isOfficial === true;
            } else if (isOfficialValue === 'qeyri-rəsmi' || isOfficialValue === 'unofficial') {
              return isOfficial === false;
            }
            return true;
          });
        } else {
          // Default string matching
          filtered = filtered.filter(item =>
            item[key]?.toString().toLowerCase().includes(value.toLowerCase())
          );
        }
      }
    });

    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.createdAt || item.date);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }

    return filtered;
  }, [data, searchTerm, filters, dateRange, searchFields, serverSidePagination]);

  const sortedData = useMemo(() => {
    // If server-side pagination, skip client-side sorting (server handles it)
    if (serverSidePagination) {
      return filteredData;
    }

    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig, serverSidePagination]);

  // Server-side pagination: use data directly, client-side: paginate locally
  const paginatedData = useMemo(() => {
    if (serverSidePagination) {
      // Server-side: data is already paginated
      return sortedData;
    } else {
      // Client-side: paginate locally
      const startIndex = (currentPage - 1) * itemsPerPage;
      return sortedData.slice(startIndex, startIndex + itemsPerPage);
    }
  }, [sortedData, currentPage, itemsPerPage, serverSidePagination]);

  // Total pages: use server pagination if available, otherwise calculate from local data
  const totalPages = serverSidePagination && pagination 
    ? pagination.totalPages 
    : Math.ceil(sortedData.length / itemsPerPage);
  
  // Current page: use server pagination if available
  const effectivePage = serverSidePagination && pagination ? pagination.page : currentPage;
  const effectiveLimit = serverSidePagination && pagination ? pagination.limit : itemsPerPage;
  const effectiveTotal = serverSidePagination && pagination ? pagination.total : sortedData.length;

  const handleResizeStart = (columnKey, e) => {
    e.preventDefault();
    e.stopPropagation();
    const th = e.currentTarget.closest('th');
    const currentWidth = th?.offsetWidth || 200;
    resizeRef.current = { columnKey, startX: e.clientX, startWidth: currentWidth };
    setIsResizing(true);
  };

  useEffect(() => {
    const handleResizeMove = (e) => {
      if (!isResizing) return;

      const diff = e.clientX - resizeRef.current.startX;
      const newWidth = Math.max(150, resizeRef.current.startWidth + diff);

      setColumnWidths(prev => ({
        ...prev,
        [resizeRef.current.columnKey]: newWidth
      }));
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      resizeRef.current = { columnKey: null, startX: 0, startWidth: 0 };
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-visible">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>
        <LoadingSpinner
          size="lg"
          text={t('loading', 'Loading...')}
          className="py-16"
        />
      </div>
    );
  }

  // Check if there are active filters/search
  const hasActiveFilters = (serverSidePagination && searchValue) || 
                          (!serverSidePagination && searchTerm) || 
                          (dateRange.start && dateRange.end && datePreset !== 'all') ||
                          Object.keys(filters).some(key => filters[key]);
  
  // Show simple empty state only when there's no data at all and no active filters
  if (!loading && data.length === 0 && !hasActiveFilters) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-visible">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>
        <EmptyState {...emptyState} />
      </div>
    );
  }

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectRow = (id) => {
    setSelectedRows(prev =>
      prev.includes(id)
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedRows.length === paginatedData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedData.map(item => item.id));
    }
  };

  // Handle bulk actions
  const handleBulkDelete = () => {
    if (selectedRows.length > 0 && onBulkDelete) {
      onBulkDelete(selectedRows);
      setSelectedRows([]);
    }
  };

  // Get today date helper
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Handle date preset change for server-side
  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    if (!serverSidePagination || !onDatePresetChange) return;
    
    const today = new Date();
    let startDate, endDate;

    switch (preset) {
      case 'today':
        startDate = endDate = getTodayDate();
        break;
      case 'week': {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        startDate = weekStart.toISOString().split('T')[0];
        endDate = getTodayDate();
        break;
      }
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        endDate = getTodayDate();
        break;
      case '6months': {
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        startDate = sixMonthsAgo.toISOString().split('T')[0];
        endDate = getTodayDate();
        break;
      }
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        endDate = getTodayDate();
        break;
      case 'all':
        if (onDateRangeChange) {
          onDateRangeChange('', '');
        }
        if (onDatePresetChange) {
          onDatePresetChange(preset);
        }
        return;
      case 'custom':
        if (!dateRange.start || !dateRange.end) {
          const today = getTodayDate();
          if (onDateRangeChange) {
            onDateRangeChange(today, today);
          }
        }
        if (onDatePresetChange) {
          onDatePresetChange(preset);
        }
        return;
      default:
        return;
    }

    if (onDateRangeChange) {
      onDateRangeChange(startDate, endDate);
    }
    if (onDatePresetChange) {
      onDatePresetChange(preset);
    }
  };

  // Handle date range change for server-side
  const handleDateRangeChange = (start, end) => {
    setDateRange({ start, end });
    if (serverSidePagination && onDateRangeChange) {
      onDateRangeChange(start, end);
    }
    // When manually changing date, set preset to 'custom'
    if (serverSidePagination) {
      setDatePreset('custom');
    }
  };

  // Clear filters
  const clearFilters = () => {
    if (serverSidePagination && onClearFilters) {
      onClearFilters();
    } else {
      setSearchTerm('');
      setFilters({});
      setDateRange({ start: '', end: '' });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-visible">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>

          {/* Search and Filters - Right side */}
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
            {/* Search Input */}
            {showSearch && (
              <div className="relative w-full lg:w-auto lg:min-w-[280px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={serverSidePagination && searchPlaceholder ? searchPlaceholder : "Axtar..."}
                  value={serverSidePagination && searchValue !== undefined ? searchValue : searchTerm}
                  onChange={(e) => {
                    if (serverSidePagination && onSearchChange) {
                      onSearchChange(e.target.value);
                    } else {
                      setSearchTerm(e.target.value);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white  transition-colors"
                />
              </div>
            )}

            {/* Date Filter - Server-side pagination */}
            {serverSidePagination && showDateFilter && (
              <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center w-full lg:w-auto">
                {/* Date Preset Selector */}
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    Tarix:
                  </label>
                  <select
                    onChange={(e) => handleDatePresetChange(e.target.value)}
                    value={datePreset}
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 focus:outline-none  transition-colors min-w-[140px]"
                  >
                    <option value="today">Bu gün</option>
                    <option value="week">Bu həftə</option>
                    <option value="month">Bu ay</option>
                    <option value="6months">Son 6 ay</option>
                    <option value="year">Bu il</option>
                    <option value="all">Hamısı</option>
                    <option value="custom">Xüsusi aralıq</option>
                  </select>
                </div>

                {/* Date Range Filter - Only show when "custom" preset is selected */}
                {datePreset === 'custom' && (
                  <div className="flex gap-2 w-full lg:w-auto">
                    <div className="flex-1 lg:flex-none lg:min-w-[150px]">
                      <input
                        type="date"
                        value={dateRange.start || ''}
                        onChange={(e) => handleDateRangeChange(e.target.value, dateRange.end)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div className="flex-1 lg:flex-none lg:min-w-[150px]">
                      <input
                        type="date"
                        value={dateRange.end || ''}
                        onChange={(e) => handleDateRangeChange(dateRange.start, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Clear Filters Button - Left side, after filters - Always visible, disabled when no filters */}
            <button
              onClick={clearFilters}
              disabled={
                !((serverSidePagination && ((dateRange.start && dateRange.start !== getTodayDate()) || 
                  (dateRange.end && dateRange.end !== getTodayDate()) || searchValue)) ||
                (!serverSidePagination && (searchTerm || (dateRange.start && dateRange.end) ||
                  Object.keys(filters).some(key => filters[key]))))
              }
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                ((serverSidePagination && ((dateRange.start && dateRange.start !== getTodayDate()) || 
                  (dateRange.end && dateRange.end !== getTodayDate()) || searchValue)) ||
                (!serverSidePagination && (searchTerm || (dateRange.start && dateRange.end) ||
                  Object.keys(filters).some(key => filters[key]))))
                  ? 'text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer'
                  : 'text-gray-400 bg-gray-50 cursor-not-allowed opacity-60'
              }`}
            >
              {t('clear_all') || 'Təmizlə'}
            </button>

            {/* Default Filters Dropdown */}
            {!serverSidePagination && showFilters && (
              <div className="relative w-full lg:w-auto" ref={filterDropdownRef}>
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 transition-colors w-full lg:w-auto"
                >
                  <Filter className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">{t('filters')}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showFilterDropdown && (
                  <div className="absolute right-0 lg:right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-visible">
                    <div className="p-6 pb-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">{t('filters')}</h3>
                      <p className="text-xs text-gray-500 mt-1">{t('filter_description') || 'Məhsulları filtrləyin'}</p>
                    </div>
                    <div className="p-6 pt-5 space-y-5 max-h-[70vh] overflow-y-auto">
                      {/* Date Range Filter */}
                      {showDateFilter && (
                        <div className="w-full">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('date_range')}
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="date"
                              value={dateRange.start}
                              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
                            />
                            <input
                              type="date"
                              value={dateRange.end}
                              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
                            />
                          </div>
                        </div>
                      )}

                      {/* Column Filters */}
                      {Object.entries(filterOptions).map(([key, options]) => {
                        // Get label translation
                        const getLabel = (filterKey) => {
                          const labels = {
                            categoryName: tProduct('category') || t('category') || 'Kateqoriya',
                            stockStatus: tProduct('stock_status') || 'Stok Statusu',
                            isActive: tProduct('status') || t('status') || 'Status',
                            isOfficial: tProduct('official_status') || 'Rəsmi Status'
                          };
                          return labels[filterKey] || filterKey.charAt(0).toUpperCase() + filterKey.slice(1);
                        };

                        // Skip empty filter options
                        if (!options || options.length === 0) {
                          return null;
                        }

                        return (
                          <div key={key} className="w-full">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {getLabel(key)}
                            </label>
                            <select
                              value={filters[key] || ''}
                              onChange={(e) => setFilters(prev => ({ ...prev, [key]: e.target.value }))}
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm text-gray-900 transition-colors appearance-none cursor-pointer"
                              style={{ 
                                minHeight: '42px',
                                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                backgroundPosition: 'right 0.5rem center',
                                backgroundRepeat: 'no-repeat',
                                backgroundSize: '1.5em 1.5em',
                                paddingRight: '2.5rem'
                              }}
                            >
                              <option value="" className="text-gray-500">{t('all') || 'Hamısı'}</option>
                              {options.map((option, index) => (
                                <option 
                                  key={`${option}-${index}`} 
                                  value={option} 
                                  className="text-gray-900 py-1"
                                >
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}

                      <div className="flex gap-3 pt-5 border-t border-gray-200">
                        <button
                          onClick={clearFilters}
                          className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          {t('clear_all')}
                        </button>
                        <button
                          onClick={() => setShowFilterDropdown(false)}
                          className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors shadow-sm"
                        >
                          {t('apply')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Results Count - Right aligned */}
            {pagination && pagination.total > 0 && (
              <div className="text-sm text-gray-600 ml-auto">
                <span className="font-semibold text-gray-900">{pagination.total}</span> nəticə
              </div>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        {showBulkActions && selectedRows.length > 0 && (
          <div className="mt-4 flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-700">
              {selectedRows.length} {t('items_selected')}
            </span>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              {t('delete_selected')}
            </button>
            <button
              onClick={() => setSelectedRows([])}
              className="flex items-center gap-2 px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
            >
              <X className="w-4 h-4" />
              {t('clear_selection')}
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto overflow-visible">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {showBulkActions && (
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors relative group"
                  style={{ width: columnWidths[column.key] }}
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {sortConfig.key === column.key ? (
                      sortConfig.direction === 'asc' ? (
                        <ArrowUp className="w-4 h-4 text-blue-600" />
                      ) : (
                        <ArrowDown className="w-4 h-4 text-blue-600" />
                      )
                    ) : (
                      <ArrowUpDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div
                    onMouseDown={(e) => handleResizeStart(column.key, e)}
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize opacity-0 group-hover:opacity-100 bg-gray-400 hover:bg-blue-500 transition-all"
                  />
                </th>
              ))}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((item) => (
              <tr
                key={item.id}
                className={`hover:bg-gray-50 cursor-pointer ${selectedRows.includes(item.id) ? 'bg-blue-50' : ''}`}
                onClick={() => showBulkActions && handleSelectRow(item.id)}
              >
                {showBulkActions && (
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    {/* Disable checkbox for Superadmin or Core Roles */}
                    {(() => {
                      const roleName = item.role?.name || item.role || '';
                      const isSuperadmin = roleName.toLowerCase() === 'superadmin';
                      const isCoreRole = item.isCore === true; // Əsas rol yoxlaması
                      
                      return (
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(item.id)}
                          onChange={() => handleSelectRow(item.id)}
                          disabled={isSuperadmin || isCoreRole}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      );
                    })()}
                  </td>
                )}
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                    style={{ width: columnWidths[column.key] }}
                  >
                    {column.render ? column.render(item[column.key], item) : item[column.key]}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    {/* Check if item is Superadmin or Core Role - hide all actions */}
                    {(() => {
                      const roleName = item.role?.name || item.role || '';
                      const isSuperadmin = roleName.toLowerCase() === 'superadmin';
                      const isCoreRole = item.isCore === true || item.role?.isCore === true; // Əsas rol yoxlaması
                      
                      if (isSuperadmin || isCoreRole) {
                        return (
                          <span className="text-gray-400 text-xs">{t('restricted') || 'Məhdudiyyətli'}</span>
                        );
                      }
                      
                      return (
                        <>
                          {onView && (
                            <button
                              onClick={() => onView(item)}
                              className="text-blue-600 hover:text-blue-900 p-1"
                              title={t('view')}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {onEdit && (
                            <button
                              onClick={() => onEdit(item)}
                              className="text-indigo-600 hover:text-indigo-900 p-1"
                              title={t('edit')}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(item)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title={t('delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </td>
              </tr>
            ))}
            {/* No results found row - Show when filtered/search has no results */}
            {paginatedData.length === 0 && hasActiveFilters && (
              <tr>
                <td
                  colSpan={columns.length + (showBulkActions ? 2 : 1)}
                  className="px-6 py-12 text-center"
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nəticə tapılmadı
                    </h3>
                    <p className="text-gray-500 text-center max-w-sm">
                      Axtarış və ya filter parametrlərinə uyğun nəticə tapılmadı
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">{t('show')}</span>
              <select
                value={effectiveLimit}
                onChange={(e) => {
                  if (serverSidePagination && onLimitChange) {
                    onLimitChange(Number(e.target.value));
                  } else {
                    setItemsPerPage(Number(e.target.value));
                  }
                }}
                className="px-2 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-700">
                {((effectivePage - 1) * effectiveLimit + 1)}-{Math.min(effectivePage * effectiveLimit, effectiveTotal)} / {effectiveTotal}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (serverSidePagination && onPageChange) {
                    onPageChange(effectivePage - 1);
                  } else {
                    setCurrentPage(prev => Math.max(prev - 1, 1));
                  }
                }}
                disabled={effectivePage === 1 || (serverSidePagination && pagination && !pagination.hasPrevPage)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                {t('previous')}
              </button>

              <div className="flex items-center gap-1">
                {/* Page number input */}
                <span className="text-sm text-gray-700">Səhifə:</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={effectivePage}
                  onChange={(e) => {
                    const pageNum = parseInt(e.target.value);
                    if (pageNum >= 1 && pageNum <= totalPages) {
                      if (serverSidePagination && onPageChange) {
                        onPageChange(pageNum);
                      } else {
                        setCurrentPage(pageNum);
                      }
                    }
                  }}
                  className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">/ {totalPages}</span>
              </div>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (effectivePage <= 3) {
                    pageNum = i + 1;
                  } else if (effectivePage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = effectivePage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => {
                        if (serverSidePagination && onPageChange) {
                          onPageChange(pageNum);
                        } else {
                          setCurrentPage(pageNum);
                        }
                      }}
                      className={`px-3 py-1 border rounded-md text-sm ${
                        effectivePage === pageNum
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  if (serverSidePagination && onPageChange) {
                    onPageChange(effectivePage + 1);
                  } else {
                    setCurrentPage(prev => Math.min(prev + 1, totalPages));
                  }
                }}
                disabled={effectivePage === totalPages || (serverSidePagination && pagination && !pagination.hasNextPage)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                {t('next')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}