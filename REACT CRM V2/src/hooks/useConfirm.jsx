import React, { useCallback, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

/**
 * confirm(message, options) returns a Promise<boolean> — replaces window.confirm()
 * with the app's own styled/accessible dialog. Render the returned `dialog` once
 * per page (usually right before the closing tag).
 */
export function useConfirm() {
  const [state, setState] = useState(null);

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      setState({ message, options, resolve });
    });
  }, []);

  const close = (result) => {
    state?.resolve(result);
    setState(null);
  };

  const dialog = (
    <ConfirmDialog
      open={!!state}
      message={state?.message}
      title={state?.options?.title}
      confirmLabel={state?.options?.confirmLabel}
      cancelLabel={state?.options?.cancelLabel}
      danger={state?.options?.danger ?? true}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  );

  return { confirm, dialog };
}
