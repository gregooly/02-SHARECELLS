'use client';

import { useState, useEffect, useRef } from 'react';
import Modal from './Modal';

interface AddSheetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (sheetNumber: string, sheetName: string) => void;
}

export default function AddSheetDialog({
  isOpen,
  onClose,
  onConfirm
}: AddSheetDialogProps) {
  const [sheetNumber, setSheetNumber] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [errors, setErrors] = useState<{ sheetNumber?: string; sheetName?: string }>({});
  const sheetNumberRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSheetNumber('');
      setSheetName('');
      setErrors({});
      // Focus first input when modal opens
      setTimeout(() => {
        sheetNumberRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const validateInputs = () => {
    const newErrors: { sheetNumber?: string; sheetName?: string } = {};
    
    if (!sheetNumber.trim()) {
      newErrors.sheetNumber = 'Sheet number is required';
    }
    
    if (!sheetName.trim()) {
      newErrors.sheetName = 'Sheet name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (validateInputs()) {
      onConfirm(sheetNumber.trim(), sheetName.trim());
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Sheet"
      onConfirm={handleConfirm}
      confirmText="Add Sheet"
      cancelText="Cancel"
      confirmButtonClass="bg-blue-600 hover:bg-blue-700 text-white"
    >
      <div className="space-y-4">
        {/* Sheet Number Input */}
        <div>
          <label htmlFor="sheetNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Sheet Number
          </label>
          <input
            ref={sheetNumberRef}
            id="sheetNumber"
            type="text"
            value={sheetNumber}
            onChange={(e) => {
              setSheetNumber(e.target.value);
              if (errors.sheetNumber) {
                setErrors({ ...errors, sheetNumber: undefined });
              }
            }}
            onKeyPress={handleKeyPress}
            placeholder="Enter sheet number"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:border-gray-400 ${
              errors.sheetNumber ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.sheetNumber && (
            <p className="mt-1 text-sm text-red-600">{errors.sheetNumber}</p>
          )}
        </div>

        {/* Sheet Name Input */}
        <div>
          <label htmlFor="sheetName" className="block text-sm font-medium text-gray-700 mb-1">
            Sheet Name
          </label>
          <input
            id="sheetName"
            type="text"
            value={sheetName}
            onChange={(e) => {
              setSheetName(e.target.value);
              if (errors.sheetName) {
                setErrors({ ...errors, sheetName: undefined });
              }
            }}
            onKeyPress={handleKeyPress}
            placeholder="Enter sheet name"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:border-gray-400 ${
              errors.sheetName ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.sheetName && (
            <p className="mt-1 text-sm text-red-600">{errors.sheetName}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
