import React from 'react';
import { AlertCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    leftIcon,
    rightIcon,
    fullWidth = true,
    className = '',
    id,
    ...props
}) => {
    const inputId = id || props.name;

    return (
        <div className={`mb-4 ${fullWidth ? 'w-full' : ''}`}>
            {label && (
                <label htmlFor={inputId} className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">
                    {label}
                </label>
            )}
            <div className="relative">
                {leftIcon && (
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                        {leftIcon}
                    </div>
                )}
                <input
                    id={inputId}
                    className={`
                        w-full py-3 bg-gray-50 border rounded-xl text-sm text-gray-900 placeholder-gray-400
                        focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-500 transition-all
                        ${leftIcon ? 'pl-11' : 'pl-4'}
                        ${rightIcon ? 'pr-11' : 'pr-4'}
                        ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200'}
                        ${className}
                    `}
                    {...props}
                />
                {rightIcon && (
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400">
                        {rightIcon}
                    </div>
                )}
            </div>
            {error && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {error}
                </p>
            )}
        </div>
    );
};
