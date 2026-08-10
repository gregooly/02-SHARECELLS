import React from 'react';
import AgentSheetCard from './AgentSheetCard';
import Spinner from '@/components/ui/Spinner';

interface Sheet {
  id: number;
  manager_id: number;
  sheet_number: number | null;
  sheet_name: string;
  created_at: string | null;
  manager_name?: string;
}

interface AgentSheetGridProps {
  sheets: Sheet[];
  loading: boolean;
  onView: (sheetId: number, sheetName: string) => void;
}

export default function AgentSheetGrid({ sheets, loading, onView }: AgentSheetGridProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sheets.map((sheet) => (
        <AgentSheetCard
          key={sheet.id}
          sheet={sheet}
          onView={onView}
        />
      ))}
    </div>
  );
}
