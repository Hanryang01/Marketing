import { useCallback } from 'react';

/**
 * 승인 필드 관련 로직을 담당하는 커스텀 훅
 * @param {Object} editedUser - 현재 편집 중인 사용자 데이터
 * @param {Object} user - 원본 사용자 데이터
 * @param {Function} handleInputChange - 입력 변경 핸들러
 * @param {Function} handleDateInputChange - 날짜 입력 변경 핸들러
 * @param {Function} handleOpenCalendar - 달력 열기 핸들러
 * @param {Function} setEditedUser - 사용자 데이터 설정 함수
 * @param {boolean} isEditable - 편집 가능 여부
 * @returns {Object} 승인 필드 관련 함수들과 상태
 */
const useApprovalFields = (
  editedUser,
  user,
  handleInputChange,
  handleDateInputChange,
  handleOpenCalendar,
  setEditedUser,
  isEditable = true,
  activeTab = '전체'
) => {
  // 무료 사용자 여부 확인 (탈퇴 사용자도 포함)
  const isFreeUser = editedUser?.companyType === '무료 사용자' || editedUser?.companyType === '탈퇴 사용자';

  // 구독기간(결제 주기)이 월간/연간인지 확인 (종료일 자동계산 여부)
  // DB에서 subscriptionType이 '월간' 또는 '연간'인 경우에만 자동 계산 (사용자 요청으로 현재는 자동 계산 비활성화됨)
  const isAutoEndDate = editedUser?.subscriptionType === '월간' || editedUser?.subscriptionType === '연간';

  // 비활성화 스타일 반환
  const getDisabledStyle = useCallback((isDisabled) => {
    return isDisabled ? {
      backgroundColor: '#f5f5f5',
      color: '#666',
      cursor: 'not-allowed'
    } : {};
  }, []);

  // 시작일 기반으로 종료일 자동 계산
  const calculateEndDate = useCallback((startDateStr, subscriptionType) => {
    if (!startDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(startDateStr)) return '';

    const [year, month, day] = startDateStr.split('-').map(Number);
    const startDate = new Date(year, month - 1, day);

    if (isNaN(startDate.getTime())) return '';

    let endDate;
    if (subscriptionType === '월간') {
      endDate = new Date(year, month, day); // +1개월
    } else if (subscriptionType === '연간') {
      endDate = new Date(year + 1, month - 1, day); // +1년
    } else {
      return '';
    }

    const endYear = endDate.getFullYear();
    const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
    const endDay = String(endDate.getDate()).padStart(2, '0');
    return `${endYear}-${endMonth}-${endDay}`;
  }, []);

  // 달력 아이콘 클릭 핸들러
  const handleCalendarClick = useCallback((field, e) => {
    const currentCompanyType = editedUser?.companyType || user?.companyType;
    const isDisabled = currentCompanyType === '무료 사용자' || currentCompanyType === '탈퇴 사용자' || !isEditable || activeTab === '탈퇴';

    // 종료일 달력을 월간/연간일 때도 비활성화 하지 않음 (사용자 요청 5번)
    /*
    if (field === 'endDate' && isAutoEndDate) {
      return;
    }
    */

    if (isDisabled) {
      return;
    }

    const inputElement = e.target.previousElementSibling;
    const currentDate = editedUser?.[field] || user?.[field];
    handleOpenCalendar(field === 'startDate' ? 'start' : 'end', inputElement, currentDate);
  }, [editedUser, user, handleOpenCalendar, isEditable, activeTab]);

  // 달력 아이콘 스타일
  const getCalendarIconStyle = useCallback((field) => {
    const currentCompanyType = editedUser?.companyType || user?.companyType;
    const isDisabled = currentCompanyType === '무료 사용자' || currentCompanyType === '탈퇴 사용자' || !isEditable || activeTab === '탈퇴';

    // 종료일 달력 아이콘은 월간/연간일 때 활성화 (사용자 요청 5번)
    /*
    if (field === 'endDate' && isAutoEndDate) {
      return { opacity: 0.3, cursor: 'not-allowed' };
    }
    */

    return isDisabled ? { opacity: 0.3, cursor: 'not-allowed' } : {};
  }, [editedUser, user, isEditable, activeTab]);

  // 업체 형태 변경 핸들러
  const handleCompanyTypeChange = useCallback((value) => {
    handleInputChange('companyType', value);
  }, [handleInputChange]);

  // 요금제 변경 핸들러
  const handlePricingPlanChange = useCallback((value) => {
    handleInputChange('pricingPlan', value);
  }, [handleInputChange]);

  // 결제 주기 변경 핸들러 (UI: 전체/월간/연간/기타)
  const handleSubscriptionTypeChange = useCallback((value) => {
    setEditedUser(prev => {
      const updated = { ...prev, subscriptionType: value };

      /* 월간/연간 선택 시 시작일이 있으면 종료일 자동 계산 - 사용자 요청으로 제거
      if ((value === '월간' || value === '연간') && prev.startDate && /^\d{4}-\d{2}-\d{2}$/.test(prev.startDate)) {
        updated.endDate = calculateEndDate(prev.startDate, value);
      }
      */

      return updated;
    });
  }, [setEditedUser, calculateEndDate]);

  // 승인 상태 변경 핸들러
  const handleApprovalStatusChange = useCallback((value) => {
    handleInputChange('approvalStatus', value);
  }, [handleInputChange]);

  // 날짜 변경 핸들러
  const handleDateChange = useCallback((field, value) => {
    handleDateInputChange(field, value, setEditedUser);

    // 시작일이 변경되고 구독기간이 월간/연간이면 종료일 자동 계산
    if (field === 'startDate') {
      // 8자리 숫자를 YYYY-MM-DD로 변환
      let dateStr = value;
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length === 8) {
        dateStr = `${numericValue.substring(0, 4)}-${numericValue.substring(4, 6)}-${numericValue.substring(6, 8)}`;
      }

      /* 시작일이 변경되고 구독기간이 월간/연간이면 종료일 자동 계산 - 사용자 요청으로 제거
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        setEditedUser(prev => {
          if (prev.subscriptionType === '월간' || prev.subscriptionType === '연간') {
            return { ...prev, endDate: calculateEndDate(dateStr, prev.subscriptionType) };
          }
          return prev;
        });
      }
      */
    }
  }, [handleDateInputChange, setEditedUser, calculateEndDate]);

  return {
    isFreeUser,
    isAutoEndDate,
    getDisabledStyle,
    handleCalendarClick,
    getCalendarIconStyle,
    handleCompanyTypeChange,
    handlePricingPlanChange,
    handleSubscriptionTypeChange,
    handleApprovalStatusChange,
    handleDateChange
  };
};

export default useApprovalFields;
