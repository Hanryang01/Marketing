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
    
    // 알림은 하루에 한번만 생성되므로 주기적 조회 불필요
    // 필요시에만 수동으로 조회 (사이트 접속 시, 알림 아이콘 클릭 시)
    
    // 페이지 포커스 시에만 알림 조회 (사용자가 사이트를 다시 볼 때)
    const handleFocus = () => {
      loadNotifications();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
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

  // 알림 설정 로드 (서버 우선, 로컬 스토리지 보조)
  const loadNotificationSettings = async () => {
    try {
      // 로컬 스토리지에서 기본 설정 로드 (세금계산서 제외)
      const savedSettings = localStorage.getItem('notificationSettings');
      let localSettings = {};
      
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        
        // 세금계산서 설정은 서버에서 불러올 예정이므로 제거
        delete parsedSettings.taxInvoiceSettings;
        delete parsedSettings.taxInvoiceDay;
        delete parsedSettings.companyName;
        
        // 기존 endDateReminder7Days가 있으면 endDateReminder14Days로 변환
        if (parsedSettings.endDateReminder7Days !== undefined && parsedSettings.endDateReminder14Days === undefined) {
          parsedSettings.endDateReminder14Days = parsedSettings.endDateReminder7Days;
          delete parsedSettings.endDateReminder7Days;
        }
        
        localSettings = parsedSettings;
        
        // 로컬 스토리지에서도 세금계산서 설정 제거
        localStorage.setItem('notificationSettings', JSON.stringify(parsedSettings));
      } else {
        // 로컬 스토리지에 설정이 없으면 기본값으로 저장 (세금계산서 제외)
        const defaultSettings = {
          endDateReminder14Days: true,
          endDateReminderToday: true,
        };
        localSettings = defaultSettings;
        localStorage.setItem('notificationSettings', JSON.stringify(defaultSettings));
      }
      
      // 로컬 설정을 먼저 적용
      setNotificationSettings(prev => ({
        ...prev,
        ...localSettings
      }));
      
      // 그 다음 서버에서 세금계산서 설정 조회 (덮어쓰기 방지)
      await loadTaxInvoiceSettings();
      
    } catch (error) {
      console.error('알림 설정 로드 실패:', error);
      // 에러 발생 시 기본값 설정
      const defaultSettings = {
        endDateReminder14Days: true,
        endDateReminderToday: true,
      };
      setNotificationSettings(prev => ({
        ...prev,
        ...defaultSettings
      }));
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

  // 디버깅용 함수들 제거됨 (중복 방지를 위해)
  // 알림 생성은 스케줄러만 사용

  // 서버 기반에서는 세금계산서 알림도 서버에서 처리
  // 프론트엔드에서는 설정만 저장하고 알림 조회만 수행


  // 모달 열기/닫기 (알림 조회만)
  const openModal = async () => {
    setIsModalOpen(true);
    
    try {
      // 1. 최신 알림 조회
      await loadNotifications();
      
      // 2. 알림 설정도 함께 로드 (모달에서 설정 표시를 위해)
      await loadNotificationSettings();
    } catch (error) {
      console.error('❌ 알림 로드 실패:', error);
    }
  };
  const closeModal = () => setIsModalOpen(false);

  // 탭 변경
  const changeTab = (tabIndex) => setActiveTab(tabIndex);

  // 서버 기반에서는 세금계산서 알림도 서버에서 처리
  // 프론트엔드에서는 설정만 저장하고 알림 조회만 수행

  // 세금계산서 설정 추가 (서버 API 호출)
  const addTaxInvoiceSetting = async (companyName, day) => {
    try {
      console.log('🔄 세금계산서 설정 추가:', { companyName, day });
      const response = await apiCall(API_ENDPOINTS.TAX_INVOICE_SETTINGS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          company_name: companyName, 
          day_of_month: day 
        })
      });
      
      if (response.success) {
        console.log('✅ 세금계산서 설정 추가 성공:', response);
        // 서버에서 설정 조회하여 로컬 상태 업데이트
        await loadTaxInvoiceSettings();
      } else {
        console.error('❌ 세금계산서 설정 추가 실패:', response.error);
      }
    } catch (error) {
      console.error('❌ 세금계산서 설정 추가 API 호출 실패:', error);
    }
  };

  // 세금계산서 설정 수정 (서버 API 호출)
  const updateTaxInvoiceSetting = async (id, companyName, day) => {
    try {
      console.log('🔄 세금계산서 설정 수정:', { id, companyName, day });
      const response = await apiCall(`${API_ENDPOINTS.TAX_INVOICE_SETTINGS}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          company_name: companyName, 
          day_of_month: day,
          is_active: 1
        })
      });
      
      if (response.success) {
        console.log('✅ 세금계산서 설정 수정 성공:', response);
        // 서버에서 설정 조회하여 로컬 상태 업데이트
        await loadTaxInvoiceSettings();
      } else {
        console.error('❌ 세금계산서 설정 수정 실패:', response.error);
      }
    } catch (error) {
      console.error('❌ 세금계산서 설정 수정 API 호출 실패:', error);
    }
  };

  // 세금계산서 설정 삭제 (서버 API 호출)
  const removeTaxInvoiceSetting = async (id) => {
    try {
      console.log('🔄 세금계산서 설정 삭제:', { id });
      const response = await apiCall(`${API_ENDPOINTS.TAX_INVOICE_SETTINGS}/${id}`, {
        method: 'DELETE'
      });
      
      if (response.success) {
        console.log('✅ 세금계산서 설정 삭제 성공:', response);
        // 서버에서 설정 조회하여 로컬 상태 업데이트
        await loadTaxInvoiceSettings();
      } else {
        console.error('❌ 세금계산서 설정 삭제 실패:', response.error);
      }
    } catch (error) {
      console.error('❌ 세금계산서 설정 삭제 API 호출 실패:', error);
    }
  };

  // 세금계산서 설정 조회 (서버에서)
  const loadTaxInvoiceSettings = async () => {
    try {
      console.log('🔄 세금계산서 설정 조회...');
      const response = await apiCall(API_ENDPOINTS.TAX_INVOICE_SETTINGS);
      
      if (response.success && response.settings) {
        console.log('✅ 세금계산서 설정 조회 성공:', response.settings);
        setNotificationSettings(prev => ({
          ...prev,
          taxInvoiceSettings: response.settings.map(setting => ({
            id: setting.id,
            companyName: setting.company_name,
            day: setting.day_of_month
          }))
        }));
      } else {
        console.error('❌ 세금계산서 설정 조회 실패:', response.error);
      }
    } catch (error) {
      console.error('❌ 세금계산서 설정 조회 API 호출 실패:', error);
    }
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
    
    // 디버깅용 함수들 제거됨 (중복 방지를 위해)
    
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
