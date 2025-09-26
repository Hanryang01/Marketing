import { useState } from 'react';

export const useMessage = () => {
  // 메시지 팝업창 상태
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageData, setMessageData] = useState({
    type: 'info',
    title: '',
    content: '',
    onConfirm: null,
    onCancel: null,
    showCancel: true,
    confirmText: '확인',
    cancelText: '취소'
  });

  // 메시지 팝업창 표시 함수
  const showMessage = (type, title, content, options = {}) => {
    setMessageData({
      type,
      title,
      content,
      onConfirm: options.onConfirm || null,
      onCancel: options.onCancel || null,
      showCancel: options.showCancel !== false,
      confirmText: options.confirmText || '확인',
      cancelText: options.cancelText || '취소'
    });
    setShowMessageModal(true);
  };

  // 메시지 팝업창 닫기 함수
  const closeMessage = () => {
    setShowMessageModal(false);
    setMessageData({
      type: 'info',
      title: '',
      content: '',
      onConfirm: null,
      onCancel: null,
      showCancel: true,
      confirmText: '확인',
      cancelText: '취소'
    });
  };

  // 메시지 확인 처리
  const handleMessageConfirm = () => {
    if (messageData.onConfirm) {
      messageData.onConfirm();
    }
    closeMessage();
  };

  // 메시지 취소 처리
  const handleMessageCancel = () => {
    if (messageData.onCancel) {
      messageData.onCancel();
    }
    closeMessage();
  };

  return {
    showMessageModal,
    messageData,
    showMessage,
    closeMessage,
    handleMessageConfirm,
    handleMessageCancel
  };
};
