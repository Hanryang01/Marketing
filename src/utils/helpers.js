// helpers.js - 공통 유틸리티 함수들

/**
 * 금액을 천 단위 구분자와 함께 포맷팅
 * @param {number|string} amount - 포맷팅할 금액
 * @returns {string} - 포맷팅된 금액 문자열
 */
export const formatAmount = (amount) => {
  if (!amount) return '';
  const numericValue = parseFloat(amount.toString().replace(/,/g, ''));
  return isNaN(numericValue) ? '' : numericValue.toLocaleString();
};

// formatDate 함수는 useCalendar.js로 이동됨
// import { formatDate } from '../hooks/useCalendar'; 로 사용
