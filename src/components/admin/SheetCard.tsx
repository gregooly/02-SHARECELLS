import React from 'react';

interface SheetCardProps {
  sheet: {
    id: number;
    sheet_number: number | null;
    sheet_name: string;
    created_at: string | null;
    shareCount: number;
  };
  onSettings: (sheetId: number) => void;
  onDelete: (sheetId: number) => void;
  onView: (sheetId: number, sheetName: string) => void;
}

export default function SheetCard({ sheet, onSettings, onDelete, onView }: SheetCardProps) {
  return (
    <div 
      className="border-2 border-[#d4a600] rounded-lg p-4 hover:shadow-lg transition-shadow duration-200 bg-[#fffbf0] cursor-pointer"
      onClick={() => onView(sheet.id, sheet.sheet_name)}
    >
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">{sheet.sheet_number}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSettings(sheet.id);
            }}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Sheet settings"
          >
            <img 
              src="/svg/setting.svg" 
              alt="Settings" 
              className="w-5 h-5 opacity-60 hover:opacity-90"
            />
          </button>
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1 text-center">{sheet.sheet_name}</h3>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center gap-1 text-blue-600">
          <img 
            src="/svg/share.svg" 
            alt="Shared users" 
            className="w-5 h-5 opacity-60 hover:opacity-90"
          />
          <span className="text-sm text-gray-600  font-medium">{sheet.shareCount ?? 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">
            {new Date(sheet.created_at || '').toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(sheet.id);
            }}
            className="text-red-500 hover:text-red-700 transition-colors"
            aria-label="Delete sheet"
          >
            <img 
              src="/svg/delete.svg" 
              alt="Delete" 
              className="w-5 h-5 opacity-60 hover:opacity-90"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
