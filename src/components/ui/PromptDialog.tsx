'use client';

import { useState, useEffect, useRef } from 'react';
import Modal from './Modal';

interface PromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  message: string;
  placeholder?: string;
  inputType?: 'text' | 'password';
  confirmText?: string;
  cancelText?: string;
  validator?: (value: string) => string | null; // Returns error message or null if valid
}

export default function PromptDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  placeholder = '',
  inputType = 'text',
  confirmText = 'OK',
  cancelText = 'Cancel',
  validator
}: PromptDialogProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue('');
      setError(null);
      // Focus input when modal opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    // Validate if validator is provided
    if (validator) {
      const errorMessage = validator(value);
      if (errorMessage) {
        setError(errorMessage);
        return;
      }
    }
    
    onConfirm(value);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      onConfirm={handleConfirm}
      confirmText={confirmText}
      cancelText={cancelText}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-700">{message}</p>
        <div>
          <input
            ref={inputRef}
            type={inputType}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500"
          />
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
