import React from 'react';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

type ExportButtonProps = {
  data: any[];
  filename: string;
};

export function ExportButton({ data, filename }: ExportButtonProps) {
  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
    >
      <Download size={16} />
      <span>Export to Excel</span>
    </button>
  );
}
