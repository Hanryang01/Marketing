import React from 'react';
import UserDetailModal from './UserDetailModal';

const ApprovalModal = ({ 
  isOpen, 
  user, 
  onClose, 
  onSave,
  companyHistory = [],
  showMessage
}) => {
  if (!isOpen || !user) return null;

  return (
    <UserDetailModal
      isOpen={isOpen}
      user={user}
      onClose={onClose}
      onSave={onSave}
      isEditable={true}
      showFooter={true}
      isApprovalMode={true}
      companyHistory={companyHistory}
      showMessage={showMessage}
    />
  );
};

export default ApprovalModal;
