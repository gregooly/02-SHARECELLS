import React from 'react';

interface Sheet {
  id: number;
  manager_id: number;
  sheet_number: number | null;
  sheet_name: string;
  created_at: string | null;
  manager_name?: string;
}

interface AgentSheetCardProps {
  sheet: Sheet;
  onView: (sheetId: number, sheetName: string) => void;
}

export default function AgentSheetCard({ sheet, onView }: AgentSheetCardProps) {
  return (
    <div 
      className="border-2 border-[#d4a600] rounded-lg p-4 hover:shadow-lg transition-shadow duration-200 bg-[#fffbf0] cursor-pointer"
      onClick={() => onView(sheet.id, sheet.sheet_name)}
    >
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">{sheet.sheet_number}</p>
          <div className="text-gray-500">
            <img 
              src="/svg/worksheet.svg" 
              alt="Worksheet" 
              className="w-5 h-5 opacity-60"
            />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1 text-center">{sheet.sheet_name}</h3>
      </div>
      <div className="flex items-center justify-end text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
        <span className="hidden sm:inline">
          {new Date(sheet.created_at || '').toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>
    </div>
  );
}
