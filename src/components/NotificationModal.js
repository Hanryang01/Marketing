import React, { useState, useRef, memo } from 'react';
import { useNotification } from '../context/NotificationContext';
import './NotificationModal.css';
import { useCalendar } from '../hooks/useCalendar';

// 회사명 입력창 컴포넌트 (메모이제이션)
const CompanyNameInput = memo(({ value, onChange, placeholder, maxLength, index }) => {
  const inputRef = useRef(null);
  
  const handleChange = (e) => {
    onChange(e.target.value);
  };
  
  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      maxLength={maxLength}
      autoComplete="off"
    />
  );
});

const NotificationModal = () => {
  const {
    notifications,
    isModalOpen,
    activeTab,
    notificationSettings,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateNotificationSettings,
    closeModal,
    changeTab,
  } = useNotification();
  
  const { formatDate } = useCalendar();

  const [tempSettings, setTempSettings] = useState({
    companyName: notificationSettings.companyName || '',
    taxInvoiceSettings: [],
    endDateReminder7Days: notificationSettings.endDateReminder7Days || true,
    endDateReminderToday: notificationSettings.endDateReminderToday || true
  });

  // 모달이 열릴 때 설정값을 임시 상태로 복사 (최적화)
  React.useEffect(() => {
    if (isModalOpen) {
      // 설정이 변경된 경우에만 복사
      const currentSettings = {
        companyName: notificationSettings.companyName || '',
        taxInvoiceSettings: (notificationSettings.taxInvoiceSettings || []).filter(setting => 
          setting && typeof setting === 'object' && 
          'companyName' in setting && 'day' in setting &&
          !setting.title && !setting.content && !setting.type
        ),
        endDateReminder7Days: notificationSettings.endDateReminder7Days || true,
        endDateReminderToday: notificationSettings.endDateReminderToday || true
      };
      
      // 이전 설정과 비교하여 변경된 경우에만 업데이트
      setTempSettings(prev => {
        const hasChanged = 
          prev.companyName !== currentSettings.companyName ||
          JSON.stringify(prev.taxInvoiceSettings) !== JSON.stringify(currentSettings.taxInvoiceSettings) ||
          prev.endDateReminder7Days !== currentSettings.endDateReminder7Days ||
          prev.endDateReminderToday !== currentSettings.endDateReminderToday;
        
        return hasChanged ? currentSettings : prev;
      });
    }
  }, [isModalOpen, notificationSettings]);

  // 탭 변경 시 설정 초기화 제거 - 모달 열림 시에만 초기화

  // 세금계산서 설정 추가
  const handleAddTaxInvoiceSetting = () => {
    setTempSettings(prev => ({
      ...prev,
      taxInvoiceSettings: [...prev.taxInvoiceSettings, { companyName: '', day: '' }]
    }));
  };

  // 세금계산서 설정 수정
  const handleUpdateTaxInvoiceSetting = (index, field, value) => {
    // 빈 문자열도 허용하도록 처리
    const cleanValue = value === undefined || value === null ? '' : value.toString();
    
    setTempSettings(prev => ({
      ...prev,
      taxInvoiceSettings: prev.taxInvoiceSettings.map((setting, i) => 
        i === index ? { ...setting, [field]: cleanValue } : setting
      )
    }));
  };

  // 세금계산서 설정 삭제
  const handleRemoveTaxInvoiceSetting = (index) => {
    setTempSettings(prev => ({
      ...prev,
      taxInvoiceSettings: prev.taxInvoiceSettings.filter((_, i) => i !== index)
    }));
  };

  // 설정 저장
  const handleSaveSettings = () => {
    updateNotificationSettings(tempSettings);
    closeModal();
  };


  // 알림 메시지에서 회사명 강조 처리
  const formatNotificationMessage = (content, type) => {
    // 모든 알림 타입에서 동일한 스타일로 회사명 강조 (언더스코어 포함)
    if (type === 'tax_invoice' || type === 'end_date_today' || type === 'end_date_7days') {
      const companyRegex = /^([가-힣a-zA-Z0-9\s_]+)는/g;
      return content.replace(companyRegex, (match, companyName) => {
        const trimmedCompanyName = companyName.trim();
        return `<span class="company-name">${trimmedCompanyName}</span>는`;
      });
    }
    
    // 기본 처리
    return content;
  };

  // 알림 타입별 아이콘
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'system':
        return '🔧';
      case 'settings':
        return '⚙️';
      case 'tax_invoice':
        return '📄';
      case 'end_date_7days':
        return '⚠️';
      case 'end_date_today':
        return '🚨';
      default:
        return '📢';
    }
  };

  if (!isModalOpen) {
    return null;
  }

  return (
    <div className="notification-modal-overlay" onClick={closeModal}>
      <div className="notification-modal" onClick={(e) => e.stopPropagation()}>
        {/* 모달 헤더 */}
        <div className="notification-modal-header">
          <h2>알림</h2>
          <button className="close-button" onClick={closeModal}>×</button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="notification-tabs">
          <button
            className={`tab-button ${activeTab === 0 ? 'active' : ''}`}
            onClick={() => changeTab(0)}
          >
            알림 리스트
            {notifications.filter(n => !n.isRead).length > 0 && (
              <span className="tab-badge">
                {notifications.filter(n => !n.isRead).length}
              </span>
            )}
          </button>
          <button
            className={`tab-button ${activeTab === 1 ? 'active' : ''}`}
            onClick={() => changeTab(1)}
          >
            알림 설정
          </button>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="notification-content">
          {activeTab === 0 ? (
            // 알림 리스트 탭
            <div className="notification-list-tab">
              {notifications.length > 0 ? (
                <>
                  <div className="notification-actions">
                    <button 
                      className="mark-all-read-button"
                      onClick={markAllAsRead}
                      disabled={notifications.every(n => n.isRead)}
                    >
                      모두 읽음
                    </button>
                  </div>
                  
              <div className="notification-list">
                {notifications.map((notification, index) => (
                      <div
                        key={`${notification.id}-${index}`}
                        className={`notification-item ${!notification.isRead ? 'unread' : 'read'}`}
                        data-type={notification.type}
                        onClick={() => !notification.isRead && markAsRead(notification.id)}
                      >
                        <div className="notification-status-indicator">
                          {!notification.isRead && <div className="unread-indicator"></div>}
                        </div>
                        <div className="notification-icon">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="notification-content">
                          <div className="notification-header">
                            <div className="notification-title">
                              {notification.title}
                            </div>
                            <div className="notification-status">
                              {!notification.isRead ? (
                                <span className="status-badge unread-badge">안읽음</span>
                              ) : (
                                <span className="status-badge read-badge">읽음</span>
                              )}
                            </div>
                          </div>
                          <div 
                            className="notification-message"
                            dangerouslySetInnerHTML={{
                              __html: formatNotificationMessage(notification.content, notification.type)
                            }}
                          />
                          <div className="notification-time">
                            {formatDate(notification.createdAt)}
                          </div>
                        </div>
                        <button
                          className="delete-notification-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          title="삭제"
                        >
                          ×
                        </button>
                      </div>
                ))}
                  </div>
                </>
              ) : (
                <div className="empty-notifications">
                  <div className="empty-icon">📭</div>
                  <p>알림이 없습니다.</p>
                </div>
              )}
            </div>
          ) : (
            // 알림 설정 탭
            <div className="notification-settings-tab">
              <div className="settings-section">
                <h3>세금계산서 발행 알림</h3>
                <div className="tax-invoice-settings">
                  {tempSettings.taxInvoiceSettings.map((setting, index) => (
                    <div key={`tax-invoice-${index}`} className="tax-invoice-item">
                      <div className="tax-invoice-row">
                        <div className="setting-item">
                          <label>회사명</label>
                          <CompanyNameInput
                            value={setting.companyName}
                            onChange={(value) => handleUpdateTaxInvoiceSetting(index, 'companyName', value)}
                            placeholder="회사명을 입력하세요"
                            maxLength="50"
                            index={index}
                          />
                        </div>
                        <div className="setting-item">
                          <label>매월 발행일</label>
                          <select
                            value={setting.day}
                            onChange={(e) => handleUpdateTaxInvoiceSetting(index, 'day', e.target.value)}
                          >
                            <option value="">선택하지 않음</option>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                              <option key={day} value={day}>{day}일</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="remove-button"
                        onClick={() => handleRemoveTaxInvoiceSetting(index)}
                        title="삭제"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="add-button"
                    onClick={handleAddTaxInvoiceSetting}
                  >
                    + 회사 추가
                  </button>
                </div>
              </div>

              <div className="settings-section">
                <h3>기간 종료 알림</h3>
                <div className="setting-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={tempSettings.endDateReminder7Days}
                      onChange={(e) => setTempSettings({
                        ...tempSettings,
                        endDateReminder7Days: e.target.checked
                      })}
                    />
                    <span className="checkmark"></span>
                    종료일 7일전 알림
                  </label>
                </div>
                <div className="setting-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={tempSettings.endDateReminderToday}
                      onChange={(e) => setTempSettings({
                        ...tempSettings,
                        endDateReminderToday: e.target.checked
                      })}
                    />
                    <span className="checkmark"></span>
                    종료일 당일 알림
                  </label>
                </div>
              </div>

              <div className="settings-actions">
                <button className="cancel-button" onClick={closeModal}>
                  취소
                </button>
                <button className="save-button" onClick={handleSaveSettings}>
                  저장
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
