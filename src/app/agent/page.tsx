'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AgentWorkSheetsHeader from '@/components/agent/AgentWorkSheetsHeader';
import AgentSheetGrid from '@/components/agent/AgentSheetGrid';
import AgentSheetTable from '@/components/agent/AgentSheetTable';
import SheetViewer from '@/components/agent/SheetViewer';
import { useToast } from '@/components/ui/ToastProvider';

interface Sheet {
  id: number;
  manager_id: number;
  sheet_number: number | null;
  sheet_name: string;
  created_at: string | null;
  manager_name?: string;
}

// Helper function to decode JWT token
function decodeToken(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export default function AgentPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [isLoadingView, setIsLoadingView] = useState(true);
  const [viewingSheetId, setViewingSheetId] = useState<number | null>(null);
  const [viewingSheetName, setViewingSheetName] = useState<string>('');
  const { showToast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    // Decode token to get agent ID
    const decodedToken = decodeToken(token || '');
    if (decodedToken) {
      setAgentId(decodedToken.userId);
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Fetch view preference
    fetchViewPreference();
    
    // Fetch shared sheets
    fetchSharedSheets();
  }, [router]);

  const fetchViewPreference = async () => {
    try {
      const response = await fetch('/api/agent/view-preference');
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

  const fetchSharedSheets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/agent/shared-sheets');
      
      if (response.ok) {
        const data = await response.json();
        setSheets(data.sheets || []);
      } else {
        showToast('error', 'Error', 'Failed to load worksheets');
      }
    } catch {
      showToast('error', 'Error', 'Error loading worksheets');
    } finally {
      setLoading(false);
    }
  };

  const handleViewModeChange = async (newViewMode: 'card' | 'table') => {
    try {
      const view_type = newViewMode === 'table' ? 1 : 0;
      const response = await fetch('/api/agent/view-preference', {
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

  const handleViewSheet = (sheetId: number, sheetName: string) => {
    setViewingSheetId(sheetId);
    setViewingSheetName(sheetName);
  };

  const closeSheetViewer = () => {
    setViewingSheetId(null);
    setViewingSheetName('');
    // Refresh sheets when closing viewer
    fetchSharedSheets();
  };

  return (
    <div>
      <AgentWorkSheetsHeader
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
        ) : (
          <>
            {isLoadingView ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : viewMode === 'card' ? (
              <AgentSheetGrid
                sheets={sheets}
                loading={loading}
                onView={handleViewSheet}
              />
            ) : (
              <AgentSheetTable
                sheets={sheets}
                loading={loading}
                onView={handleViewSheet}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

