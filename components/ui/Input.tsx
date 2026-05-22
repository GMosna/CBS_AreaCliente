'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    return (
      <div className="input-wrapper">
        {label && (
          <label htmlFor={id} className="input-label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={['input', error && 'input-error', className]
            .filter(Boolean)
            .join(' ')}
          aria-invalid={!!error}
          aria-describedby={error && id ? `${id}-error` : undefined}
          {...props}
        />
        {error && (
          <span id={id ? `${id}-error` : undefined} className="input-error-msg" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
