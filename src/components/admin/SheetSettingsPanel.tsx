import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

interface SheetSettingsPanelProps {
  sheetId: number;
  sheetName: string;
  onClose: () => void;
  onSheetUpdated?: () => void;
}

interface Field {
  id: number;
  cell_title: string;
  cell_content: string;
  sheet_type: number;
  data_format: string;
}

interface User {
  id: number;
  username: string;
  isActive: number;
}

export default function SheetSettingsPanel({ sheetId, sheetName, onClose, onSheetUpdated }: SheetSettingsPanelProps) {
  const { showToast } = useToast();
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState({
    fieldName: '',
    dataType: 'dynamic',
    dataFormat: 'text'
  });
  const [newField, setNewField] = useState({
    fieldName: '',
    dataType: 'dynamic',
    dataFormat: 'text'
  });
  const [sheetInfo, setSheetInfo] = useState({
    sheetNumber: '',
    sheetName: sheetName
  });
  const [users, setUsers] = useState<User[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sharedUsers, setSharedUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchFields();
    fetchSheetInfo();
    fetchUsers();
    fetchSharedUsers();
  }, [sheetId]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showUserDropdown && !target.closest('.share-users-dropdown')) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

  const fetchFields = async () => {
    try {
      const response = await fetch(`/api/admin/fields?sheet_id=${sheetId}`);
      if (response.ok) {
        const data = await response.json();
        setFields(data.fields || []);
      }
    } catch {
      // Error fetching fields
    } finally {
      setLoading(false);
    }
  };

  const fetchSheetInfo = async () => {
    try {
      const response = await fetch(`/api/admin/sheets/${sheetId}`);
      if (response.ok) {
        const data = await response.json();
        setSheetInfo({
          sheetNumber: data.sheet.sheet_number?.toString() || '',
          sheetName: data.sheet.sheet_name || ''
        });
      }
    } catch {
      // Error fetching sheet info
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch {
      // Error fetching users
    }
  };

  const fetchSharedUsers = async () => {
    try {
      const response = await fetch(`/api/admin/sharesheets?sheet_id=${sheetId}`);

      if (response.ok) {
        const data = await response.json();

        // Check if sharedUsers exists and is an array
        if (!data.sharedUsers || !Array.isArray(data.sharedUsers)) {
          setSharedUsers([]);
          return;
        }

        // Fetch user details for shared users
        const sharedUserIds = data.sharedUsers.map((su: any) => su.user_id);

        if (sharedUserIds.length === 0) {
          setSharedUsers([]);
          return;
        }

        const usersResponse = await fetch('/api/admin/users');

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();

          if (!usersData.users || !Array.isArray(usersData.users)) {
            setSharedUsers([]);
            return;
          }

          const filteredSharedUsers = usersData.users.filter((user: User) =>
            sharedUserIds.includes(user.id)
          );
          setSharedUsers(filteredSharedUsers);
        } else {
          setSharedUsers([]);
        }
      } else {
        setSharedUsers([]);
      }
    } catch {
      setSharedUsers([]);
    }
  };

  const handleShareUser = async (userId: number) => {
    try {
      const response = await fetch('/api/admin/sharesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet_id: sheetId,
          user_id: userId
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        showToast('success', 'Success', 'Sheet shared successfully with user');
        setShowUserDropdown(false);
        setSearchTerm('');
        fetchSharedUsers(); // Refresh shared users list
      } else {
        showToast('error', 'Error', data.message || 'Failed to share sheet');
      }
    } catch {
      showToast('error', 'Error', 'Error sharing sheet');
    }
  };

  const handleUnshareUser = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/sharesheets?sheet_id=${sheetId}&user_id=${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showToast('success', 'Success', 'User removed successfully');
        fetchSharedUsers(); // Refresh shared users list
      } else {
        const data = await response.json();
        showToast('error', 'Error', data.message || 'Failed to remove user');
      }
    } catch {
      showToast('error', 'Error', 'Error removing user');
    }
  };

  const handleUpdateSheet = async () => {
    try {
      const response = await fetch(`/api/admin/sheets/${sheetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet_number: sheetInfo.sheetNumber ? parseInt(sheetInfo.sheetNumber) : null,
          sheet_name: sheetInfo.sheetName
        })
      });

      if (response.ok) {
        showToast('success', 'Success', 'Sheet information updated successfully');
        fetchSheetInfo();
        // Notify parent component to refresh the sheets list
        if (onSheetUpdated) {
          onSheetUpdated();
        }
      } else {
        const data = await response.json();
        showToast('error', 'Error', data.error || 'Failed to update sheet');
      }
    } catch {
      showToast('error', 'Error', 'Error updating sheet');
    }
  };

  const handleAddField = async () => {
    if (!newField.fieldName.trim()) return;

    try {
      const response = await fetch('/api/admin/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet_id: sheetId,
          cell_title: newField.fieldName,
          cell_content: '150', // Default column width
          sheet_type: getDataTypeValue(newField.dataType),
          data_format: newField.dataFormat
        })
      });

      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        showToast('error', 'Error', 'Server returned invalid response');
        return;
      }

      if (response.ok) {
        setNewField({ fieldName: '', dataType: 'dynamic', dataFormat: 'text' });
        fetchFields();
      } else {
        showToast('error', 'Error', data.error || data.details || 'Failed to add field');
      }
    } catch {
      showToast('error', 'Error', 'Error adding field');
    }
  };

  const handleDeleteField = async (fieldId: number) => {
    try {
      const response = await fetch(`/api/admin/fields/${fieldId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchFields();
      }
    } catch {
      // Error deleting field
    }
  };

  const handleEditField = (field: Field) => {
    setEditingFieldId(field.id);
    setEditingField({
      fieldName: field.cell_title || '',
      dataType: getDataTypeString(field.sheet_type),
      dataFormat: field.data_format || 'text'
    });
  };

  const handleCancelEdit = () => {
    setEditingFieldId(null);
    setEditingField({
      fieldName: '',
      dataType: 'dynamic',
      dataFormat: 'text'
    });
  };

  const handleUpdateField = async (fieldId: number) => {
    if (!editingField.fieldName.trim()) return;

    try {
      const response = await fetch(`/api/admin/fields/${fieldId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cell_title: editingField.fieldName,
          sheet_type: getDataTypeValue(editingField.dataType),
          data_format: editingField.dataFormat
          // Don't update cell_content here, it stores column width
        })
      });

      if (response.ok) {
        setEditingFieldId(null);
        setEditingField({
          fieldName: '',
          dataType: 'dynamic',
          dataFormat: 'text'
        });
        fetchFields();
      } else {
        const data = await response.json();
        showToast('error', 'Error', data.error || 'Failed to update field');
      }
    } catch {
      showToast('error', 'Error', 'Error updating field');
    }
  };

  const getDataTypeValue = (type: string): number => {
    const types: { [key: string]: number } = {
      static: 1,
      dynamic: 2,     
    };
    return types[type] || 1;
  };

  const getDataTypeString = (value: number): string => {
    const types: { [key: number]: string } = {
      1: 'static',
      2: 'dynamic',     
    };
    return types[value] || 'static';
  };

  const getDataTypeLabel = (value: number): string => {
    const labels: { [key: number]: string } = {
      1: 'Static',
      2: 'Dynamic',     
    };
    return labels[value] || 'Static';
  };

  const getDataFormatLabel = (value: string): string => {
    const labels: { [key: string]: string } = {
      'text': 'Text',
      'datetime': 'Date & Time (Now)',
      'number': 'Number',
      'time': 'Time',
      'date': 'Date Picker',
      'checkbox': 'Checkbox'
    };
    return labels[value] || 'Text';
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Panel Header */}
      <div className="flex items-center justify-end border-gray-200  flex-shrink-0">
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Close settings"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Panel Content - Single unified scroll */}
      <div className="flex-1 overflow-y-auto mt-2 ">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 ">
          {/* Left Panel */}
          <div className="flex flex-col">
            <h2 className='text-lg font-semibold mb-2'>Fields</h2>
            <div className="border-1 border-[#d4a600] rounded-lg overflow-hidden bg-white">
              {/* Table with fixed header and all rows visible - with horizontal scroll */}
              <div className="overflow-x-auto">
                <div className="flex flex-col min-w-[800px]">
                {/* Fixed Header */}
                <div className="flex-shrink-0">
                  <table className="w-full border-collapse table-fixed">
                    <colgroup>
                      <col className="w-1/4" />
                      <col className="w-1/4" />
                      <col className="w-1/4" />
                      <col className="w-1/4" />
                    </colgroup>
                    <thead>
                      <tr className="bg-[#ffe380]">
                        <th className="px-2 md:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-1 border-[#d4a600]">
                          Field Name
                        </th>
                        <th className="px-2 md:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-1 border-[#d4a600]">
                          Data Type
                        </th>
                        <th className="px-2 md:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-1 border-[#d4a600]">
                          Data Format
                        </th>
                        <th className="px-2 md:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b-1 border-[#d4a600]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                  </table>
                </div>

                {/* Fixed Input Row */}
                <div className="flex-shrink-0 border-b border-gray-200">
                  <table className="w-full border-collapse table-fixed">
                    <colgroup>
                      <col className="w-1/4" />
                      <col className="w-1/4" />
                      <col className="w-1/4" />
                      <col className="w-1/4" />
                    </colgroup>
                    <tbody className="bg-white">
                      <tr className="bg-[#fff9ff]">
                        <td className="px-2 md:px-4 py-3">
                          <input
                            type="text"
                            value={newField.fieldName}
                            onChange={(e) => setNewField({ ...newField, fieldName: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-gray-500"
                            placeholder="Enter field name"
                          />
                        </td>
                        <td className="px-2 md:px-4 py-3">
                          <select
                            value={newField.dataType}
                            onChange={(e) => setNewField({ ...newField, dataType: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-gray-500"
                          >
                            <option value="static">Static</option>
                            <option value="dynamic">Dynamic</option>
                          </select>
                        </td>
                        <td className="px-2 md:px-4 py-3">
                          <select
                            value={newField.dataFormat}
                            onChange={(e) => setNewField({ ...newField, dataFormat: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-gray-500"
                          >
                            <option value="text">Text</option>
                            <option value="datetime">Date & Time (Now)</option>
                            <option value="number">Number</option>
                            <option value="time">Time</option>
                            <option value="date">Date Picker</option>
                            <option value="checkbox">Checkbox</option>
                          </select>
                        </td>
                        <td className="px-2 md:px-4 py-3">
                          <button
                            onClick={handleAddField}
                            disabled={!newField.fieldName.trim()}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors w-full md:w-auto"
                          >
                            Add
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Scrollable Data Rows */}
                <div className="flex-shrink-0 max-h-[calc(100vh-425px)] overflow-y-auto">
                  <table className="w-full border-collapse table-fixed">
                    <colgroup>
                      <col className="w-1/4" />
                      <col className="w-1/4" />
                      <col className="w-1/4" />
                      <col className="w-1/4" />
                    </colgroup>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {/* Display Existing Fields */}
                      {loading ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                            Loading fields...
                          </td>
                        </tr>
                      ) : fields.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                            No fields added yet. Use the form above to add fields.
                          </td>
                        </tr>
                      ) : (
                        fields.map((field) => (
                          <tr key={field.id} className="hover:bg-[#fffbf0] transition-colors">
                            {editingFieldId === field.id ? (
                              // Editing mode
                              <>
                                <td className="px-2 md:px-4 py-3">
                                  <input
                                    type="text"
                                    value={editingField.fieldName}
                                    onChange={(e) => setEditingField({ ...editingField, fieldName: e.target.value })}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-gray-500"
                                  />
                                </td>
                                <td className="px-2 md:px-4 py-3">
                                  <select
                                    value={editingField.dataType}
                                    onChange={(e) => setEditingField({ ...editingField, dataType: e.target.value })}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-gray-500"
                                  >
                                    <option value="static">Static</option>
                                    <option value="dynamic">Dynamic</option>
                                  </select>
                                </td>
                                <td className="px-2 md:px-4 py-3">
                                  <select
                                    value={editingField.dataFormat}
                                    onChange={(e) => setEditingField({ ...editingField, dataFormat: e.target.value })}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-gray-500"
                                  >
                                    <option value="text">Text</option>
                                    <option value="datetime">Date & Time (Now)</option>
                                    <option value="number">Number</option>
                                    <option value="time">Time</option>
                                    <option value="date">Date Picker</option>
                                    <option value="checkbox">Checkbox</option>
                                  </select>
                                </td>
                                <td className="px-2 md:px-4 py-3">
                                  <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                                    <button
                                      onClick={() => handleUpdateField(field.id)}
                                      className="px-2 md:px-3 py-1 text-xs md:text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="px-2 md:px-3 py-1 text-xs md:text-sm bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              // View mode
                              <>
                                <td className="px-2 md:px-4 py-3 text-sm text-gray-900">{field.cell_title}</td>
                                <td className="px-2 md:px-4 py-3 text-sm text-gray-600">{getDataTypeLabel(field.sheet_type)}</td>
                                <td className="px-2 md:px-4 py-3 text-sm text-gray-600">{getDataFormatLabel(field.data_format)}</td>
                                <td className="px-2 md:px-4 py-3 text-sm">
                                  <div className="flex items-center gap-1 md:gap-2">
                                    <button 
                                      onClick={() => handleEditField(field)}
                                      className="text-gray-400 hover:text-blue-600 transition-colors"
                                      aria-label="Edit"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteField(field.id)}
                                      className="text-gray-400 hover:text-red-600 transition-colors"
                                      aria-label="Delete"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="flex flex-col">
            <h2 className='text-lg font-semibold mb-2'>Setting</h2>
            <div className="space-y-2">
              {/* Sheet Number and Name - Single row with Update button */}
              <div className="p-3 md:p-4">
                <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <label htmlFor="sheetNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      Sheet Number
                    </label>
                    <input
                      type="text"
                      id="sheetNumber"
                      value={sheetInfo.sheetNumber}
                      onChange={(e) => setSheetInfo({ ...sheetInfo, sheetNumber: e.target.value })}
                      className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
                      placeholder="Enter sheet number"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label htmlFor="sheetName" className="block text-sm font-medium text-gray-700 mb-1">
                      Sheet Name
                    </label>
                    <input
                      type="text"
                      id="sheetName"
                      value={sheetInfo.sheetName}
                      onChange={(e) => setSheetInfo({ ...sheetInfo, sheetName: e.target.value })}
                      className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
                      placeholder="Enter sheet name"
                    />
                  </div>
                  <button
                    onClick={handleUpdateSheet}
                    className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Update
                  </button>
                </div>
              </div>

              {/* Share Users Button */}
              <div className="p-3 md:p-4">
                <div className="relative share-users-dropdown">
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="w-full px-6 py-2 border border-gray-300 bg-white text-gray-600 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors flex items-center justify-between"
                  >
                    <span>Share Users</span>
                    <svg 
                      className={`w-4 h-4 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showUserDropdown && (
                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-md shadow-lg">
                      {/* Search Input */}
                      <div className="p-2 border-b border-gray-200">
                        <div className="relative">
                          <svg 
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            placeholder="Search categories..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Clear Selection */}
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setShowUserDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 border-b border-gray-200 flex items-center justify-between"
                      >
                        <span>Clear Selection</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>

                      {/* User List */}
                      <div className="max-h-60 overflow-y-auto">
                        {users
                          .filter(user => 
                            user.username.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((user) => (
                            <button
                              key={user.id}
                              onClick={() => handleShareUser(user.id)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              {user.username}
                            </button>
                          ))
                        }
                        {users.filter(user => 
                          user.username.toLowerCase().includes(searchTerm.toLowerCase())
                        ).length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            No users found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Shared Users List */}
              <div className="p-3 md:p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Shared With</h3>
                <div className="border border-gray-300 rounded-md bg-white max-h-[calc(100vh-550px)] overflow-y-auto">
                  {sharedUsers.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                      No users shared yet
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {sharedUsers.map((user) => (
                        <div
                          key={user.id}
                          className="px-4 py-2 flex items-center justify-between hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center">
                              <img 
                                  src='/svg/user-default.svg'
                                  alt='user-icon'
                                  className="w-9 h-9 opacity-70"
                              />
                            </div>
                            <span className="text-sm text-gray-700">{user.username}</span>
                          </div>
                          <button
                            onClick={() => handleUnshareUser(user.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                            aria-label="Remove user"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

