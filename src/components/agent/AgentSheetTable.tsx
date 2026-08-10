import React from 'react';
import Spinner from '@/components/ui/Spinner';

interface Sheet {
  id: number;
  manager_id: number;
  sheet_number: number | null;
  sheet_name: string;
  created_at: string | null;
  manager_name?: string;
}

interface AgentSheetTableProps {
  sheets: Sheet[];
  loading: boolean;
  onView: (sheetId: number, sheetName: string) => void;
}

export default function AgentSheetTable({ sheets, loading, onView }: AgentSheetTableProps) {
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
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 text-lg mb-2">No shared worksheets</p>
          <p className="text-gray-400 text-sm">Your administrator hasn't shared any worksheets with you yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border-1 border-[#d4a600]">
      <table className="min-w-full divide-y divide-[#d4a600]">
        <thead className="bg-[#fff2aa]">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-1 border-[#d4a600]">
              #
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-1 border-[#d4a600]">
              Sheet Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-1 border-[#d4a600]">
              Shared By
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-1 border-[#d4a600]">
              Created Date
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sheets.map((sheet, index) => (
            <tr 
              key={sheet.id} 
              onClick={() => onView(sheet.id, sheet.sheet_name)}
              className="hover:bg-[#fffbf0] transition-colors cursor-pointer"
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {index + 1}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                {sheet.sheet_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {sheet.manager_name || 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {sheet.created_at ? new Date(sheet.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
