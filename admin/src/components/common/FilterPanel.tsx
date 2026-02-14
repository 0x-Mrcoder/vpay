import React, { useState, useRef, useEffect } from 'react';

export interface FilterOption {
    label: string;
    value: string;
}

export interface FilterConfig {
    key: string;
    label: string;
    type: 'select' | 'date-range' | 'boolean'; // extensible types
    options?: FilterOption[];
}

interface FilterPanelProps {
    filters: FilterConfig[];
    activeFilters: Record<string, any>;
    onFilterChange: (key: string, value: any) => void;
    onClearFilters: () => void;
    className?: string;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
    filters,
    activeFilters,
    onFilterChange,
    onClearFilters,
    className = '',
}) => {
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const hasActiveFilters = Object.values(activeFilters).some(
        (val) => val && val !== 'all' && val !== ''
    );

    const toggleDropdown = (key: string) => {
        setOpenDropdown(openDropdown === key ? null : key);
    };

    return (
        <div className={`flex flex-wrap items-center gap-3 ${className}`} ref={dropdownRef}>
            <div className="flex items-center text-sm font-medium text-slate-500 mr-2">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                </svg>
                Filters:
            </div>

            {filters.map((filter) => (
                <div key={filter.key} className="relative">
                    <button
                        onClick={() => toggleDropdown(filter.key)}
                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${activeFilters[filter.key] && activeFilters[filter.key] !== 'all'
                            ? 'bg-primary-50 border-primary-200 text-primary-700'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                            }`}
                    >
                        {filter.label}
                        {activeFilters[filter.key] && activeFilters[filter.key] !== 'all' ? (
                            <span className="ml-2 bg-primary-200 text-primary-800 px-1.5 py-0.5 rounded text-xs">
                                {filter.options?.find((opt) => opt.value === activeFilters[filter.key])?.label ||
                                    activeFilters[filter.key]}
                            </span>
                        ) : null}
                        <svg
                            className={`w-4 h-4 ml-2 transition-transform ${openDropdown === filter.key ? 'rotate-180' : ''
                                }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {openDropdown === filter.key && (
                        <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 z-50 overflow-hidden">
                            {filter.type === 'select' && filter.options && (
                                <div className="max-h-60 overflow-y-auto">
                                    {filter.options.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => {
                                                onFilterChange(filter.key, option.value);
                                                setOpenDropdown(null);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 flex items-center justify-between ${activeFilters[filter.key] === option.value
                                                ? 'text-primary-600 font-medium bg-primary-50'
                                                : 'text-slate-700'
                                                }`}
                                        >
                                            {option.label}
                                            {activeFilters[filter.key] === option.value && (
                                                <svg
                                                    className="w-4 h-4"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M5 13l4 4L19 7"
                                                    />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Placeholder for future date range picker */}
                            {filter.type === 'date-range' && (
                                <div className="p-4 text-sm text-slate-500 text-center">
                                    Date picker coming soon
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {hasActiveFilters && (
                <button
                    onClick={onClearFilters}
                    className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors ml-auto sm:ml-0"
                >
                    Clear All
                </button>
            )}
        </div>
    );
};

export default FilterPanel;
