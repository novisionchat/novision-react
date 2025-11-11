// src/context/ToastContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, options = {}) => {
    const id = uuidv4();
    const newToast = {
      id,
      message,
      isError: options.isError || false,
      persistent: options.persistent || false,
      actions: options.actions || [],
    };
    setToasts(prev => [...prev, newToast]);
    
    if (!newToast.persistent) {
      setTimeout(() => hideToast(id), 5000);
    }
  }, []);

  const hideToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // GÜNCELLENDİ: 'toasts' dizisi value objesine eklendi.
  const value = { toasts, showToast, hideToast };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};