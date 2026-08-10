'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

export default function APIKeyPage() {
  const { showToast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sheets, setSheets] = useState<Array<{ id: number; sheet_name: string }>>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string>('all');
  const [showSheetDropdown, setShowSheetDropdown] = useState(false);
  const [sheetSearchTerm, setSheetSearchTerm] = useState('');
  
  // Get domain from window.location.origin after component mounts
  useEffect(() => {
    setDomain(window.location.origin);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showSheetDropdown && !target.closest('.sheet-dropdown')) {
        setShowSheetDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSheetDropdown]);
  
  const apiUrl = customerId && apiKey && domain
    ? selectedSheetId === 'all'
      ? `${domain}/api/sharecells?customer_id=${customerId}&apikey=${apiKey}`
      : `${domain}/api/sharecells?customer_id=${customerId}&apikey=${apiKey}&sheet_id=${selectedSheetId}`
    : domain 
      ? selectedSheetId === 'all'
        ? `${domain}/api/sharecells?customer_id=<ID>&apikey=<KEY>`
        : `${domain}/api/sharecells?customer_id=<ID>&apikey=<KEY>&sheet_id=<SHEET_ID>`
      : 'Loading...';

  // Fetch API key and customer ID on component mount
  useEffect(() => {
    fetchApiKey();
    fetchSheets();
  }, []);

  const fetchSheets = async () => {
    try {
      const response = await fetch('/api/admin/sheets');
      const data = await response.json();
      
      if (response.ok) {
        setSheets(data.sheets || []);
      }
    } catch {
      // Error fetching sheets
    }
  };

  const fetchApiKey = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/apikey');
      const data = await response.json();
      
      if (response.ok) {
        setApiKey(data.apiKey || '');
        setCustomerId(data.customerId?.toString() || '');
      } else {
        showToast('error', 'Error', data.error || 'Failed to fetch API key');
      }
    } catch {
      showToast('error', 'Error', 'Failed to fetch API key');
    } finally {
      setLoading(false);
    }
  };

  const generateKey = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/admin/apikey', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setApiKey(data.apiKey);
        showToast('success', 'Success', 'New API Key generated successfully');
      } else {
        showToast('error', 'Error', data.error || 'Failed to generate API key');
      }
    } catch {
      showToast('error', 'Error', 'Failed to generate API key');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast('success', 'Copied', `${label} copied to clipboard`);
  };

  const handleDownloadCSV = async () => {
    if (!customerId || !apiKey) {
      showToast('error', 'Error', 'Please generate an API key first');
      return;
    }

    try {
      // Fetch data from the API with optional sheet_id parameter
      const apiEndpoint = selectedSheetId === 'all'
        ? `/api/sharecells?customer_id=${customerId}&apikey=${apiKey}`
        : `/api/sharecells?customer_id=${customerId}&apikey=${apiKey}&sheet_id=${selectedSheetId}`;
      
      const response = await fetch(apiEndpoint);
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const jsonData = await response.json();
      
      if (!jsonData.data || jsonData.data.length === 0) {
        showToast('error', 'Error', 'No data available to export');
        return;
      }

      // Convert JSON data to CSV with new format: sheet_id, sheet_name, time, user, field1, field2, ...
      const allRows: string[] = [];
      
      // Collect all unique field names across all sheets
      const allFieldNames = new Set<string>();
      jsonData.data.forEach((sheetData: any) => {
        const sheetRows = sheetData.rows;
        if (sheetRows && sheetRows.length > 0) {
          Object.keys(sheetRows[0]).forEach(key => {
            // Exclude Username and Updated_At from field columns
            if (key !== 'Username' && key !== 'Updated_At') {
              allFieldNames.add(key);
            }
          });
        }
      });
      
      const fieldColumns = Array.from(allFieldNames);
      
      // Create header row: sheet_id, sheet_name, time, user, field1, field2, ...
      const headers = ['sheet_id', 'sheet_name', 'time', 'user', ...fieldColumns];
      allRows.push(headers.join(','));
      
      // Process each sheet and add data rows
      jsonData.data.forEach((sheetData: any) => {
        const sheetRows = sheetData.rows;
        const sheetName = sheetData.sheet_name;
        const sheetId = sheetData.sheet_id || '';
        
        if (!sheetRows || sheetRows.length === 0) return;
        
        sheetRows.forEach((row: any) => {
          const rowData: string[] = [];
          
          // Add sheet_id
          rowData.push(sheetId.toString());
          
          // Add sheet_name (escape if needed)
          const escapedSheetName = sheetName.includes(',') || sheetName.includes('"') || sheetName.includes('\n')
            ? `"${sheetName.replace(/"/g, '""')}"`
            : sheetName;
          rowData.push(escapedSheetName);
          
          // Add time (Updated_At)
          const time = row.Updated_At || '';
          const escapedTime = time.includes(',') || time.includes('"') || time.includes('\n')
            ? `"${time.replace(/"/g, '""')}"`
            : time;
          rowData.push(escapedTime);
          
          // Add user (Username)
          const user = row.Username || '';
          const escapedUser = user.includes(',') || user.includes('"') || user.includes('\n')
            ? `"${user.replace(/"/g, '""')}"`
            : user;
          rowData.push(escapedUser);
          
          // Add field values in the order of fieldColumns
          fieldColumns.forEach(fieldName => {
            const value = row[fieldName] || '';
            const escapedValue = value.toString().includes(',') || value.toString().includes('"') || value.toString().includes('\n')
              ? `"${value.toString().replace(/"/g, '""')}"`
              : value;
            rowData.push(escapedValue);
          });
          
          allRows.push(rowData.join(','));
        });
      });

      const csvContent = allRows.join('\n');

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `sharecells_data_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast('success', 'Success', 'CSV file downloaded successfully');
    } catch {
      showToast('error', 'Error', 'Failed to download CSV file');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">API Key</h1>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Card - Generate API Key */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Generate API Key</h2>
            <p className="text-sm text-gray-600 mb-4 sm:mb-6">Create a new API key for accessing the inventory system.</p>

            {/* Customer ID */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer ID
              </label>
            <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={customerId}
                  readOnly
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm"
                />
              </div>
            </div>

            {/* Generated API Key */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Generated API Key
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={apiKey}
                  readOnly
                  placeholder={apiKey ? '' : 'No API key generated yet'}
                  className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm min-w-0"
                />
                <button
                  onClick={() => copyToClipboard(apiKey, 'API Key')}
                  disabled={!apiKey}
                  className="px-2 sm:px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">Copy</span>
                </button>
              </div>
            </div>

            {/* Sheet Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Sheet
              </label>
              <div className="relative sheet-dropdown">
                <button
                  onClick={() => setShowSheetDropdown(!showSheetDropdown)}
                  className="w-full px-4 py-2.5 border border-gray-300 bg-white text-gray-600 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <span>
                    {selectedSheetId === 'all' 
                      ? 'All Sheets' 
                      : sheets.find(s => s.id.toString() === selectedSheetId)?.sheet_name || 'Select Sheet'}
                  </span>
                  <svg 
                    className={`w-4 h-4 transition-transform ${showSheetDropdown ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showSheetDropdown && (
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
                          placeholder="Search sheets..."
                          value={sheetSearchTerm}
                          onChange={(e) => setSheetSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Clear Selection */}
                    <button
                      onClick={() => {
                        setSelectedSheetId('all');
                        setSheetSearchTerm('');
                        setShowSheetDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 border-b border-gray-200 flex items-center justify-between"
                    >
                      <span>Clear Selection</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>

                    {/* Sheet List */}
                    <div className="max-h-60 overflow-y-auto">
                      {/* All Sheets Option */}
                      <button
                        onClick={() => {
                          setSelectedSheetId('all');
                          setSheetSearchTerm('');
                          setShowSheetDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                          selectedSheetId === 'all' 
                            ? 'bg-blue-50 text-blue-700 font-medium' 
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        All Sheets
                      </button>
                      
                      {/* Individual Sheets */}
                      {sheets
                        .filter(sheet => 
                          sheet.sheet_name.toLowerCase().includes(sheetSearchTerm.toLowerCase())
                        )
                        .map((sheet) => (
                          <button
                            key={sheet.id}
                            onClick={() => {
                              setSelectedSheetId(sheet.id.toString());
                              setSheetSearchTerm('');
                              setShowSheetDropdown(false);
                            }}
                            className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                              selectedSheetId === sheet.id.toString() 
                                ? 'bg-blue-50 text-blue-700 font-medium' 
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {sheet.sheet_name}
                          </button>
                        ))
                      }
                      {sheets.filter(sheet => 
                        sheet.sheet_name.toLowerCase().includes(sheetSearchTerm.toLowerCase())
                      ).length === 0 && sheetSearchTerm && (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No sheets found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {selectedSheetId === 'all' 
                  ? 'API will return data from all sheets' 
                  : `API will return data only from the selected sheet`}
              </p>
            </div>

          {/* Complete API URL */}
          <div className="mb-4 sm:mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Complete API URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={apiUrl}
                readOnly
                className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm min-w-0"
              />
              <button
                onClick={() => copyToClipboard(apiUrl, 'API URL')}
                className="px-2 sm:px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">Copy</span>
              </button>
            </div>
          </div>

          {/* Generate Key Button */}
          <button
            onClick={generateKey}
            disabled={generating}
            className="w-full px-4 sm:px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            {generating ? 'Generating...' : 'Generate Key'}
          </button>
        </div>

        {/* Right Card - Export to External File */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Export to external file</h2>
          <p className="text-sm text-gray-600 mb-4 sm:mb-6">Download inventory data in various formats for external use.</p>

          {/* Export to CSV Section */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 sm:p-4 mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Export to CSV file</h3>
            <p className="text-sm text-gray-700 mb-3 sm:mb-4">
              CSV files are plaintext data files separated by commas, so they can be opened directly as Excel sheets and are a very useful file format for exporting and importing data from other programs.
            </p>
            <button
              onClick={handleDownloadCSV}
              className="w-full px-4 sm:px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download CSV
            </button>
          </div>

          {/* CSV Structure Info */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">CSV Structure & API Usage</h4>
            <p className="text-xs text-gray-700 mb-2">
              The CSV file will contain data with the following format:
            </p>
            <div className="bg-yellow-100 rounded p-2 overflow-x-auto mb-3">
              <code className="text-xs text-gray-800 whitespace-nowrap block">
                sheet_id,sheet_name,time,user,field1,field2,...<br/>
                1,Sheet Name,2025-01-15 10:30:00,username,value1,value2,...
              </code>
            </div>
            <div className="border-t border-yellow-300 pt-2 mt-2">
              <p className="text-xs font-semibold text-gray-900 mb-1">API Parameters:</p>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>• <code className="bg-yellow-200 px-1 rounded">customer_id</code> - Your customer ID (required)</li>
                <li>• <code className="bg-yellow-200 px-1 rounded">apikey</code> - Your API key (required)</li>
                <li>• <code className="bg-yellow-200 px-1 rounded">sheet_id</code> - Specific sheet ID (optional)</li>
              </ul>
              <p className="text-xs text-gray-600 mt-2 italic">
                Omit sheet_id to retrieve all sheets, or include it to get a specific sheet.
              </p>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
