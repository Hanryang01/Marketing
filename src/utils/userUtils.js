// 사용자 관련 유틸리티 함수들

/**
 * 사용자가 활성화 상태인지 확인하는 함수
 * 조건: 시작일 <= 기준일자 <= 종료일, 무료 요금제 제외
 * @param {Object} user - 사용자 객체
 * @param {string} user.startDate - 시작일 (YYYY-MM-DD 형식)
 * @param {string} user.endDate - 종료일 (YYYY-MM-DD 형식)
 * @param {string} user.pricingPlan - 요금제
 * @param {string} user.approvalStatus - 승인 상태
 * @param {string} user.companyType - 회사 유형
 * @param {Date} targetDate - 기준일자 (기본값: 오늘)
 * @returns {boolean} 활성화 여부
 */
export const isUserActive = (user, targetDate = new Date()) => {
  // 승인 완료 상태가 아니면 비활성화
  if (user.approvalStatus !== '승인 완료') {
    return false;
  }
  
  // 무료 요금제도 포함 (승인 완료된 무료 요금제 업체도 활성화된 것으로 간주)
  
  // 컨설팅 업체, 일반 업체만 활성화 대상
  if (!['컨설팅 업체', '일반 업체'].includes(user.companyType)) {
    return false;
  }
  
  // 날짜 비교를 위한 준비
  const targetDateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  
  // 시작일 체크: 시작일이 없거나 시작일 <= 기준일자
  if (user.startDate) {
    const startDate = new Date(user.startDate);
    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    if (startDateOnly > targetDateOnly) {
      return false;
    }
  }
  
  // 종료일 체크: 종료일이 없거나 기준일자 <= 종료일
  if (user.endDate) {
    const endDate = new Date(user.endDate);
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    if (targetDateOnly > endDateOnly) {
      return false;
    }
  }
  
  return true;
};

/**
 * 특정 월말일자 기준으로 사용자가 활성화 상태인지 확인하는 함수
 * @param {Object} user - 사용자 객체
 * @param {number} year - 연도
 * @param {number} month - 월 (1-12)
 * @returns {boolean} 활성화 여부
 */
export const isUserActiveAtMonthEnd = (user, year, month) => {
  // 해당 월의 마지막 날짜 계산
  const monthEnd = new Date(year, month, 0); // month는 0-based이므로 month+1의 0일 = 이전 달의 마지막 날
  return isUserActive(user, monthEnd);
};
