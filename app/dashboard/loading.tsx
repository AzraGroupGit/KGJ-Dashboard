// app/dashboard/loading.tsx

import Loading from "@/components/ui/Loading";

export default function DashboardLoading() {
  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-white border-r border-gray-200 animate-pulse">
        <div className="p-6">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        </div>
        <div className="flex-1 p-6">
          <Loading variant="skeleton" />
        </div>
      </div>
    </div>
  );
}
