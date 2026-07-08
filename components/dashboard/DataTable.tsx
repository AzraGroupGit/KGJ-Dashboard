// components/dashboard/DataTable.tsx

"use client";

import { useState } from "react";
import { Search, Download } from "lucide-react";

export interface Column {
  key: string;
  label: string;
  format?: (value: unknown) => string;
}

interface DataTableProps {
  title: string;
  data: Record<string, unknown>[];
  columns: Column[];
  onSearch?: boolean;
  onExport?: boolean;
}

export default function DataTable({
  title,
  data,
  columns,
  onSearch = true,
  onExport = true,
}: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter data based on search term
  const filteredData = data.filter((item) =>
    Object.values(item).some((value) =>
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  // Export to CSV
  const handleExport = () => {
    const headers = columns.map((col) => col.label).join(",");
    const rows = data.map((row) =>
      columns
        .map((col) => {
          let value = row[col.key];
          if (col.format) {
            value = col.format(value);
          }
          return `"${value}"`;
        })
        .join(","),
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s/g, "_")}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#2a2522] rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-[#c9a227]/10 flex justify-between items-center flex-wrap gap-4">
        <h3 className="text-lg font-semibold text-[#f0f4ff]">{title}</h3>
        <div className="flex gap-3">
          {onSearch && (
            <div className="relative">
              <input
                type="text"
                placeholder="Cari data..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-4 py-2 border border-[#c9a227]/15 rounded-lg focus:ring-2 focus:ring-[#c9a227] focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-white/30" />
            </div>
          )}
          {onExport && (
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#1C1917]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c9a227]/10">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, index) => (
                <tr key={index} className="hover:bg-[#1C1917] transition-colors">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-6 py-4 whitespace-nowrap text-sm text-[#f0f4ff]"
                    >
                      {column.format
                        ? column.format(row[column.key])
                        : (row[column.key] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-8 text-center text-white/40"
                >
                  Tidak ada data yang ditemukan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-[#c9a227]/10 flex justify-between items-center">
          <div className="text-sm text-[#e8e2d4]">
            Menampilkan {startIndex + 1} -{" "}
            {Math.min(startIndex + itemsPerPage, filteredData.length)} dari{" "}
            {filteredData.length} data
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-[#c9a227]/15 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1C1917]"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-[#c9a227]/15 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1C1917]"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
