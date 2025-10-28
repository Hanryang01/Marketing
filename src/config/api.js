// API 설정
// 개발 환경: localhost:3003, 프로덕션 환경: 상대 경로 사용 (Nginx 프록시)
const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:3003').trim();

export const API_ENDPOINTS = {
  // 사용자 관련
  USERS: `${API_BASE_URL}/api/users`,
  USER_DETAIL: (id) => `${API_BASE_URL}/api/users/${id}`,
  USER_APPROVAL_HISTORY: (userId) => `${API_BASE_URL}/api/user-approval-history/${userId}`,
  
  // 승인 이력 관련
  COMPANY_HISTORY: `${API_BASE_URL}/api/company-history`,
  COMPANY_HISTORY_LIST: `${API_BASE_URL}/api/company-history-list`,
  HISTORY_USER: (userId) => `${API_BASE_URL}/api/history/user/${userId}`,
  HISTORY_USER_DETAIL: `${API_BASE_URL}/api/history/user/detail`,
  HISTORY_DELETE: (id) => `${API_BASE_URL}/api/history/user/${id}`,
  
  // 매출 관련
  REVENUE: `${API_BASE_URL}/api/revenue`,
  REVENUE_DETAIL: (id) => `${API_BASE_URL}/api/revenue/${id}`,
  
  // 대시보드 관련
  DASHBOARD_STATS: `${API_BASE_URL}/api/dashboard/stats`,
  DASHBOARD_ACTIVE_COMPANIES: `${API_BASE_URL}/api/dashboard/active-companies`,
  
  // 기타
  END_DATE_CHECK: `${API_BASE_URL}/api/users/end-date-check`,
  
  // 알림 관련 (서버 기반)
  NOTIFICATIONS: `${API_BASE_URL}/api/notifications`,
  NOTIFICATION_READ: (id) => `${API_BASE_URL}/api/notifications/${id}/read`,
  NOTIFICATION_DELETE: (id) => `${API_BASE_URL}/api/notifications/${id}`,
  CREATE_NOTIFICATIONS: `${API_BASE_URL}/api/create-notifications`,
  
  // 세금계산서 알림 설정 관련
  TAX_INVOICE_SETTINGS: `${API_BASE_URL}/api/tax-invoice-settings`,
  
  // 지출 관련
  EXPENSES: `${API_BASE_URL}/api/expenses`,
  EXPENSE_DETAIL: (id) => `${API_BASE_URL}/api/expenses/${id}`,
};

// API 호출 헬퍼 함수
export const apiCall = async (url, options = {}) => {
  
  // API_BASE_URL에서 공백 제거
  const cleanApiBaseUrl = API_BASE_URL.trim();
  
  let fullUrl;
  if (url.startsWith('http')) {
    fullUrl = url;
  } else if (url.startsWith('/api/')) {
    // 이미 /api/로 시작하는 경우 중복 방지 - /api/ 제거 후 처리
    const cleanUrl = url.replace(/^\/api/, '');
    fullUrl = `${cleanApiBaseUrl}/api${cleanUrl}`;
  } else {
    // /api/로 시작하지 않는 경우 추가
    fullUrl = `${cleanApiBaseUrl}/api${url}`;
  }
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };
  
  try {
    const response = await fetch(fullUrl, { ...defaultOptions, ...options });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

export default API_BASE_URL;
