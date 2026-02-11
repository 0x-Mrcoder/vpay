import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
    count?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'text',
    width,
    height,
    count = 1,
}) => {
    const baseClasses = 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]';

    const variantClasses = {
        text: 'rounded h-4',
        circular: 'rounded-full',
        rectangular: 'rounded-lg',
    };

    const style: React.CSSProperties = {
        width: width || (variant === 'circular' ? '40px' : '100%'),
        height: height || (variant === 'circular' ? '40px' : variant === 'text' ? '1rem' : '200px'),
    };

    const skeletonElement = (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            style={style}
        />
    );

    if (count === 1) {
        return skeletonElement;
    }

    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className="mb-2">
                    {skeletonElement}
                </div>
            ))}
        </>
    );
};

// Preset skeleton components for common use cases
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
    rows = 5,
    columns = 4,
}) => (
    <div className="w-full">
        {/* Table Header */}
        <div className="flex gap-4 mb-4 pb-2 border-b">
            {Array.from({ length: columns }).map((_, i) => (
                <Skeleton key={`header-${i}`} width="25%" height="20px" />
            ))}
        </div>
        {/* Table Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={`row-${rowIndex}`} className="flex gap-4 mb-3">
                {Array.from({ length: columns }).map((_, colIndex) => (
                    <Skeleton key={`cell-${rowIndex}-${colIndex}`} width="25%" height="16px" />
                ))}
            </div>
        ))}
    </div>
);

export const CardSkeleton: React.FC = () => (
    <div className="bg-white rounded-lg shadow p-6">
        <Skeleton width="60%" height="24px" className="mb-4" />
        <Skeleton width="100%" height="16px" className="mb-2" />
        <Skeleton width="80%" height="16px" className="mb-4" />
        <div className="flex gap-2">
            <Skeleton width="100px" height="32px" variant="rectangular" />
            <Skeleton width="100px" height="32px" variant="rectangular" />
        </div>
    </div>
);

export const StatCardSkeleton: React.FC = () => (
    <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-2">
            <Skeleton width="120px" height="16px" />
            <Skeleton variant="circular" width="40px" height="40px" />
        </div>
        <Skeleton width="80px" height="32px" className="mb-1" />
        <Skeleton width="100px" height="14px" />
    </div>
);

export const DashboardSkeleton: React.FC = () => (
    <div className="p-6">
        {/* Page Title */}
        <Skeleton width="300px" height="32px" className="mb-6" />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
        </div>

        {/* Content Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CardSkeleton />
            <CardSkeleton />
        </div>
    </div>
);

export const PageSkeleton: React.FC = () => (
    <div className="p-6">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-6">
            <Skeleton width="200px" height="32px" />
            <Skeleton width="120px" height="40px" variant="rectangular" />
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4 mb-6">
            <Skeleton width="300px" height="40px" variant="rectangular" />
            <Skeleton width="150px" height="40px" variant="rectangular" />
        </div>

        {/* Table */}
        <TableSkeleton rows={8} columns={5} />
    </div>
);

export default Skeleton;
