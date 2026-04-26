// app/components/qr/BrandHeader.tsx

interface BrandHeaderProps {
  subtitle?: string;
}

export default function BrandHeader({ subtitle }: BrandHeaderProps) {
  return (
    <div className="mb-8 text-center">
      {/* Icon mark */}
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-900 shadow-lg shadow-stone-900/10">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
          className="h-9 w-9 text-amber-400"
        >
          <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Brand name */}
      <h1 className="font-serif text-2xl font-medium tracking-tight text-stone-800">
        Atelier<span className="text-amber-600">Works</span>
      </h1>

      {/* Subtitle */}
      {subtitle && (
        <p className="mt-2 text-[13px] text-stone-400 tracking-wide">
          {subtitle}
        </p>
      )}

      {/* Divider */}
      <div className="mx-auto mt-5 flex items-center gap-3 w-48">
        <span className="h-px flex-1 bg-stone-200" />
        <span className="h-0.5 w-1.5 rounded-full bg-amber-300" />
        <span className="h-px flex-1 bg-stone-200" />
      </div>
    </div>
  );
}
