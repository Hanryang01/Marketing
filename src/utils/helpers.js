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

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷팅
 * @param {string|number} dateValue - 포맷팅할 날짜
 * @returns {string} - 포맷팅된 날짜 문자열
 */
export const formatDate = (dateValue) => {
  if (!dateValue) return '-';
  
  try {
    if (typeof dateValue === 'number' && dateValue.toString().length === 8) {
      const dateStr = dateValue.toString();
      return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    } 
    else if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    } 
    else {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return dateValue;
      return date.toISOString().split('T')[0];
    }
  } catch (error) {
    console.error("Error formatting date:", dateValue, error);
    return dateValue;
  }
};
