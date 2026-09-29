import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [modalState, setModalState] = useState({
    isOpen: false,
    options: {},
  });

  const resolverRef = useRef(null);

  const confirm = useCallback((optionsOrMessage) => {
    return new Promise((resolve) => {
      let options = {};
      if (typeof optionsOrMessage === 'string') {
        const isDeleteAction = /delete|remove|deactivate|cancel|reject|close/i.test(optionsOrMessage);
        options = {
          message: optionsOrMessage,
          title: isDeleteAction ? 'Confirm Action' : 'Please Confirm',
          confirmText: isDeleteAction ? 'Confirm' : 'Confirm',
          cancelText: 'Cancel',
          variant: isDeleteAction ? 'danger' : 'primary',
        };
      } else {
        const isDeleteAction = optionsOrMessage?.variant === 'danger' ||
          /delete|remove|deactivate|cancel|reject|close/i.test(optionsOrMessage?.title || optionsOrMessage?.message || '');

        options = {
          title: optionsOrMessage.title || (isDeleteAction ? 'Confirm Deletion' : 'Please Confirm'),
          message: optionsOrMessage.message || '',
          description: optionsOrMessage.description || '',
          confirmText: optionsOrMessage.confirmText || (isDeleteAction ? 'Delete' : 'Confirm'),
          cancelText: optionsOrMessage.cancelText || 'Cancel',
          variant: optionsOrMessage.variant || (isDeleteAction ? 'danger' : 'primary'),
          ...optionsOrMessage,
          isPrompt: false,
          isAlert: false,
        };
      }

      resolverRef.current = (result) => resolve(Boolean(result));

      setModalState({
        isOpen: true,
        options,
      });
    });
  }, []);

  const prompt = useCallback((optionsOrMessage, defaultVal = '') => {
    return new Promise((resolve) => {
      let options = {};
      if (typeof optionsOrMessage === 'string') {
        options = {
          message: optionsOrMessage,
          title: 'Input Required',
          defaultValue: defaultVal,
          confirmText: 'Submit',
          cancelText: 'Cancel',
          variant: 'primary',
        };
      } else {
        options = {
          title: optionsOrMessage.title || 'Input Required',
          message: optionsOrMessage.message || '',
          description: optionsOrMessage.description || '',
          defaultValue: optionsOrMessage.defaultValue || defaultVal || '',
          placeholder: optionsOrMessage.placeholder || '',
          inputLabel: optionsOrMessage.inputLabel || '',
          confirmText: optionsOrMessage.confirmText || 'Submit',
          cancelText: optionsOrMessage.cancelText || 'Cancel',
          variant: optionsOrMessage.variant || 'primary',
          required: optionsOrMessage.required ?? false,
          ...optionsOrMessage,
        };
      }

      options.isPrompt = true;
      options.isAlert = false;

      // On confirm returns string value, on cancel returns null
      resolverRef.current = (result) => {
        if (result === false || result === null) {
          resolve(null);
        } else {
          resolve(typeof result === 'string' ? result : '');
        }
      };

      setModalState({
        isOpen: true,
        options,
      });
    });
  }, []);

  const alert = useCallback((optionsOrMessage) => {
    return new Promise((resolve) => {
      let options = {};
      if (typeof optionsOrMessage === 'string') {
        options = {
          message: optionsOrMessage,
          title: 'Notice',
          confirmText: 'OK',
          variant: 'info',
        };
      } else {
        options = {
          title: optionsOrMessage.title || 'Notice',
          message: optionsOrMessage.message || '',
          description: optionsOrMessage.description || '',
          confirmText: optionsOrMessage.confirmText || 'OK',
          variant: optionsOrMessage.variant || 'info',
          ...optionsOrMessage,
        };
      }

      options.isPrompt = false;
      options.isAlert = true;

      resolverRef.current = () => resolve();

      setModalState({
        isOpen: true,
        options,
      });
    });
  }, []);

  const handleConfirm = useCallback((value) => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(value);
      resolverRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  }, []);

  // Expose callable confirm function with attached prompt & alert helpers for maximum usability
  const confirmApi = useCallback((optionsOrMessage) => {
    return confirm(optionsOrMessage);
  }, [confirm]);

  confirmApi.confirm = confirm;
  confirmApi.prompt = prompt;
  confirmApi.alert = alert;

  return (
    <ConfirmContext.Provider value={confirmApi}>
      {children}
      <ConfirmationModal
        isOpen={modalState.isOpen}
        options={modalState.options}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
