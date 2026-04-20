// components/ui/Loading.tsx

"use client";

interface LoadingProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "spinner" | "dots" | "skeleton";
  fullScreen?: boolean;
  text?: string;
}

export default function Loading({
  size = "md",
  variant = "spinner",
  fullScreen = false,
  text = "Memuat data...",
}: LoadingProps) {
  const sizes = {
    sm: {
      spinner: "w-5 h-5",
      dots: "w-2 h-2",
      text: "text-sm",
    },
    md: {
      spinner: "w-8 h-8",
      dots: "w-3 h-3",
      text: "text-base",
    },
    lg: {
      spinner: "w-12 h-12",
      dots: "w-4 h-4",
      text: "text-lg",
    },
    xl: {
      spinner: "w-16 h-16",
      dots: "w-5 h-5",
      text: "text-xl",
    },
  };

  const renderSpinner = () => (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className={`${sizes[size].spinner} border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin`}
      />
      {text && <p className={`text-gray-600 ${sizes[size].text}`}>{text}</p>}
    </div>
  );

  const renderDots = () => (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="flex gap-2">
        <div
          className={`${sizes[size].dots} bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]`}
        />
        <div
          className={`${sizes[size].dots} bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]`}
        />
        <div
          className={`${sizes[size].dots} bg-indigo-600 rounded-full animate-bounce`}
        />
      </div>
      {text && <p className={`text-gray-600 ${sizes[size].text}`}>{text}</p>}
    </div>
  );

  const renderSkeleton = () => (
    <div className="w-full space-y-4">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6" />
      </div>
    </div>
  );

  const renderContent = () => {
    switch (variant) {
      case "dots":
        return renderDots();
      case "skeleton":
        return renderSkeleton();
      default:
        return renderSpinner();
    }
  };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center">
        {renderContent()}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      {renderContent()}
    </div>
  );
}
