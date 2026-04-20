// app/loading.tsx

import Loading from "@/components/ui/Loading";

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Loading fullScreen text="Memuat halaman..." />
    </div>
  );
}
