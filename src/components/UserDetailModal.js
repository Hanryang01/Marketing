import React, { useState } from 'react';
import './UserDetailModal.css';
import { useCalendar } from '../hooks/useCalendar';
import { handleBusinessLicenseInput, isValidBusinessLicense } from '../utils/businessLicenseUtils';
import DatePicker from './DatePicker';
import DetailModeView from './UserDetailModal/DetailModeView';

const UserDetailModal = ({ 
  isOpen, 
  user, 
  onClose, 
  onSave,
  isEditable = true,
  showFooter = true,
  showMessage: parentShowMessage
}) => {
  const [editedUser, setEditedUser] = useState(null);
  const prevUserRef = React.useRef(null);
  
  // useCalendar 훅 사용
  const {
    showStartDatePicker,
    setShowStartDatePicker,
    showEndDatePicker,
    setShowEndDatePicker,
    calendarPosition,
    handleOpenCalendar,
    handleDateSelect,
    handleMonthChange,
    getCurrentMonthYear,
    getCalendarDays,
    goToToday,
    handleDateInputChange,
    formatDate
  } = useCalendar();

  // 이력 관리 관련 상태는 현재 사용되지 않음

  // 통일된 메시지 팝업창 상태
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageData, setMessageData] = useState({
    type: 'success',
    title: '',
    content: '',
    confirmText: '확인',
    showCancel: false,
    cancelText: '취소'
  });

  // 필드 값 처리 유틸리티 함수
  const getFieldValue = (fieldName) => {
    const editedValue = editedUser?.[fieldName];
    
    // editedUser에 값이 있으면 그것을 사용 (null도 포함)
    if (editedValue !== undefined) {
      return editedValue || '';
    }
    
    // user 객체에서 다양한 필드명으로 시도
    // 1. 원본 필드명
    // 2. 소문자 변환
    // 3. camelCase를 snake_case로 변환
    // 4. snake_case를 camelCase로 변환
    const userValue = user?.[fieldName] || 
                     user?.[fieldName.toLowerCase()] || 
                     user?.[fieldName.replace(/([A-Z])/g, '_$1').toLowerCase()] ||
                     user?.[fieldName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')] ||
                     user?.[fieldName.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase())];
    
    // user 값 사용 (null, undefined 모두 빈 문자열로 변환)
    return userValue || '';
  };

  // input 속성 공통 함수
  const getInputProps = (isReadOnly = false) => ({
    readOnly: !isEditable || isReadOnly,
    className: (!isEditable || isReadOnly) ? 'readonly-input' : ''
  });



  // 모달이 열릴 때마다 사용자 데이터 복사
  React.useEffect(() => {
    
    // 모달이 열릴 때마다 editedUser 초기화 (취소 후 재진입 시에도 원본 데이터로 복원)
    if (isOpen && user && user.id) {
      // editedUser에 모든 필드를 포함하여 설정
      const userWithAdditionalFields = {
        ...user,
        // 모든 필드에 대해 기본값 설정 (camelCase 우선)
        userId: user?.userId || user?.user_id || '',
        userName: user?.userName || user?.user_name || '',
        email: user?.email || '',
        representative: user?.representative || '',
        industry: user?.industry || '',
        accountantName: user?.accountantName || user?.accountant_name || '',
        accountantPosition: user?.accountantPosition || user?.accountant_position || '',
        accountantMobile: user?.accountantMobile || user?.accountant_mobile || '',
        accountantEmail: user?.accountantEmail || user?.accountant_email || '',
        startDate: formatDate(user?.startDate || user?.start_date) || '',
        endDate: formatDate(user?.endDate || user?.end_date) || '',
        accountInfo: user?.accountInfo || user?.account_info || '',
        department: user?.department || '',
        mobilePhone: user?.mobilePhone || user?.mobile_phone || '',
        phoneNumber: user?.phoneNumber || user?.phone_number || '',
        faxNumber: user?.faxNumber || user?.fax_number || '',
        address: user?.address || '',
        businessLicense: user?.businessLicense || user?.business_license || '',
        notes: user?.notes || '',
        companyName: user?.companyName || user?.company_name || '',
        companyType: user?.companyType || user?.company_type || '무료 사용자',
        pricingPlan: user?.pricingPlan || user?.pricing_plan || '무료',
        approvalStatus: user?.approvalStatus || user?.approval_status || '승인 예정',
        isActive: user?.isActive ?? user?.is_active ?? 1,
        position: user?.position || user?.manager_position || '',
        msdsLimit: user?.msdsLimit || user?.msds_limit || 0,
        aiImageLimit: user?.aiImageLimit || user?.ai_image_limit || 0,
        aiReportLimit: user?.aiReportLimit || user?.ai_report_limit || 0
      };
      
      setEditedUser(userWithAdditionalFields);
      prevUserRef.current = user;
    }
  }, [isOpen, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 사용자 상태 변경 감지 (현재는 사용되지 않음 - 향후 필요시 구현)

  // 입력 필드 변경 처리
  const handleInputChange = (field, value) => {
        if (!editedUser) {
      return;
    }
    
    // 사업자등록번호 특별 처리
    if (field === 'businessLicense') {
      const processedValue = handleBusinessLicenseInput(value);
      setEditedUser(prev => ({
        ...prev,
        [field]: processedValue
      }));
      return;
    }
    
    if (field === 'companyType') {
      setEditedUser(prev => {
        const updatedUser = {
          ...prev,
          [field]: value
        };

        // 일반 업체, 컨설팅 업체, 또는 탈퇴 사용자에서 무료 사용자로 변경하는 경우
        if (value === '무료 사용자' && (prev.companyType === '일반 업체' || prev.companyType === '컨설팅 업체' || prev.companyType === '탈퇴 사용자')) {
                    updatedUser.pricingPlan = '무료';
          updatedUser.startDate = '';
          updatedUser.endDate = '';
          updatedUser.approvalStatus = '승인 예정';
        }

        // 탈퇴 사용자로 변경하는 경우
        if (value === '탈퇴 사용자') {
                    updatedUser.pricingPlan = '무료';
          updatedUser.startDate = '';
          updatedUser.endDate = '';
          // 승인 상태는 변경하지 않음 (사용자가 직접 설정할 수 있도록)
        }

        return updatedUser;
      });
      return;
    }
      
    // 날짜 필드 특별 처리 (useCalendar 훅 사용)
    if (field === 'startDate' || field === 'endDate') {
      handleDateInputChange(field, value, setEditedUser);
      return;
    }
      
      
    // 일반 필드 처리 - 빈 문자열도 허용
    const cleanValue = value === undefined || value === null ? '' : value.toString();
    setEditedUser(prev => ({
      ...prev,
      [field]: cleanValue
    }));
  };


  // 저장 처리
  const handleSave = async () => {
    if (onSave && editedUser) {
      
      // 탈퇴 사용자 일관성 검증
      if (editedUser.companyType === '탈퇴 사용자' && editedUser.approvalStatus !== '탈퇴') {
        showMessage('error', '일관성 오류', '탈퇴 사용자는 승인 상태가 "탈퇴"여야 합니다.', '확인', false);
        return;
      }
      
      if (editedUser.approvalStatus === '탈퇴' && editedUser.companyType !== '탈퇴 사용자') {
        showMessage('error', '일관성 오류', '승인 상태가 "탈퇴"인 사용자는 업체 형태가 "탈퇴 사용자"여야 합니다.', '확인', false);
        return;
      }
      
      // 사업자등록번호 유효성 검사
      if (editedUser.businessLicense && !isValidBusinessLicense(editedUser.businessLicense)) {
        showMessage('error', '사업자등록번호 오류', '사업자등록번호는 숫자 10자리여야 합니다.', '확인', false);
        return;
      }
      
      // userId 필드 검증 및 수정
      const userId = editedUser?.userId || user?.userId || '';
      
      if (!userId || userId.trim() === '') {
        alert('사용자 ID가 없습니다. 페이지를 새로고침해주세요.');
        return;
      }
      
      // 승인 상태 변경 감지 (백엔드에서 처리)
      const isApprovalStatusChanged = user?.approvalStatus !== editedUser?.approvalStatus;
      const isChangedToApproved = editedUser?.approvalStatus === '승인 완료';
      
      if (isApprovalStatusChanged && isChangedToApproved) {
        console.log('승인 상태가 승인 완료로 변경됨 - 백엔드에서 이력 생성 처리');
      }
      
      // 서버가 기대하는 snake_case 필드명으로 변환
      const serverData = {
        id: editedUser.id,
        company_name: editedUser.companyName,
        user_id: userId,
        email: editedUser.email,
        user_name: editedUser.userName,
        department: editedUser.department || '',
        mobile_phone: editedUser.mobilePhone,
        phone_number: editedUser.phoneNumber,
        fax_number: editedUser.faxNumber,
        address: editedUser.address,
        business_license: editedUser.businessLicense || '',
        notes: editedUser.notes || '',
        account_info: editedUser.accountInfo || '',
        company_type: editedUser.companyType,
        approval_status: editedUser.approvalStatus,
        is_active: editedUser.isActive,
        pricing_plan: editedUser.pricingPlan,
        start_date: editedUser.startDate,
        end_date: editedUser.endDate,
        manager_position: editedUser.position || '',
        accountant_name: editedUser.accountantName || '',
        accountant_position: editedUser.accountantPosition || '',
        accountant_mobile: editedUser.accountantMobile || '',
        accountant_email: editedUser.accountantEmail || '',
        representative: editedUser.representative || '',
        industry: editedUser.industry || '',
        msds_limit: editedUser.msdsLimit,
        ai_image_limit: editedUser.aiImageLimit,
        ai_report_limit: editedUser.aiReportLimit
      };
      
      await onSave(serverData);
      
      // 승인 상태 변경 시 특별 메시지 표시
      if (isApprovalStatusChanged && isChangedToApproved) {
        showMessage('success', '승인 완료', '사용자 승인이 완료되었습니다. 이력이 자동으로 생성되었습니다.', '확인', false);
      }
      
      // 사용자 정보 저장 후 승인 이력 새로고침
      window.dispatchEvent(new CustomEvent('userUpdated'));
    }
  };

  // 현재 한국 날짜 가져오기 (사용되지 않음)

  // 달력에서 날짜 선택 (YYYY-MM-DD 형식으로 통일)
  const handleUserDateSelect = (field, value) => {
    // 달력에서 선택한 날짜는 YYYY-MM-DD 형식으로 직접 저장
    setEditedUser(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 사용자 이력 조회 (현재 사용되지 않음 - 향후 필요시 구현)


  // 메시지 팝업창 표시 함수
  const showMessage = (type, title, content, confirmText = '확인', showCancel = false, cancelText = '취소') => {
    setMessageData({
      type,
      title,
      content,
      confirmText,
      showCancel,
      cancelText
    });
    setShowMessageModal(true);
  };

  // 메시지 팝업창 확인 버튼 클릭 처리
  const handleMessageConfirm = () => {
    // 현재는 이력 삭제 기능이 사용되지 않으므로 메시지 창만 닫기
    setShowMessageModal(false);
  };

  // 메시지 팝업창 취소 버튼 클릭 처리
  const handleMessageCancel = () => {
        setShowMessageModal(false);
  };

  // 모달이 열려있지 않으면 렌더링하지 않음
  if (!isOpen || !user) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>사용자 상세 정보</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <DetailModeView
            editedUser={editedUser}
            user={user}
            handleInputChange={handleInputChange}
            getFieldValue={getFieldValue}
            getInputProps={getInputProps}
            isEditable={isEditable}
            formatDate={formatDate}
            handleDateInputChange={handleDateInputChange}
            handleOpenCalendar={handleOpenCalendar}
            showMessage={showMessage}
            onUserUpdate={onSave}
            setEditedUser={setEditedUser}
          />
        </div>
        
        {/* 푸터 (선택적) */}
        {showFooter && (
          <div className="modal-footer">
            <div className="button-group">
              <button className="cancel-button" onClick={onClose}>
                취소
              </button>
              {isEditable && (
                <button className="submit-button" onClick={handleSave}>
                  저장
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 달력 팝업창들 */}
      <DatePicker
        isOpen={showStartDatePicker}
        onClose={() => setShowStartDatePicker(false)}
        onDateSelect={handleUserDateSelect}
        selectedDate={editedUser?.startDate || user?.startDate}
        type="start"
        calendarPosition={calendarPosition}
        showStartDatePicker={showStartDatePicker}
        showEndDatePicker={showEndDatePicker}
        setShowStartDatePicker={setShowStartDatePicker}
        setShowEndDatePicker={setShowEndDatePicker}
        handleOpenCalendar={handleOpenCalendar}
        handleDateSelect={handleDateSelect}
        handleMonthChange={handleMonthChange}
        getCurrentMonthYear={getCurrentMonthYear}
        getCalendarDays={getCalendarDays}
        goToToday={goToToday}
        editedUser={editedUser}
        user={user}
      />

      <DatePicker
        isOpen={showEndDatePicker}
        onClose={() => setShowEndDatePicker(false)}
        onDateSelect={handleUserDateSelect}
        selectedDate={editedUser?.endDate || user?.endDate}
        type="end"
        calendarPosition={calendarPosition}
        showStartDatePicker={showStartDatePicker}
        showEndDatePicker={showEndDatePicker}
        setShowStartDatePicker={setShowStartDatePicker}
        setShowEndDatePicker={setShowEndDatePicker}
        handleOpenCalendar={handleOpenCalendar}
        handleDateSelect={handleDateSelect}
        handleMonthChange={handleMonthChange}
        getCurrentMonthYear={getCurrentMonthYear}
        getCalendarDays={getCalendarDays}
        goToToday={goToToday}
        editedUser={editedUser}
        user={user}
      />

      {/* 통일된 메시지 팝업창 */}
      {showMessageModal && (
        <div 
          className="message-modal-overlay"
        >
          <div 
            className="message-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`message-icon ${messageData.type}`}>
              {messageData.type === 'success' && '✓'}
              {messageData.type === 'error' && '✕'}
              {messageData.type === 'warning' && '⚠'}
              {messageData.type === 'info' && 'ℹ'}
            </div>
            <div className="message-title">{messageData.title}</div>
            <div className="message-content">{messageData.content}</div>
            <div className="message-buttons">
              {messageData.showCancel && (
                <button 
                  className="message-button cancel"
                  onClick={handleMessageCancel}
                >
                  {messageData.cancelText}
                </button>
              )}
              <button 
                className={`message-button ${messageData.type === 'error' ? 'delete' : 'confirm'}`}
                onClick={handleMessageConfirm}
              >
                {messageData.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDetailModal;
