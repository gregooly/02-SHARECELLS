'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import Spinner from '@/components/ui/Spinner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import PromptDialog from '@/components/ui/PromptDialog';

interface User {
  id: number;
  username: string;
  isActive: number;
  isPasswordRequest: number;
}

interface DeleteDialogState {
  isOpen: boolean;
  userId: number | null;
  username: string;
}

interface PasswordDialogState {
  isOpen: boolean;
  userId: number | null;
  username: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const { showToast } = useToast();
  
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    isOpen: false,
    userId: null,
    username: ''
  });

  const [passwordDialog, setPasswordDialog] = useState<PasswordDialogState>({
    isOpen: false,
    userId: null,
    username: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        showToast('error', 'Error', 'Failed to fetch users');
      }
    } catch {
      showToast('error', 'Error', 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: number, currentStatus: number) => {
    const actionKey = `status-${userId}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ isActive: currentStatus === 0 ? true : false }),
      });

      if (response.ok) {
        showToast('success', 'Success', currentStatus === 0 ? 'User activated' : 'User deactivated');
        fetchUsers(); // Refresh the list
      } else {
        const data = await response.json();
        showToast('error', 'Error', data.message || 'Failed to update user status');
      }
    } catch {
      showToast('error', 'Error', 'Failed to update user status');
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const deleteUser = async (userId: number, username: string) => {
    setDeleteDialog({
      isOpen: true,
      userId,
      username
    });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.userId) return;

    const actionKey = `delete-${deleteDialog.userId}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));

    try {
      const response = await fetch(`/api/admin/users/${deleteDialog.userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        showToast('success', 'Success', 'User deleted successfully');
        fetchUsers(); // Refresh the list
      } else {
        const data = await response.json();
        showToast('error', 'Error', data.message || 'Failed to delete user');
      }
    } catch {
      showToast('error', 'Error', 'Failed to delete user');
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const changePassword = async (userId: number, username: string) => {
    setPasswordDialog({
      isOpen: true,
      userId,
      username
    });
  };

  const confirmPasswordChange = async (newPassword: string) => {
    if (!passwordDialog.userId) return;

    const actionKey = `password-${passwordDialog.userId}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));

    try {
      const response = await fetch(`/api/admin/users/${passwordDialog.userId}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ newPassword }),
      });

      if (response.ok) {
        showToast('success', 'Success', 'Password updated successfully');
        fetchUsers(); // Refresh the list
      } else {
        const data = await response.json();
        showToast('error', 'Error', data.message || 'Failed to update password');
      }
    } catch {
      showToast('error', 'Error', 'Failed to update password');
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">User Management</h2>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-center items-center py-8">
            <Spinner size={32} />
            <span className="ml-2">Loading users...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">User Management</h2>      
      <div className="bg-white rounded-lg shadow p-4">
        {users.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No users found for your account.
          </div>
        ) : (
          <div className="overflow-x-auto border-1 border-[#d4a600] rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-[#d4a600]">
              <thead className="bg-[#fff2aa]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-1 border-[#d4a600]">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-1 border-[#d4a600]">
                    Active Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-1 border-[#d4a600]">
                    Password Change
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-1 border-[#d4a600]">
                    Delete
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-[#fffbf0] transition-colors">
                    <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.username}
                      {user.isPasswordRequest === 1 && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Password Change Requested
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap">
                      <button
                        onClick={() => toggleUserStatus(user.id, user.isActive)}
                        disabled={actionLoading[`status-${user.id}`]}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          user.isActive === 1
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        } ${actionLoading[`status-${user.id}`] ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {actionLoading[`status-${user.id}`] ? (
                          <>
                            <Spinner size={12} className="mr-1" />
                            Processing...
                          </>
                        ) : (
                          user.isActive === 1 ? 'Active' : 'Inactive'
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap">
                      <button
                        onClick={() => changePassword(user.id, user.username)}
                        disabled={actionLoading[`password-${user.id}`]}
                        className="inline-flex items-center px-3 py-1 border border-blue-300 rounded text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading[`password-${user.id}`] ? (
                          <>
                            <Spinner size={12} className="mr-1" />
                            Updating...
                          </>
                        ) : (
                          'Change Password'
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap">
                      <button
                        onClick={() => deleteUser(user.id, user.username)}
                        disabled={actionLoading[`delete-${user.id}`]}
                        className="inline-flex items-center px-3 py-1 border border-red-300 rounded text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading[`delete-${user.id}`] ? (
                          <>
                            <Spinner size={12} className="mr-1" />
                            Deleting...
                          </>
                        ) : (
                          'Delete'
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, userId: null, username: '' })}
        onConfirm={confirmDelete}
        title="Delete User"
        message={`Are you sure you want to delete user "${deleteDialog.username}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Password Change Dialog */}
      <PromptDialog
        isOpen={passwordDialog.isOpen}
        onClose={() => setPasswordDialog({ isOpen: false, userId: null, username: '' })}
        onConfirm={confirmPasswordChange}
        title="Change Password"
        message={`Enter new password for user "${passwordDialog.username}":`}
        placeholder="Enter new password"
        inputType="password"
        confirmText="Change Password"
        cancelText="Cancel"
        validator={(value) => {
          if (!value) return 'Password is required';
          if (value.length < 6) return 'Password must be at least 6 characters long';
          return null;
        }}
      />
    </div>
  );
}


