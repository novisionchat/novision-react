// src/components/ToastContainer.jsx
import React from 'react';
import { useToast } from '../context/ToastContext';
import styles from './ToastContainer.module.css';

const ToastContainer = () => {
  const { toasts, hideToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className={styles.toastContainer}>
      {toasts.map(toast => (
        <div key={toast.id} className={`${styles.toast} ${toast.isError ? styles.error : ''}`}>
          <span>{toast.message}</span>
          {toast.actions.length > 0 && (
            <div className={styles.toastActions}>
              {toast.actions.map((action, index) => (
                <button key={index} onClick={() => {
                  action.onClick();
                  hideToast(toast.id);
                }}>
                  {action.text}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;