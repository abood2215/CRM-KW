import React from 'react';
import ConfirmDialog from '../../../components/ConfirmDialog';

const DeleteAllContactsModal = ({ open, onClose, onConfirm, total, isPending }) => (
  <ConfirmDialog
    open={open}
    title="مسح جميع جهات الاتصال؟"
    message={`سيتم حذف ${total?.toLocaleString() ?? ''} جهة اتصال بشكل نهائي. هذا الإجراء لا يمكن التراجع عنه.`}
    confirmLabel="مسح الكل"
    isPending={isPending}
    onConfirm={onConfirm}
    onCancel={onClose}
  />
);

export default DeleteAllContactsModal;
