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

  // 비활성화 스타일 반환
  const getDisabledStyle = useCallback((isDisabled) => {
    return isDisabled ? { 
      backgroundColor: '#f5f5f5', 
      color: '#666', 
      cursor: 'not-allowed' 
    } : {};
  }, []);

  // 달력 아이콘 클릭 핸들러
  const handleCalendarClick = useCallback((field, e) => {
    const currentCompanyType = editedUser?.companyType || user?.companyType;
    const isDisabled = currentCompanyType === '무료 사용자' || currentCompanyType === '탈퇴 사용자' || !isEditable || activeTab === '탈퇴';
    
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

  // 승인 상태 변경 핸들러
  const handleApprovalStatusChange = useCallback((value) => {
    handleInputChange('approvalStatus', value);
  }, [handleInputChange]);

  // 날짜 변경 핸들러
  const handleDateChange = useCallback((field, value) => {
    handleDateInputChange(field, value, setEditedUser);
  }, [handleDateInputChange, setEditedUser]);

  return {
    isFreeUser,
    getDisabledStyle,
    handleCalendarClick,
    getCalendarIconStyle,
    handleCompanyTypeChange,
    handlePricingPlanChange,
    handleApprovalStatusChange,
    handleDateChange
  };
};

export default useApprovalFields;
