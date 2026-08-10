import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/ToastProvider';

interface Sheet {
  id: number;
  manager_id: number;
  sheet_number: number | null;
  sheet_name: string;
  created_at: string | null;
  shareCount: number;
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

export function useSheetManagement() {
  const router = useRouter();
  const { showToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [adminId, setAdminId] = useState<number | null>(null);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteSheetId, setDeleteSheetId] = useState<number | null>(null);
  const [settingsSheetId, setSettingsSheetId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    // Decode token to get administrator ID
    const decodedToken = decodeToken(token || '');
    if (decodedToken) {
      setAdminId(decodedToken.userId);
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Fetch sheets
    fetchSheets();
  }, [router]);

  const fetchSheets = async () => {
    try {
      const response = await fetch('/api/admin/sheets', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setSheets(data.sheets);
      } else {
        showToast('error', 'Error', 'Failed to fetch sheets');
      }
    } catch {
      showToast('error', 'Error', 'Failed to fetch sheets');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSheet = async (sheetNumber: string, sheetName: string) => {
    try {
      const response = await fetch('/api/admin/sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ sheetNumber, sheetName }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('success', 'Success', `Sheet "${sheetName}" added successfully!`);
        fetchSheets(); // Refresh the list
      } else {
        showToast('error', 'Error', data.message || 'Failed to add sheet');
      }
    } catch {
      showToast('error', 'Error', 'Failed to add sheet');
    }
  };

  const handleDeleteSheet = (sheetId: number) => {
    setDeleteSheetId(sheetId);
  };

  const confirmDeleteSheet = async () => {
    if (!deleteSheetId) return;

    try {
      const response = await fetch(`/api/admin/sheets/${deleteSheetId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        showToast('success', 'Success', 'Sheet deleted successfully!');
        fetchSheets(); // Refresh the list
      } else {
        showToast('error', 'Error', data.message || 'Failed to delete sheet');
      }
    } catch {
      showToast('error', 'Error', 'Failed to delete sheet');
    } finally {
      setDeleteSheetId(null);
    }
  };

  const handleSheetSettings = (sheetId: number) => {
    setSettingsSheetId(sheetId);
  };

  const closeSettingsPanel = () => {
    setSettingsSheetId(null);
  };

  const closeDeleteDialog = () => {
    setDeleteSheetId(null);
  };

  return {
    user,
    adminId,
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
  };
}

