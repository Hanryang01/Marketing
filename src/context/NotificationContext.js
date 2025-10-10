import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiCall, API_ENDPOINTS } from '../config/api';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  // 알림 목록 상태
  const [notifications, setNotifications] = useState([]);
  
  // 모달 열림/닫힘 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 현재 탭 상태 (0: 알림 리스트, 1: 알림 설정)
  const [activeTab, setActiveTab] = useState(0);
  
  // 알림 설정 상태
  const [notificationSettings, setNotificationSettings] = useState({
    companyName: '', // 업체명
    taxInvoiceSettings: [], // 여러 회사의 세금계산서 발행일 설정 [{companyName: '', day: ''}, ...]
    endDateReminder14Days: true, // 종료일 14일전 알림
    endDateReminder1Day: true, // 종료일 1일 전 알림
  });


  // 초기 알림 데이터 로드
  useEffect(() => {
    loadNotifications();
    loadNotificationSettings();
    
    // 서버에서 알림 주기적 조회 (5분마다)
    const intervalId = setInterval(() => {
      loadNotifications();
    }, 5 * 60 * 1000); // 5분마다
    
    return () => clearInterval(intervalId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 서버 기반 알림 시스템 - 로컬 알림 생성 로직 제거
  // 알림은 서버에서 자동으로 생성되므로 프론트엔드에서는 조회만 수행


  // 알림 데이터 로드 (서버에서)
  const loadNotifications = React.useCallback(async () => {
    try {
      const response = await apiCall(API_ENDPOINTS.NOTIFICATIONS);
      
      if (response && response.success && response.data && Array.isArray(response.data)) {
        console.log('📋 원본 알림 데이터:', response.data);
        // 서버 데이터를 프론트엔드 형식으로 변환
        const serverNotifications = response.data.map(notification => ({
          id: notification.id.toString(),
          title: notification.title,
          content: notification.message,
          type: notification.type,
          isRead: notification.is_read,
          createdAt: notification.created_at,
          readAt: notification.read_at,
          expiresAt: notification.expires_at
        }));
        
        console.log('🔄 변환된 알림 데이터:', serverNotifications);
        setNotifications(serverNotifications);
        console.log(`✅ 서버에서 ${serverNotifications.length}개 알림 로드 완료`);
      } else {
        console.log('📝 서버에 알림이 없습니다.');
        console.log('🔍 데이터 구조:', { 
          success: response?.success, 
          hasData: !!response?.data, 
          isArray: Array.isArray(response?.data),
          dataType: typeof response?.data,
          dataValue: response?.data
        });
        setNotifications([]);
      }
    } catch (error) {
      console.error('❌ 서버 알림 로드 실패:', error);
      console.error('❌ 에러 상세:', error.message, error.stack);
      // 서버 로드 실패 시 빈 배열로 설정
      setNotifications([]);
    }
  }, []); // 빈 의존성 배열로 함수가 재생성되지 않도록 함

  // 알림 설정 로드 (로컬 스토리지에서)
  const loadNotificationSettings = () => {
    try {
      const savedSettings = localStorage.getItem('notificationSettings');
      
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        
        // 기존 taxInvoiceDay가 있으면 taxInvoiceSettings로 변환
        if (parsedSettings.taxInvoiceDay && !parsedSettings.taxInvoiceSettings) {
          parsedSettings.taxInvoiceSettings = [{
            companyName: parsedSettings.companyName || '',
            day: parsedSettings.taxInvoiceDay
          }];
          delete parsedSettings.taxInvoiceDay;
        }
        
        // 기존 endDateReminder7Days가 있으면 endDateReminder14Days로 변환
        if (parsedSettings.endDateReminder7Days !== undefined && parsedSettings.endDateReminder14Days === undefined) {
          parsedSettings.endDateReminder14Days = parsedSettings.endDateReminder7Days;
          delete parsedSettings.endDateReminder7Days;
        }
        
        setNotificationSettings(parsedSettings);
      } else {
        // 로컬 스토리지에 설정이 없으면 기본값으로 저장
        const defaultSettings = {
          companyName: '',
          taxInvoiceSettings: [],
          endDateReminder14Days: true,
          endDateReminderToday: true,
        };
        setNotificationSettings(defaultSettings);
        localStorage.setItem('notificationSettings', JSON.stringify(defaultSettings));
      }
    } catch (error) {
      console.error('알림 설정 로드 실패:', error);
      // 에러 발생 시 기본값 설정
      const defaultSettings = {
        companyName: '',
        taxInvoiceSettings: [],
        endDateReminder14Days: true,
        endDateReminderToday: true,
      };
      setNotificationSettings(defaultSettings);
    }
  };

  // 읽지 않은 알림 개수 계산
  const unreadCount = notifications.filter(notification => !notification.isRead).length;

  // 서버 기반 알림 시스템에서는 로컬 알림 생성 함수들이 필요 없음
  // 알림은 서버에서 자동으로 생성되고, 프론트엔드는 조회만 담당

  // 알림 읽음 처리 (서버 API 호출)
  const markAsRead = async (notificationId) => {
    try {
      console.log(`📖 알림 읽음 처리: ${notificationId}`);
      await apiCall(API_ENDPOINTS.NOTIFICATION_READ(notificationId), {
        method: 'PUT'
      });
      
      // 로컬 상태 업데이트
      const updatedNotifications = notifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, isRead: true, readAt: new Date().toISOString() }
          : notification
      );
      setNotifications(updatedNotifications);
      console.log('✅ 알림 읽음 처리 완료');
    } catch (error) {
      console.error('❌ 알림 읽음 처리 실패:', error);
    }
  };

  // 모든 알림 읽음 처리 (서버 API 호출)
  const markAllAsRead = async () => {
    try {
      console.log('📖 모든 알림 읽음 처리 중...');
      
      // 읽지 않은 알림들만 서버에 읽음 처리 요청
      const unreadNotifications = notifications.filter(notification => !notification.isRead);
      
      for (const notification of unreadNotifications) {
        try {
          await apiCall(API_ENDPOINTS.NOTIFICATION_READ(notification.id), {
            method: 'PUT'
          });
        } catch (error) {
          console.error(`❌ 알림 ${notification.id} 읽음 처리 실패:`, error);
        }
      }
      
      // 로컬 상태 업데이트
      const updatedNotifications = notifications.map(notification => ({
        ...notification,
        isRead: true,
        readAt: notification.readAt || new Date().toISOString()
      }));
      setNotifications(updatedNotifications);
      console.log('✅ 모든 알림 읽음 처리 완료');
    } catch (error) {
      console.error('❌ 모든 알림 읽음 처리 실패:', error);
    }
  };

  // 알림 삭제 (서버 API 호출)
  const deleteNotification = async (notificationId) => {
    try {
      console.log(`🗑️ 알림 삭제: ${notificationId}`);
      await apiCall(API_ENDPOINTS.NOTIFICATION_DELETE(notificationId), {
        method: 'DELETE'
      });
      
      // 로컬 상태 업데이트
      const updatedNotifications = notifications.filter(
        notification => notification.id !== notificationId
      );
      setNotifications(updatedNotifications);
      console.log('✅ 알림 삭제 완료');
    } catch (error) {
      console.error('❌ 알림 삭제 실패:', error);
    }
  };

  // 알림 설정 업데이트 (로컬 스토리지만 사용)
  const updateNotificationSettings = (newSettings) => {
    // 필요한 속성만 추출하여 저장
    const updatedSettings = {
      companyName: newSettings.companyName || '',
      taxInvoiceSettings: newSettings.taxInvoiceSettings || [],
      endDateReminder14Days: newSettings.endDateReminder14Days || true,
      endDateReminder1Day: newSettings.endDateReminder1Day || true
    };
    
    setNotificationSettings(updatedSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(updatedSettings));
    
    // 서버 기반에서는 설정 변경 시 알림 목록 새로고침만 수행
    setTimeout(() => {
      loadNotifications();
    }, 100);
  };

  // 수동 알림 생성 (서버 API 호출)
  const createTestNotification = async () => {
    try {
      console.log('🧪 서버에서 테스트 알림 생성 중...');
      await apiCall(API_ENDPOINTS.CREATE_NOTIFICATIONS, {
        method: 'POST'
      });
      console.log('✅ 서버 알림 생성 완료');
      // 알림 목록 새로고침
      await loadNotifications();
    } catch (error) {
      console.error('❌ 서버 알림 생성 실패:', error);
    }
  };

  // 종료일 알림 강제 생성 (서버 API 호출)
  const createEndDateNotification = async () => {
    try {
      console.log('🔔 서버에서 종료일 알림 강제 생성 중...');
      await apiCall(API_ENDPOINTS.CREATE_NOTIFICATIONS, {
        method: 'POST'
      });
      console.log('✅ 서버 종료일 알림 생성 완료');
      // 알림 목록 새로고침
      await loadNotifications();
    } catch (error) {
      console.error('❌ 서버 종료일 알림 생성 실패:', error);
    }
  };

  // 서버 기반에서는 세금계산서 알림도 서버에서 처리
  // 프론트엔드에서는 설정만 저장하고 알림 조회만 수행


  // 모달 열기/닫기
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  // 탭 변경
  const changeTab = (tabIndex) => setActiveTab(tabIndex);

  // 서버 기반에서는 세금계산서 알림도 서버에서 처리
  // 프론트엔드에서는 설정만 저장하고 알림 조회만 수행

  // 세금계산서 설정 추가
  const addTaxInvoiceSetting = (companyName, day) => {
    setNotificationSettings(prev => ({
      ...prev,
      taxInvoiceSettings: [...prev.taxInvoiceSettings, { companyName, day }]
    }));
  };

  // 세금계산서 설정 수정
  const updateTaxInvoiceSetting = (index, companyName, day) => {
    setNotificationSettings(prev => ({
      ...prev,
      taxInvoiceSettings: prev.taxInvoiceSettings.map((setting, i) => 
        i === index ? { companyName, day } : setting
      )
    }));
  };

  // 세금계산서 설정 삭제
  const removeTaxInvoiceSetting = (index) => {
    setNotificationSettings(prev => ({
      ...prev,
      taxInvoiceSettings: prev.taxInvoiceSettings.filter((_, i) => i !== index)
    }));
  };

  // 서버 기반에서는 종료일 알림도 서버에서 처리
  // 프론트엔드에서는 설정만 저장하고 알림 조회만 수행


  const value = {
    // 상태
    notifications,
    isModalOpen,
    activeTab,
    notificationSettings,
    unreadCount,
    
    // 액션 (서버 기반)
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateNotificationSettings,
    openModal,
    closeModal,
    changeTab,
    
    // 디버깅용 함수 (서버 API 호출)
    createTestNotification,
    createEndDateNotification,
    
    // 세금계산서 설정 관리 (로컬 스토리지)
    addTaxInvoiceSetting,
    updateTaxInvoiceSetting,
    removeTaxInvoiceSetting,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
