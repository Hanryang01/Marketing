import React from 'react';

const MessageModal = ({ 
  isOpen, 
  messageData, 
  onConfirm, 
  onCancel 
}) => {
  if (!isOpen) return null;

  return (
    <div className="message-modal-overlay">
      <div className="message-modal">
        <div className={`message-icon ${messageData.type}`}>
          {messageData.type === 'success' && '✓'}
          {messageData.type === 'error' && '✕'}
          {messageData.type === 'warning' && '⚠'}
          {messageData.type === 'info' && 'ℹ'}
        </div>
        <div className="message-title">{messageData.title}</div>
        <div className="message-content">{messageData.content}</div>
        <div className="message-buttons">
          {messageData.showCancel && (
            <button 
              className="message-button cancel"
              onClick={onCancel}
            >
              {messageData.cancelText}
            </button>
          )}
          <button 
            className={`message-button ${messageData.type === 'error' ? 'delete' : 'confirm'}`}
            onClick={onConfirm}
          >
            {messageData.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;
