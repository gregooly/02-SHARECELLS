import React from 'react';
import SheetCard from './SheetCard';
import Spinner from '@/components/ui/Spinner';

interface Sheet {
  id: number;
  manager_id: number;
  sheet_number: number | null;
  sheet_name: string;
  created_at: string | null;
  shareCount: number;
}

interface SheetGridProps {
  sheets: Sheet[];
  loading: boolean;
  onSettings: (sheetId: number) => void;
  onDelete: (sheetId: number) => void;
  onView: (sheetId: number, sheetName: string) => void;
}

export default function SheetGrid({ sheets, loading, onSettings, onDelete, onView }: SheetGridProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sheets.map((sheet) => (
        <SheetCard
          key={sheet.id}
          sheet={sheet}
          onSettings={onSettings}
          onDelete={onDelete}
          onView={onView}
        />
      ))}
    </div>
  );
}
