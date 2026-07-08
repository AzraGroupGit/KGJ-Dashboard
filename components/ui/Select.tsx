// components/ui/Select.tsx

"use client";

import { forwardRef } from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Array<{ value: string; label: string }>;
  error?: string;
  fullWidth?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, options, error, fullWidth = true, className = "", ...props },
    ref,
  ) => {
    const widthClass = fullWidth ? "w-full" : "";

    return (
      <div className={`${widthClass} ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-[#e8e2d4] mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`
            px-3 py-2 border rounded-lg shadow-sm
            focus:outline-none focus:ring-2 focus:ring-[#c9a227] focus:border-transparent
            disabled:bg-[#332d29] disabled:cursor-not-allowed
            ${error ? "border-red-500" : "border-[#c9a227]/15"}
            ${widthClass}
          `}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
      </div>
    );
  },
);

Select.displayName = "Select";

export default Select;
