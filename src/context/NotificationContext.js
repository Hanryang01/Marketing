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
    endDateReminder7Days: true, // 종료일 7일전 알림
    endDateReminderToday: true, // 종료일 당일 알림
  });


  // 초기 알림 데이터 로드
  useEffect(() => {
    loadNotifications();
    loadNotificationSettings();
    
  }, []);

  // 통합된 매일 알림 체크 (성능 최적화)
  useEffect(() => {
    let timeoutId;
    let intervalId;

    const checkAllNotifications = async () => {
      const today = new Date();
      const todayDay = today.getDate();
      const todayStr = today.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      console.log('🔍 통합 알림 체크 시작:', {
        today: todayStr,
        todayDay: todayDay
      });

      // 1. 세금계산서 발행일 체크
      if (notificationSettings.taxInvoiceSettings && notificationSettings.taxInvoiceSettings.length > 0) {
        notificationSettings.taxInvoiceSettings.forEach(setting => {
          if (setting.day && parseInt(setting.day) === todayDay && setting.companyName) {
            const existingNotification = notifications.find(notification => 
              notification.type === 'tax_invoice' &&
              notification.content.includes(setting.companyName) &&
              notification.content.includes(todayStr)
            );
            
            if (!existingNotification) {
              console.log('📄 세금계산서 알림 생성:', setting.companyName, todayStr);
              addNotificationWithServerCheck({
                title: '세금계산서 발행 알림',
                content: `${setting.companyName}는 오늘 (${todayStr}) 세금계산서 발행일입니다.`,
                type: 'tax_invoice',
              }, setting.companyName, 'tax_invoice', today.toISOString().split('T')[0]);
            }
          }
        });
      }

      // 2. 종료일 체크 (서버 데이터)
      if (notificationSettings.endDateReminderToday || notificationSettings.endDateReminder7Days) {
        try {
          const response = await apiCall(API_ENDPOINTS.END_DATE_CHECK);
          if (response.ok) {
            const data = await response.json();
            
            if (data && data.success) {
              // 7일 후 종료일인 사용자들 처리
              if (data.weekEndUsers && data.weekEndUsers.length > 0 && notificationSettings.endDateReminder7Days) {
                for (const user of data.weekEndUsers) {
                  // 프론트엔드에서 바로 알림 생성 (서버 확인 없이)
                  addNotification({
                    title: '기간 종료 알림 (7일전)',
                    content: `${user.company_name || user.user_id}는 사용 기간 종료가 7일 남았습니다.`,
                    type: 'end_date_7days',
                  });
                }
              }
              
              // 오늘 종료일인 사용자들 처리
              if (data.todayEndUsers && data.todayEndUsers.length > 0 && notificationSettings.endDateReminderToday) {
                for (const user of data.todayEndUsers) {
                  // 프론트엔드에서 바로 알림 생성 (서버 확인 없이)
                  addNotification({
                    title: '기간 종료 알림 (당일)',
                    content: `${user.company_name || user.user_id}는 오늘 (${data.today}) 사용 기간이 종료되었습니다.`,
                    type: 'end_date_today',
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error('종료일 확인 중 오류:', error);
        }
      }

      console.log('✅ 통합 알림 체크 완료');
    };

    // 즉시 한 번 체크 실행
    checkAllNotifications();

    // 매일 자정에 확인
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    timeoutId = setTimeout(() => {
      checkAllNotifications();
      intervalId = setInterval(checkAllNotifications, 24 * 60 * 60 * 1000);
    }, timeUntilMidnight);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    notificationSettings.taxInvoiceSettings,
    notificationSettings.endDateReminder7Days,
    notificationSettings.endDateReminderToday
  ]);


  // 알림 데이터 로드 (로컬 스토리지에서)
  const loadNotifications = () => {
    try {
      const savedNotifications = localStorage.getItem('notifications');
      if (savedNotifications) {
        setNotifications(JSON.parse(savedNotifications));
      } else {
        // 초기 알림 데이터
        const initialNotifications = [
          {
            id: 1,
            title: '시스템 알림',
            content: '알림 기능이 활성화되었습니다.',
            type: 'system',
            isRead: false,
            createdAt: new Date().toISOString(),
          },
          {
            id: 2,
            title: '알림 설정',
            content: '알림 설정을 확인해주세요.',
            type: 'settings',
            isRead: true,
            createdAt: new Date(Date.now() - 86400000).toISOString(), // 1일 전
          }
        ];
        setNotifications(initialNotifications);
        localStorage.setItem('notifications', JSON.stringify(initialNotifications));
      }
    } catch (error) {
      console.error('알림 데이터 로드 실패:', error);
    }
  };

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
        
        setNotificationSettings(parsedSettings);
      }
    } catch (error) {
      console.error('알림 설정 로드 실패:', error);
    }
  };

  // 읽지 않은 알림 개수 계산
  const unreadCount = notifications.filter(notification => !notification.isRead).length;

  // 서버 확인 후 알림 추가
  const addNotificationWithServerCheck = async (notification, userId, notificationType, notificationDate) => {
    // 프론트엔드에서 바로 알림 생성 (서버 확인 없이)
    addNotification(notification);
    console.log('✅ 알림 생성:', notification.title);
  };

  // 알림 추가 (중복 방지 포함)
  const addNotification = (notification) => {
    // 더 고유한 ID 생성 (타임스탬프 + 랜덤 + 카운터)
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const counter = Math.floor(Math.random() * 10000);
    const newNotification = {
      id: `${timestamp}-${random}-${counter}`,
      ...notification,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    
    
    // 로컬 스토리지에서 현재 알림 목록을 직접 가져와서 중복 체크
    const currentNotifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    
    // 중복 체크: 같은 타입과 내용의 알림이 있는지 확인
    const isDuplicate = currentNotifications.some(existing => 
      existing.type === newNotification.type &&
      existing.content === newNotification.content &&
      existing.title === newNotification.title
    );
    
    if (isDuplicate) {
      console.log('⏭️ 중복 알림 방지:', newNotification.title, newNotification.content);
      return; // 중복이면 알림 추가하지 않음
    }
    
    // 중복이 아니면 알림 추가
    const updatedNotifications = [newNotification, ...currentNotifications];
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    setNotifications(updatedNotifications);
    
  };

  // 중복된 알림 정리 함수
  const cleanupDuplicateNotifications = () => {
    const currentNotifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    
    // ID 기반 중복 제거 (가장 최근 것만 유지)
    const idGroups = {};
    currentNotifications.forEach(notification => {
      const baseId = notification.id.split('-')[0]; // 타임스탬프 부분만 추출
      if (!idGroups[baseId] || new Date(notification.createdAt) > new Date(idGroups[baseId].createdAt)) {
        idGroups[baseId] = notification;
      }
    });
    
    const uniqueNotifications = Object.values(idGroups);
    
    // 로컬 스토리지와 상태 업데이트
    localStorage.setItem('notifications', JSON.stringify(uniqueNotifications));
    setNotifications(uniqueNotifications);
  };

  // 알림 읽음 처리
  const markAsRead = (notificationId) => {
    const updatedNotifications = notifications.map(notification =>
      notification.id === notificationId
        ? { ...notification, isRead: true }
        : notification
    );
    setNotifications(updatedNotifications);
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
  };

  // 모든 알림 읽음 처리
  const markAllAsRead = () => {
    const updatedNotifications = notifications.map(notification => ({
      ...notification,
      isRead: true
    }));
    setNotifications(updatedNotifications);
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
  };

  // 알림 삭제
  const deleteNotification = (notificationId) => {
    const updatedNotifications = notifications.filter(
      notification => notification.id !== notificationId
    );
    setNotifications(updatedNotifications);
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
  };

  // 알림 설정 업데이트
  const updateNotificationSettings = (newSettings) => {
    // 필요한 속성만 추출하여 저장
    const updatedSettings = {
      companyName: newSettings.companyName || '',
      taxInvoiceSettings: newSettings.taxInvoiceSettings || [],
      endDateReminder7Days: newSettings.endDateReminder7Days || true,
      endDateReminderToday: newSettings.endDateReminderToday || true
    };
    
    setNotificationSettings(updatedSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(updatedSettings));
    
    // 설정 저장 시 즉시 알림 생성 (중복 방지)
    checkTaxInvoiceDatesImmediately(updatedSettings);
    
    // 알림 목록 강제 새로고침
    setTimeout(() => {
      loadNotifications();
    }, 100);
  };

  // 즉시 세금계산서 발행일 확인 (설정 저장 시)
  const checkTaxInvoiceDatesImmediately = (settings) => {
    const today = new Date();
    const todayDay = today.getDate();
    const todayStr = today.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // 설정된 세금계산서 발행일과 오늘 날짜가 일치하는지 확인
    if (settings.taxInvoiceSettings && settings.taxInvoiceSettings.length > 0) {
      settings.taxInvoiceSettings.forEach(setting => {
        if (setting.day && setting.companyName && parseInt(setting.day) === todayDay) {
          // 현재 알림 목록을 로컬 스토리지에서 직접 가져오기
          const currentNotifications = JSON.parse(localStorage.getItem('notifications') || '[]');
          
          // 이미 오늘 알림이 있는지 확인 (더 정확한 체크)
          const existingNotification = currentNotifications.find(notification => 
            notification.type === 'tax_invoice' &&
            notification.content.includes(setting.companyName) &&
            notification.content.includes(todayStr) &&
            notification.createdAt && 
            new Date(notification.createdAt).toDateString() === today.toDateString()
          );
          
          if (!existingNotification) {
            addNotification({
              title: '세금계산서 발행 알림',
              content: `${setting.companyName}는 오늘 (${todayStr}) 세금계산서 발행일입니다.`,
              type: 'tax_invoice',
            });
          }
        }
      });
    }
  };


  // 모달 열기/닫기
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  // 탭 변경
  const changeTab = (tabIndex) => setActiveTab(tabIndex);

  // 세금계산서 발행 알림 스케줄링 (단일 회사)
  const scheduleTaxInvoiceNotification = (day, companyName) => {
    if (day) {
      const today = new Date();
      const todayStr = today.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const company = companyName || '회사';
      addNotification({
        title: '세금계산서 발행 알림',
        content: `${company}는 오늘 (${todayStr}) 세금계산서 발행일입니다.`,
        type: 'tax_invoice',
      });
    }
  };

  // 세금계산서 발행 알림 스케줄링 (여러 회사)
  const scheduleMultipleTaxInvoiceNotifications = (taxInvoiceSettings) => {
    if (taxInvoiceSettings && taxInvoiceSettings.length > 0) {
      const today = new Date();
      const todayStr = today.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      taxInvoiceSettings.forEach(setting => {
        if (setting.day && setting.companyName) {
          addNotification({
            title: '세금계산서 발행 알림',
            content: `${setting.companyName}는 오늘 (${todayStr}) 세금계산서 발행일입니다.`,
            type: 'tax_invoice',
          });
        }
      });
    }
  };

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

  // 종료일 알림 스케줄링
  const scheduleEndDateNotification = (endDate, type, companyName) => {
    if (endDate) {
      const company = companyName || '회사';
      
      if (type === '7days') {
        addNotification({
          title: '기간 종료 알림 (7일전)',
          content: `${company}는 사용 기간 종료가 7일 남았습니다.`,
          type: 'end_date_7days',
        });
      } else if (type === 'today') {
        addNotification({
          title: '기간 종료 알림 (당일)',
          content: `${company}는 오늘 사용 기간이 종료되었습니다.`,
          type: 'end_date_today',
        });
      }
    }
  };


  const value = {
    // 상태
    notifications,
    isModalOpen,
    activeTab,
    notificationSettings,
    unreadCount,
    
    // 액션
    addNotification,
    addNotificationWithServerCheck,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateNotificationSettings,
    openModal,
    closeModal,
    changeTab,
    scheduleTaxInvoiceNotification,
    scheduleMultipleTaxInvoiceNotifications,
    scheduleEndDateNotification,
    
    // 세금계산서 설정 관리
    addTaxInvoiceSetting,
    updateTaxInvoiceSetting,
    removeTaxInvoiceSetting,
    
    // 중복 알림 정리
    cleanupDuplicateNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
