import React from 'react';
import Spinner from '@/components/ui/Spinner';

interface Sheet {
  id: number;
  manager_id: number;
  sheet_number: number | null;
  sheet_name: string;
  created_at: string | null;
  shareCount: number;
}

interface SheetTableProps {
  sheets: Sheet[];
  loading: boolean;
  onSettings: (sheetId: number) => void;
  onDelete: (sheetId: number) => void;
  onView: (sheetId: number, sheetName: string) => void;
}

export default function SheetTable({ sheets, loading, onSettings, onDelete, onView }: SheetTableProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner size={48} />
      </div>
    );
  }

  if (sheets.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-gray-500 text-center">No worksheets found. Click the "Add Sheet" button to create one.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border-1 border-[#d4a600] rounded-lg">
        <thead className="bg-[#fff2aa]">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-1 border-[#d4a600]">
              #
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-1 border-[#d4a600]">
              Sheet Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-1 border-[#d4a600]">
              Shared Users
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-1 border-[#d4a600]">
              Created Date
            </th>
            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-1 border-[#d4a600]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sheets.map((sheet, index) => (
            <tr 
              key={sheet.id} 
              className="hover:bg-[#fffbf0] transition-colors cursor-pointer"
              onClick={() => onView(sheet.id, sheet.sheet_name)}
            >
              <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                {sheet.sheet_number || index + 1}
              </td>
              <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                {sheet.sheet_name}
              </td>
              <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <img 
                    src="/svg/share.svg" 
                    alt="Shared users" 
                    className="w-4 h-3 opacity-60"
                  />
                  <span>{sheet.shareCount ?? 0}</span>
                </div>
              </td>
              <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                {sheet.created_at ? new Date(sheet.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : '-'}
              </td>
              <td className="px-6 py-3 whitespace-nowrap text-sm text-center">
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSettings(sheet.id);
                    }}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                    aria-label="Settings"
                  >
                    <img 
                      src="/svg/setting.svg" 
                      alt="Settings" 
                      className="w-5 h-5 opacity-60 hover:opacity-90"
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(sheet.id);
                    }}
                    className="text-red-500 hover:text-red-700 transition-colors"
                    aria-label="Delete"
                  >
                    <img 
                      src="/svg/delete.svg" 
                      alt="Delete" 
                      className="w-5 h-5 opacity-60 hover:opacity-90"
                    />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
