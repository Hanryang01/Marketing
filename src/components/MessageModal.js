import React, { useEffect } from 'react';

const MessageModal = ({ 
  isOpen, 
  messageData = {}, 
  onConfirm, 
  onCancel 
}) => {
  // 기본값 설정
  const defaultMessageData = {
    type: 'info',
    title: '',
    content: '',
    confirmText: '확인',
    cancelText: '취소',
    showCancel: false
  };

  const safeMessageData = { ...defaultMessageData, ...messageData };

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        if (safeMessageData.showCancel && onCancel) {
          onCancel();
        } else if (onConfirm) {
          onConfirm();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, safeMessageData.showCancel, onCancel, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="message-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="message-title">
      <div className="message-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`message-icon ${safeMessageData.type}`} aria-hidden="true">
          {safeMessageData.type === 'success' && '✓'}
          {safeMessageData.type === 'error' && '✕'}
          {safeMessageData.type === 'warning' && '⚠'}
          {safeMessageData.type === 'info' && 'ℹ'}
        </div>
        <div className="message-title" id="message-title">{safeMessageData.title}</div>
        <div className="message-content">{safeMessageData.content}</div>
        <div className="message-buttons">
          {safeMessageData.showCancel && (
            <button 
              className="message-button cancel"
              onClick={onCancel}
              type="button"
              aria-label="취소"
            >
              {safeMessageData.cancelText}
            </button>
          )}
          <button 
            className={`message-button ${safeMessageData.type === 'error' ? 'delete' : 'confirm'}`}
            onClick={onConfirm}
            type="button"
            aria-label="확인"
            autoFocus
          >
            {safeMessageData.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;
