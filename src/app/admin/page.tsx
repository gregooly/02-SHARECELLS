'use client';

import { useState, useEffect } from 'react';
import WorkSheetsHeader from '@/components/admin/WorkSheetsHeader';
import SheetGrid from '@/components/admin/SheetGrid';
import SheetTable from '@/components/admin/SheetTable';
import SheetSettingsPanel from '@/components/admin/SheetSettingsPanel';
import SheetViewer from '@/components/admin/SheetViewer';
import AddSheetDialog from '@/components/ui/AddSheetDialog';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useSheetManagement } from '@/hooks/useSheetManagement';
import { useToast } from '@/components/ui/ToastProvider';

export default function AdminPage() {
  const [isAddSheetDialogOpen, setIsAddSheetDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [isLoadingView, setIsLoadingView] = useState(true);
  const [viewingSheetId, setViewingSheetId] = useState<number | null>(null);
  const [viewingSheetName, setViewingSheetName] = useState<string>('');
  const { showToast } = useToast();
  
  const {
    sheets,
    loading,
    deleteSheetId,
    settingsSheetId,
    handleAddSheet,
    handleDeleteSheet,
    confirmDeleteSheet,
    handleSheetSettings,
    closeSettingsPanel,
    closeDeleteDialog,
    fetchSheets,
  } = useSheetManagement();

  // Fetch view preference on component mount
  useEffect(() => {
    const fetchViewPreference = async () => {
      try {
        const response = await fetch('/api/admin/view-preference');
        if (response.ok) {
          const data = await response.json();
          setViewMode(data.view_type === 1 ? 'table' : 'card');
        }
      } catch {
        // Error fetching view preference
      } finally {
        setIsLoadingView(false);
      }
    };

    fetchViewPreference();
  }, []);

  const handleViewModeChange = async (newViewMode: 'card' | 'table') => {
    try {
      const view_type = newViewMode === 'table' ? 1 : 0;
      const response = await fetch('/api/admin/view-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view_type })
      });

      if (response.ok) {
        setViewMode(newViewMode);
        showToast('success', 'Success', `View mode changed to ${newViewMode}`);
      } else {
        showToast('error', 'Error', 'Failed to save view preference');
      }
    } catch {
      showToast('error', 'Error', 'Error updating view preference');
    }
  };

  const handleViewSheet = async (sheetId: number, sheetName: string) => {
    // Pre-validate that sheet has fields before opening viewer
    try {
      const response = await fetch(`/api/admin/sheet-data/${sheetId}`);
      if (response.status === 400) {
        const errorData = await response.json();
        showToast('error', 'Warning', errorData.error || 'You must design the sheet structure first.');
        return; // Don't open viewer
      }
      // Only open viewer if validation passed
      setViewingSheetId(sheetId);
      setViewingSheetName(sheetName);
    } catch {
      showToast('error', 'Error', 'Failed to load sheet data');
    }
  };

  const closeSheetViewer = () => {
    setViewingSheetId(null);
    setViewingSheetName('');
  };

  return (
    <div>
      <WorkSheetsHeader
        onAddSheet={() => setIsAddSheetDialogOpen(true)}
        onViewModeChange={handleViewModeChange}
        currentView={viewMode}
      />
      
      {/* Main Content Area */}
      <div className="bg-white rounded-lg shadow px-4 sm:px-6 py-4 sm:py-6 h-[calc(100vh-150px)] sm:h-[calc(100vh-190px)]">
        {viewingSheetId !== null ? (
          <SheetViewer
            sheetId={viewingSheetId}
            sheetName={viewingSheetName}
            onClose={closeSheetViewer}
          />
        ) : settingsSheetId !== null ? (
          <SheetSettingsPanel
            sheetId={settingsSheetId}
            sheetName={sheets.find(s => s.id === settingsSheetId)?.sheet_name || ''}
            onClose={closeSettingsPanel}
            onSheetUpdated={fetchSheets}
          />
        ) : (
          <>
            {isLoadingView ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : viewMode === 'card' ? (
              <SheetGrid
                sheets={sheets}
                loading={loading}
                onSettings={handleSheetSettings}
                onDelete={handleDeleteSheet}
                onView={handleViewSheet}
              />
            ) : (
              <SheetTable
                sheets={sheets}
                loading={loading}
                onSettings={handleSheetSettings}
                onDelete={handleDeleteSheet}
                onView={handleViewSheet}
              />
            )}
          </>
        )}
      </div>

      {/* Add Sheet Dialog */}
      <AddSheetDialog
        isOpen={isAddSheetDialogOpen}
        onClose={() => setIsAddSheetDialogOpen(false)}
        onConfirm={handleAddSheet}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteSheetId !== null}
        onClose={closeDeleteDialog}
        onConfirm={confirmDeleteSheet}
        title="Delete Sheet"
        message="Are you sure you want to delete this sheet? This action cannot be undone."
        type="danger"
      />
    </div>
  );
}

