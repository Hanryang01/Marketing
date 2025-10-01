// API 설정
// 개발 환경: localhost:3003, 프로덕션 환경: 상대 경로 사용 (Nginx 프록시)
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 
  (window.location.hostname === 'marketing.sihm.co.kr' ? '' : 'http://localhost:3003');

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
  
  // 매출 관련
  REVENUE: `${API_BASE_URL}/api/revenue`,
  REVENUE_DETAIL: (id) => `${API_BASE_URL}/api/revenue/${id}`,
  
  // 기타
  END_DATE_CHECK: `${API_BASE_URL}/api/users/end-date-check`,
};

// API 호출 헬퍼 함수
export const apiCall = async (url, options = {}) => {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };
  
  return fetch(fullUrl, { ...defaultOptions, ...options });
};

export default API_BASE_URL;
