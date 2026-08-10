import React, { useState, useRef, useEffect } from 'react';
import Tooltip from '@/components/ui/Tooltip';

interface WorkSheetsHeaderProps {
  onAddSheet: () => void;
  onViewModeChange: (viewType: 'card' | 'table') => void;
  currentView: 'card' | 'table';
}

export default function WorkSheetsHeader({ onAddSheet, onViewModeChange, currentView }: WorkSheetsHeaderProps) {
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowViewDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleViewSelect = (viewType: 'card' | 'table') => {
    onViewModeChange(viewType);
    setShowViewDropdown(false);
  };

  return (
    <div className="flex items-center gap-3 mb-6">
      <h2 className="text-2xl font-bold text-gray-900">WorkSheets</h2>
      
      <div className="flex items-center gap-3">
        <Tooltip content="Add Sheet" position="bottom">
          <button
            onClick={onAddSheet}
            aria-label="Add Sheet"
          >
            <img 
              src="/svg/addfile.svg" 
              alt="Add Sheet" 
              className="w-5 h-5"
            />
          </button>
        </Tooltip>
        
        <div className="relative pt-2" ref={dropdownRef}>
          <Tooltip content="View Mode" position="bottom">
            <button
              onClick={() => setShowViewDropdown(!showViewDropdown)}
              aria-label="View Mode"
              className="relative"
            >
              <img 
                src="/svg/dashboard.svg" 
                alt="View Mode" 
                className="w-5 h-5"
              />
            </button>
          </Tooltip>

          {showViewDropdown && (
            <div className="absolute right-0 top-full mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
              <button
                onClick={() => handleViewSelect('card')}
                className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-all ${
                  currentView === 'card' 
                    ? 'bg-gray-50 text-gray-800  ' 
                    : 'text-gray-700 hover:bg-gray-50 '
                }`}
              >
                <img 
                  src="/svg/card-list.svg" 
                  alt="View Mode" 
                  className="w-5 h-5 opacity-80"
                />
                <span>Card</span>
                {currentView === 'card' && (
                  <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => handleViewSelect('table')}
                className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-all border-t border-gray-100 ${
                  currentView === 'table' 
                    ? 'bg-gray-50 text-gray-800  ' 
                    : 'text-gray-700 hover:bg-gray-50 '
                }`}
              >
                <img 
                  src="/svg/table.svg" 
                  alt="View Mode" 
                  className="w-5 h-5 opacity-80"
                />
                <span>Table</span>
                {currentView === 'table' && (
                  <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
