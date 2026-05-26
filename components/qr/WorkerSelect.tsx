"use client";

interface WorkerInfo {
  id: string;
  full_name: string;
  username: string;
}

interface WorkerSelectProps {
  workers: WorkerInfo[];
  onSelect: (worker: WorkerInfo) => void;
  onManualLogin: () => void;
  isLoading: boolean;
}

export default function WorkerSelect({
  workers,
  onSelect,
  onManualLogin,
  isLoading,
}: WorkerSelectProps) {
  return (
    <div>
      <div className="mb-6 text-center">
        <p className="text-[11px] uppercase tracking-wider text-stone-400">
          Pilih Pekerja
        </p>
        <p className="mt-1 text-sm text-stone-500">
          Siapa yang akan bekerja di workstation ini?
        </p>
      </div>

      {workers.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-stone-50/50 px-6 py-8 text-center">
          <p className="text-[15px] font-medium text-stone-500">
            Tidak ada pekerja tersedia
          </p>
          <p className="mt-1 text-[13px] text-stone-400">
            Tidak ditemukan pekerja dengan role yang sesuai.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {workers.map((worker) => (
            <button
              key={worker.id}
              type="button"
              onClick={() => onSelect(worker)}
              disabled={isLoading}
              className="group flex flex-col items-center gap-2 rounded-xl border-2 border-stone-200 bg-white px-3 py-5 transition-all hover:border-stone-800 hover:bg-stone-50 active:scale-[0.97] disabled:opacity-50"
            >
              {/* Avatar circle */}
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-[18px] font-semibold text-stone-500 transition-colors group-hover:bg-stone-800 group-hover:text-white">
                {worker.full_name.charAt(0).toUpperCase()}
              </div>
              {/* Name */}
              <span className="text-center text-[13px] font-medium text-stone-700 transition-colors group-hover:text-stone-900">
                {worker.full_name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Manual login toggle */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onManualLogin}
          className="text-[13px] text-stone-400 underline underline-offset-2 transition-colors hover:text-stone-600"
        >
          Login dengan username & password →
        </button>
      </div>
    </div>
  );
}
