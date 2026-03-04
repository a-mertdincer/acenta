import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

export function Input({ label, className = '', id, ...props }: InputProps) {
    const inputId = id || label.replace(/\s+/g, '-').toLowerCase();

    return (
        <div className="form-group">
            <label htmlFor={inputId} className="form-label">{label}</label>
            <input
                id={inputId}
                className={`form-control ${className}`}
                {...props}
            />
        </div>
    );
}
