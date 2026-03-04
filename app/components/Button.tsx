import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary';
    isLoading?: boolean;
}

export function Button({ variant = 'primary', className = '', children, isLoading, ...props }: ButtonProps) {
    const baseClass = "btn";
    const variantClass = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
    const loadingClass = isLoading ? 'opacity-50 cursor-not-allowed' : '';

    return (
        <button className={`${baseClass} ${variantClass} ${className} ${loadingClass}`} disabled={isLoading || props.disabled} {...props}>
            {isLoading ? 'Loading...' : children}
        </button>
    );
}
