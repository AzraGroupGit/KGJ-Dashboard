// components/ui/Button.tsx

"use client";

import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "warning"
    | "outline"
    | "ghost";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      onClick,
      type = "button",
      disabled,
      className = "",
      ...props
    },
    ref,
  ) => {
    const variants = {
      primary:
        "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm hover:shadow-md",
      secondary:
        "bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-800",
      success:
        "bg-green-600 hover:bg-green-700 active:bg-green-800 text-white shadow-sm hover:shadow-md",
      danger:
        "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm hover:shadow-md",
      warning:
        "bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-white shadow-sm hover:shadow-md",
      outline:
        "bg-transparent border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100",
      ghost:
        "bg-transparent hover:bg-gray-100 active:bg-gray-200 text-gray-700",
    };

    const sizes = {
      xs: "px-2 py-1 text-xs rounded-md",
      sm: "px-3 py-1.5 text-sm rounded-lg",
      md: "px-4 py-2 text-base rounded-lg",
      lg: "px-6 py-2.5 text-lg rounded-xl",
      xl: "px-8 py-3 text-xl rounded-xl",
    };

    const baseClasses = `
      inline-flex items-center justify-center
      font-medium
      transition-all duration-200 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
      ${fullWidth ? "w-full" : ""}
      ${variants[variant]}
      ${sizes[size]}
      ${className}
    `;

    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={disabled || isLoading}
        className={baseClasses}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
