'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import Spinner from '@/components/ui/Spinner';

interface Field {
  id: number;
  cell_title: string;
  cell_content: string;
  sheet_type: number;
  data_format: string;
}

interface CellData {
  id: number;
  value: string;
}

interface Row {
  uuid: string;
  user_id?: number | null;
  username?: string;
  created_at?: string;
  cells: { [fieldId: number]: CellData };
}

interface SheetViewerProps {
  sheetId: number;
  sheetName: string;
  onClose: () => void;
}

export default function SheetViewer({ sheetId, sheetName, onClose }: SheetViewerProps) {
  const [fields, setFields] = useState<Field[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ rowUuid: string; rowUserId: number | null | undefined; fieldId: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [columnWidths, setColumnWidths] = useState<{ [key: number]: number }>({});
  const [resizingColumn, setResizingColumn] = useState<{ fieldId: number; startX: number; startWidth: number } | null>(null);
  const { showToast } = useToast();

  const fetchSheetData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/sheet-data/${sheetId}`);
      
      if (response.ok) {
        const data = await response.json();
        setFields(data.fields);
        setRows(data.rows);
        
        // Load column widths from cell_content field
        const widths: { [key: number]: number } = {};
        data.fields.forEach((field: Field) => {
          const width = parseInt(field.cell_content);
          if (!isNaN(width) && width > 0) {
            widths[field.id] = width;
          }
        });
        setColumnWidths(widths);
      } else {
        const errorData = await response.json();
        showToast('error', 'Error', errorData.error || 'Failed to load sheet data');
        // Close the viewer immediately if sheet structure is not designed
        if (response.status === 400) {
          onClose();
        }
      }
    } catch {
      showToast('error', 'Error', 'Error loading sheet data');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [sheetId]); // Removed showToast and onClose - they are stable functions

  useEffect(() => {
    fetchSheetData();
  }, [fetchSheetData]);

  const handleCellClick = (rowUuid: string, fieldId: number, currentValue: string, rowIndex: number, row: Row) => {
    // Check if this is a static field and not the first row FOR THIS USER
    const field = fields.find(f => f.id === fieldId);
    if (field && field.sheet_type === 1) {
      // For static fields, only allow editing in the first occurrence for each user
      // Find the first row for this user (or admin if user_id is null)
      const userRows = rows.filter(r => r.user_id === row.user_id);
      const firstRowIndex = rows.indexOf(userRows[0]);
      
      if (rowIndex !== firstRowIndex) {
        // Don't allow editing static fields beyond the first row for this user
        return;
      }
    }
    
    setEditingCell({ rowUuid, rowUserId: row.user_id, fieldId });
    setEditValue(currentValue);
  };

  const handleCellBlur = async () => {
    if (!editingCell) return;

    await saveCellValue();
    setEditingCell(null);
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      await handleTabNavigation(e.shiftKey);
    }
  };

  const handleTabNavigation = async (shiftKey: boolean) => {
    if (!editingCell) return;

    // Save current cell first
    await saveCellValue();

    const { rowUuid, fieldId } = editingCell;
    const currentFieldIndex = fields.findIndex(f => f.id === fieldId);
    const currentRowIndex = rows.findIndex(r => r.uuid === rowUuid);

    let nextFieldIndex = currentFieldIndex;
    let nextRowIndex = currentRowIndex;
    let attempts = 0;
    const maxAttempts = fields.length * rows.length + 10; // Prevent infinite loop

    const findNextEditableCell = () => {
      if (shiftKey) {
        // Move backwards (Shift+Tab)
        nextFieldIndex--;
        if (nextFieldIndex < 0) {
          nextRowIndex--;
          if (nextRowIndex >= 0) {
            nextFieldIndex = fields.length - 1;
          } else {
            // At the beginning, stay on current cell
            nextRowIndex = 0;
            nextFieldIndex = 0;
            return false; // Stop searching
          }
        }
      } else {
        // Move forwards (Tab)
        nextFieldIndex++;
        if (nextFieldIndex >= fields.length) {
          nextRowIndex++;
          nextFieldIndex = 0;
          // If we're at the last row, add a new row
          if (nextRowIndex >= rows.length) {
            handleAddRow();
            nextRowIndex = rows.length; // Will be the new row
            return true; // Cell will be editable in new row
          }
        }
      }

      // Check if the next cell is editable
      if (nextRowIndex >= 0 && nextRowIndex < rows.length && nextFieldIndex >= 0 && nextFieldIndex < fields.length) {
        const nextField = fields[nextFieldIndex];
        const nextRow = rows[nextRowIndex];
        
        // Skip static fields if not in first row FOR THIS USER
        if (nextField.sheet_type === 1) {
          const userRows = rows.filter(r => r.user_id === nextRow.user_id);
          const firstRowIndex = rows.indexOf(userRows[0]);
          
          if (nextRowIndex !== firstRowIndex) {
            attempts++;
            if (attempts < maxAttempts) {
              return findNextEditableCell(); // Recursively find next editable cell
            }
            return false; // Give up after too many attempts
          }
        }
        return true; // Found editable cell
      }
      return false;
    };

    // Find the next editable cell
    if (findNextEditableCell()) {
      if (nextRowIndex >= 0 && nextRowIndex < rows.length && nextFieldIndex >= 0 && nextFieldIndex < fields.length) {
        const nextRow = rows[nextRowIndex];
        const nextField = fields[nextFieldIndex];
        const nextCellValue = nextRow.cells[nextField.id]?.value || '';
        
        setEditingCell({ rowUuid: nextRow.uuid, rowUserId: nextRow.user_id, fieldId: nextField.id });
        setEditValue(nextCellValue);
      }
    }
  };

  const saveCellValue = async () => {
    if (!editingCell) return;

    const { rowUuid, rowUserId, fieldId } = editingCell;
    
    // Get the original value to compare
    const originalRow = rows.find(r => r.uuid === rowUuid && r.user_id === rowUserId);
    const originalValue = originalRow?.cells[fieldId]?.value || '';
    
    // Update local state first (for immediate UI feedback)
    setRows(prevRows => prevRows.map(row => {
      if (row.uuid === rowUuid && row.user_id === rowUserId) {
        return {
          ...row,
          cells: {
            ...row.cells,
            [fieldId]: {
              id: row.cells[fieldId]?.id || 0,
              value: editValue
            }
          }
        };
      }
      return row;
    }));
    
    // Only save to database if the value has actually changed
    if (editValue === originalValue) {
      return; // No change, skip database save
    }
    
    // Don't save empty values for new cells (prevents creating ghost rows)
    // Only save if: 1) the value is not empty, OR 2) we're clearing an existing value
    if (editValue.trim() === '' && originalValue === '') {
      return; // Don't create empty cells in database
    }
    
    try {
      const response = await fetch('/api/admin/cell-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet_id: sheetId,
          field_id: fieldId,
          uuid: rowUuid,
          value: editValue
        })
      });

      if (!response.ok) {
        showToast('error', 'Error', 'Failed to update cell');
      }
    } catch {
      showToast('error', 'Error', 'Error updating cell');
    }
  };

  const handleAddRow = () => {
    // Generate a proper UUID v4 for the new row
    const newUuid = crypto.randomUUID();
    const newRow: Row = {
      uuid: newUuid,
      user_id: null, // Admin rows have user_id = null
      cells: {}
    };
    setRows(prev => [...prev, newRow]);
  };

  const handleDeleteRow = async (rowUuid: string, rowUserId: number | null | undefined) => {
    try {
      // Pass user_id to identify which specific row to delete (admin rows have user_id = null)
      const userIdParam = rowUserId === null || rowUserId === undefined ? 'null' : rowUserId.toString();
      const response = await fetch(`/api/admin/cell-data?uuid=${rowUuid}&sheet_id=${sheetId}&user_id=${userIdParam}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setRows(prev => prev.filter(row => !(row.uuid === rowUuid && row.user_id === rowUserId)));
        showToast('success', 'Success', 'Row deleted successfully');
      } else {
        showToast('error', 'Error', 'Failed to delete row');
      }
    } catch {
      showToast('error', 'Error', 'Error deleting row');
    }
  };

  // Calculate total table width based on all columns
  const calculateTableWidth = () => {
    const rowNumberWidth = 60;
    const actionsWidth = 80;
    const userInfoWidth = 120; // User column
    const timestampWidth = 180; // Timestamp column
    const columnsWidth = fields.reduce((total, field) => {
      return total + (columnWidths[field.id] || 150);
    }, 0);
    return rowNumberWidth + columnsWidth + actionsWidth + userInfoWidth + timestampWidth;
  };

  const handleResizeStart = (e: React.MouseEvent, fieldId: number) => {
    e.preventDefault();
    const startWidth = columnWidths[fieldId] || 150;
    setResizingColumn({
      fieldId,
      startX: e.clientX,
      startWidth
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingColumn) {
        const diff = e.clientX - resizingColumn.startX;
        const newWidth = Math.max(80, resizingColumn.startWidth + diff);
        setColumnWidths(prev => ({
          ...prev,
          [resizingColumn.fieldId]: newWidth
        }));
      }
    };

    const handleMouseUp = async () => {
      if (resizingColumn) {
        // Save the new column width to database
        const newWidth = columnWidths[resizingColumn.fieldId];
        if (newWidth) {
          try {
            await fetch(`/api/admin/fields/${resizingColumn.fieldId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                cell_content: String(newWidth)
              })
            });
          } catch {
            // Error saving column width
          }
        }
        setResizingColumn(null);
      }
    };

    if (resizingColumn) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizingColumn, columnWidths]);

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-xl font-semibold">{sheetName}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Spinner size={48} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-2 sm:px-4 py-3 sm:py-4 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 truncate">{sheetName}</h2>
          <button
            onClick={handleAddRow}
            className="px-2 sm:px-4 py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 sm:gap-2 whitespace-nowrap"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Add Row</span>
          </button>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 transition-colors p-1"
          aria-label="Close"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Spreadsheet Content */}
      <div className="flex-1 px-2 sm:px-4 py-2 sm:py-4 flex flex-col min-h-0">
        <div className="flex-1 border border-gray-300 rounded-lg bg-white shadow-sm overflow-auto min-h-0">
          <table className="border-collapse" style={{ tableLayout: 'fixed', width: `${calculateTableWidth()}px` }}>
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-100">
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-600 uppercase border-r border-b border-gray-300" style={{ width: 60 }}>
                    #
                  </th>
                  {fields.map((field) => (
                    <th
                      key={field.id}
                      className="relative px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 uppercase border-r border-b border-gray-300"
                      style={{ width: `${columnWidths[field.id] || 150}px` }}
                    >
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-bold truncate">{field.cell_title}</span>
                      </div>
                      {/* Resize Handle */}
                      <div
                        onMouseDown={(e) => handleResizeStart(e, field.id)}
                        className="absolute top-0 right-0 w-0.5 h-full cursor-col-resize hover:bg-blue-400 hover:opacity-50 active:bg-blue-600 transition-colors"
                        style={{ zIndex: 10 }}
                      />
                    </th>
                  ))}
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-600 uppercase border-r border-b border-gray-300" style={{ width: 80 }}>
                    Actions
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 uppercase border-r border-b border-gray-300" style={{ width: 120 }}>
                    User
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-600 uppercase border-b border-gray-300" style={{ width: 180 }}>
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={fields.length + 4}
                      className="px-2 sm:px-4 py-8 sm:py-12 text-center text-gray-500 text-sm"
                    >
                      No data yet. Click "Add Row" to start adding data.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, rowIndex) => (
                    <tr key={`${row.uuid}-${row.user_id || 'admin'}`} className="hover:bg-gray-50">
                      <td className="text-center text-xs sm:text-sm text-gray-600 border-r border-b border-gray-200 bg-gray-50 p-0" style={{ width: 60 }}>
                        <div className="px-2 sm:px-4 h-full flex items-center justify-center">
                          {rowIndex + 1}
                        </div>
                      </td>
                      {fields.map((field) => {
                        const isStaticField = field.sheet_type === 1;
                        
                        // For static fields, check if this is the first row FOR THIS USER
                        const userRows = rows.filter(r => r.user_id === row.user_id);
                        const firstUserRowIndex = rows.indexOf(userRows[0]);
                        const isFirstRowForUser = rowIndex === firstUserRowIndex;
                        
                        let cellValue = row.cells[field.id]?.value || '';
                        const isReadOnly = isStaticField && !isFirstRowForUser;
                        
                        // Hide value for static fields in non-first rows for this user
                        if (isReadOnly) {
                          cellValue = '';
                        }
                        
                        const isEditing = editingCell?.rowUuid === row.uuid && editingCell?.rowUserId === row.user_id && editingCell?.fieldId === field.id;

                        // Render different input types based on data_format
                        const renderCellInput = () => {
                          const dataFormat = field.data_format || 'text';
                          
                          if (dataFormat === 'checkbox') {
                            // Checkbox: store as "yes"/"no"
                            const isChecked = cellValue.toLowerCase() === 'yes';
                            return (
                              <div className="w-full h-full px-2 py-2 flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={async (e) => {
                                    const newValue = e.target.checked ? 'yes' : 'no';
                                    setEditValue(newValue);
                                    
                                    // Update local state immediately
                                    setRows(prevRows => prevRows.map(r => {
                                      if (r.uuid === row.uuid && r.user_id === row.user_id) {
                                        return {
                                          ...r,
                                          cells: {
                                            ...r.cells,
                                            [field.id]: {
                                              id: r.cells[field.id]?.id || 0,
                                              value: newValue
                                            }
                                          }
                                        };
                                      }
                                      return r;
                                    }));
                                    
                                    // Save to database
                                    try {
                                      await fetch('/api/admin/cell-data', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          sheet_id: sheetId,
                                          field_id: field.id,
                                          uuid: row.uuid,
                                          value: newValue
                                        })
                                      });
                                    } catch {
                                      // Error updating checkbox
                                    }
                                  }}
                                  disabled={isReadOnly}
                                  className="w-4 h-4 cursor-pointer disabled:cursor-default"
                                />
                              </div>
                            );
                          }
                          
                          if (isEditing) {
                            if (dataFormat === 'number') {
                              return (
                                <input
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={handleCellBlur}
                                  onKeyDown={handleKeyDown}
                                  className="w-full h-full px-2 py-2 text-sm border-0 focus:outline-none focus:border-1 focus:border-green-500"
                                  autoFocus
                                />
                              );
                            } else if (dataFormat === 'time') {
                              return (
                                <input
                                  type="time"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={handleCellBlur}
                                  onKeyDown={handleKeyDown}
                                  className="w-full h-full px-2 py-2 text-sm border-0 focus:outline-none focus:border-1 focus:border-green-500"
                                  autoFocus
                                />
                              );
                            } else if (dataFormat === 'date') {
                              return (
                                <input
                                  type="date"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={handleCellBlur}
                                  onKeyDown={handleKeyDown}
                                  className="w-full h-full px-2 py-2 text-sm border-0 focus:outline-none focus:border-1 focus:border-green-500"
                                  autoFocus
                                />
                              );
                            } else if (dataFormat === 'datetime') {
                              return (
                                <input
                                  type="datetime-local"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={handleCellBlur}
                                  onKeyDown={handleKeyDown}
                                  className="w-full h-full px-2 py-2 text-sm border-0 focus:outline-none focus:border-1 focus:border-green-500"
                                  autoFocus
                                />
                              );
                            } else {
                              // Default text input
                              return (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={handleCellBlur}
                                  onKeyDown={handleKeyDown}
                                  className="w-full h-full px-2 py-2 text-sm border-0 focus:outline-none focus:border-1 focus:border-green-500"
                                  autoFocus
                                />
                              );
                            }
                          } else {
                            // Display mode
                            return (
                              <div
                                onClick={() => handleCellClick(row.uuid, field.id, cellValue, rowIndex, row)}
                                className={`w-full text-sm px-2 py-2 ${isReadOnly ? 'text-gray-500 cursor-default' : 'text-gray-900 cursor-pointer hover:bg-blue-50'} overflow-hidden text-ellipsis flex items-center m-0`}
                              >
                                {cellValue || (
                                  <span className="text-gray-400 h-[25px]"></span>
                                )}
                              </div>
                            );
                          }
                        };

                        return (
                          <td
                            key={field.id}
                            className={`border-r border-b border-gray-200 p-0 m-0 ${isReadOnly ? 'bg-gray-50' : ''}`}
                            style={{ width: `${columnWidths[field.id] || 150}px` }}
                          >
                            {renderCellInput()}
                          </td>
                        );
                      })}
                      <td className="text-center border-r border-b border-gray-200 p-0" style={{ width: 80 }}>
                        <div className="px-1 sm:px-2 py-2 h-full flex items-center justify-center">
                          <button
                            onClick={() => handleDeleteRow(row.uuid, row.user_id)}
                            className="text-red-500 hover:text-red-700 transition-colors p-1"
                            aria-label="Delete row"
                          >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 border-r border-b border-gray-200" style={{ width: 120 }}>
                        {row.username || 'Admin'}
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-gray-600 border-b border-gray-200" style={{ width: 180, whiteSpace: 'nowrap' }}>
                        {row.created_at ? new Date(row.created_at).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}

