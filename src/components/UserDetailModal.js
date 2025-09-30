import React, { useState } from 'react';
import './UserDetailModal.css';
import { useCalendar } from '../hooks/useCalendar';
import { handleBusinessLicenseInput, formatBusinessLicense, isValidBusinessLicense } from '../utils/businessLicenseUtils';

const UserDetailModal = ({ 
  isOpen, 
  user, 
  onClose, 
  onSave, 
  isEditable = true,
  showFooter = true,
  isApprovalMode = false,
  companyHistory = [],
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

  // 이력 관리 관련 상태
  const [userHistory, setUserHistory] = useState([]);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

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

  // JSX 최적화 함수들
  const renderInputField = (label, name, value, onChange, options = {}) => (
    <div className="form-group">
      <label>{label}</label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        readOnly={!isEditable}
        className={!isEditable ? 'readonly-input' : ''}
        {...options}
      />
    </div>
  );


  const renderDateField = (label, value, onChange, options = {}) => (
    <div className="form-group">
      <label>{label}</label>
      <div className="date-input-container">
        <input
          type="text"
          value={value}
          onChange={onChange}
          readOnly
          className="readonly-input"
          {...options}
        />
      </div>
    </div>
  );

  const renderFormRow = (leftField, rightField) => (
    <div className="form-row">
      {leftField}
      {rightField}
    </div>
  );


  // 모달이 열릴 때마다 사용자 데이터 복사
  React.useEffect(() => {
    
    // 모달이 열릴 때마다 editedUser 초기화 (취소 후 재진입 시에도 원본 데이터로 복원)
    if (isOpen && user) {
      // editedUser에 모든 필드를 포함하여 설정
      const userWithAdditionalFields = {
        ...user,
        // 모든 필드에 대해 기본값 설정
        userId: user.userId || user.user_id || '',
        representative: user.representative || '',
        industry: user.industry || '',
        accountantName: user.accountantName || user.accountant_name || '',
        accountantPosition: user.accountantPosition || user.accountant_position || '',
        accountantMobile: user.accountantMobile || user.accountant_mobile || '',
        accountantEmail: user.accountantEmail || user.accountant_email || '',
        startDate: user.startDate || user.start_date || '',
        endDate: user.endDate || user.end_date || '',
        accountInfo: user.accountInfo || user.account_info || '',
        department: user.department || '',
        mobilePhone: user.mobilePhone || user.mobile_phone || '',
        phoneNumber: user.phoneNumber || user.phone_number || '',
        faxNumber: user.faxNumber || user.fax_number || '',
        address: user.address || '',
        businessLicense: user.businessLicense || user.business_license || '',
        notes: user.notes || '',
        companyName: user.companyName || user.company_name || '',
        companyType: user.companyType || user.company_type || '무료 사용자',
        pricingPlan: user.pricingPlan || user.pricing_plan || '무료',
        approvalStatus: user.approvalStatus || user.approval_status || '승인 예정',
        isActive: user.isActive || user.is_active || 1,
        position: user.manager_position || '',
        msdsLimit: user.msdsLimit || user.msds_limit || 0,
        aiImageLimit: user.aiImageLimit || user.ai_image_limit || 0,
        aiReportLimit: user.aiReportLimit || user.ai_report_limit || 0
      };
      
      setEditedUser(userWithAdditionalFields);
      prevUserRef.current = user;
      
      // 승인 관리 모드일 때 이력 자동 로드
      if (isApprovalMode) {
        fetchUserHistory(user.userId || user.user_id);
      }
    }
  }, [isOpen, user, isApprovalMode]);

  // 강제 상태 업데이트를 위한 useEffect
  React.useEffect(() => {
    if (editedUser) {
          }
  }, [editedUser]);

  // startDate 변경 감지를 위한 useEffect
  React.useEffect(() => {
    if (editedUser?.startDate !== undefined) {
          }
  }, [editedUser]);

  // 승인 완료 상태에서 날짜 필드 보호
  React.useEffect(() => {
    if (editedUser?.approvalStatus === '승인 완료') {
                }
  }, [editedUser?.approvalStatus, editedUser?.companyType, editedUser?.startDate, editedUser?.endDate, isApprovalMode]);

  // 무료 사용자/탈퇴 사용자일 때 날짜 필드 강제 초기화 (승인 상태와 상관없이)
  React.useEffect(() => {
    if (editedUser && 
        (editedUser.companyType === '무료 사용자' || editedUser.companyType === '탈퇴 사용자')) {
      // 날짜 필드들이 비어있지 않다면 강제로 초기화
      if (editedUser.endDate || editedUser.startDate) {
        setEditedUser(prev => ({
          ...prev,
          endDate: '',
          startDate: ''
        }));
      }
    }
  }, [editedUser]);

  // 입력 필드 변경 처리
  const handleInputChange = (field, value) => {
        if (!editedUser) {
      return;
    }
    
    // 사업자 등록번호 특별 처리
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
      
    // 회계 담당자 필드 특별 처리 (스페이스 허용)
    if (field === 'accountantMobile' || field === 'accountantEmail') {
      const cleanValue = value === undefined || value === null ? '' : value.toString();
      setEditedUser(prev => ({
        ...prev,
        [field]: cleanValue
      }));
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
      
      // 사업자 등록번호 유효성 검사 (승인 관리 모드가 아닐 때만)
      if (!isApprovalMode && editedUser.businessLicense && !isValidBusinessLicense(editedUser.businessLicense)) {
        if (parentShowMessage) {
          parentShowMessage('error', '사업자 등록번호 오류', '사업자 등록번호는 숫자 10자리여야 합니다.', {
            showCancel: false,
            confirmText: '확인'
          });
        } else {
          alert('사업자 등록번호는 숫자 10자리여야 합니다.');
        }
        return;
      }
      
      // userId 필드 검증 및 수정
      const userId = editedUser.userId || editedUser.user_id || user?.userId || user?.user_id || '';
      
      if (!userId || userId.trim() === '') {
        alert('사용자 ID가 없습니다. 페이지를 새로고침해주세요.');
        return;
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
        business_license: editedUser.businessLicense,
        notes: editedUser.notes,
        account_info: editedUser.accountInfo || '',
        company_type: editedUser.companyType,
        approval_status: editedUser.approvalStatus,
        is_active: editedUser.isActive,
        pricing_plan: editedUser.pricingPlan,
        start_date: editedUser.startDate,
        end_date: editedUser.endDate,
        manager_position: editedUser.position || '',
        accountant_name: editedUser.accountantName,
        accountant_position: editedUser.accountantPosition,
        accountant_mobile: editedUser.accountantMobile || '',
        accountant_email: editedUser.accountantEmail,
        representative: editedUser.representative,
        industry: editedUser.industry,
        msds_limit: editedUser.msdsLimit,
        ai_image_limit: editedUser.aiImageLimit,
        ai_report_limit: editedUser.aiReportLimit
      };
      
      await onSave(serverData);
    }
  };

  // 현재 한국 날짜 가져오기

  // 달력에서 날짜 선택 (YYYY-MM-DD 형식으로 통일)
  const handleUserDateSelect = (field, value) => {
    // 달력에서 선택한 날짜는 YYYY-MM-DD 형식으로 직접 저장
    setEditedUser(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 사용자 이력 조회 - 승인 완료 이력만 표시 (승인 이력 탭과 동일)
  const fetchUserHistory = async (userId) => {
        try {
      const response = await fetch(`http://localhost:3003/api/company-history-list`);
      const result = await response.json();
      
      if (result.success) {
        // 해당 사용자의 승인 완료 이력만 필터링 (종료일 < 오늘, 승인 이력 탭과 동일)
        const userApprovalHistory = result.data.history.filter(history => {
          return history.user_id_string === userId && history.approval_status === '승인 완료' && history.end_date && new Date(history.end_date) < new Date();
        });
        
                setUserHistory(userApprovalHistory);
      } else {
        setUserHistory([]);
      }
    } catch (error) {
      setUserHistory([]);
    }
  };

  // 이력 삭제
  const handleDeleteHistory = async (historyId) => {
        // 통일된 메시지 팝업창으로 삭제 확인
    showMessage('warning', '이력 삭제', '이 이력을 삭제하시겠습니까?', '삭제', true, '취소');
    
    // 삭제 확인을 위한 상태 저장
    setPendingDeleteId(historyId);
  };

  // 실제 삭제 실행 함수
  const executeDelete = async (historyId) => {
        try {
      const response = await fetch(`http://localhost:3003/api/history/user/${historyId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        // 삭제 성공 후 이력 데이터 새로고침
        const userId = user?.userId || user?.user_id;
        if (userId) {
          await fetchUserHistory(userId);
        }
        // 삭제 성공 메시지 표시
        showMessage('success', '삭제 완료', '이력이 성공적으로 삭제되었습니다.', '확인', false);
      } else {
        showMessage('error', '삭제 실패', data.error, '확인', false);
      }
    } catch (error) {
      showMessage('error', '삭제 오류', '이력 삭제 중 오류가 발생했습니다.', '확인', false);
    }
  };

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
            // 삭제 확인인 경우 실제 삭제 실행
    if (pendingDeleteId && messageData.title === '이력 삭제') {
            executeDelete(pendingDeleteId);
      setPendingDeleteId(null);
    } else {
      // 삭제 성공/실패 메시지인 경우 메시지 창만 닫기
      setShowMessageModal(false);
    }
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
          <h2>{isApprovalMode ? '승인 관리' : '사용자 상세 정보'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {isApprovalMode ? (
            // 승인 관리 모드 - 기존 전체 사용자 승인 상태 팝업창과 동일한 필드들
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>사용자 ID</label>
                  <input
                    type="text"
                    value={editedUser?.userId || ''}
                    readOnly
                    className="readonly-input"
                  />
                </div>
                <div className="form-group">
                  <label>회사명</label>
                  <input
                    type="text"
                    value={editedUser?.companyName !== undefined ? editedUser.companyName : (user.companyName || '')}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>업체 형태</label>
                  <select
                    value={editedUser?.companyType || '무료 사용자'} 
                    onChange={(e) => handleInputChange('companyType', e.target.value)}
                  >
                    <option value="무료 사용자">무료 사용자</option>
                    <option value="컨설팅 업체">컨설팅 업체</option>
                    <option value="일반 업체">일반 업체</option>
                    <option value="탈퇴 사용자">탈퇴 사용자</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>요금제</label>
                  <select
                    value={editedUser?.pricingPlan || '무료'} 
                    onChange={(e) => handleInputChange('pricingPlan', e.target.value)}
                    disabled={editedUser?.companyType === '무료 사용자' || editedUser?.companyType === '탈퇴 사용자'}
                    style={(editedUser?.companyType === '무료 사용자' || editedUser?.companyType === '탈퇴 사용자') ? { backgroundColor: '#f5f5f5', color: '#666', cursor: 'not-allowed' } : {}}
                  >
                    <option value="무료">무료</option>
                    <option value="스탠다드">스탠다드</option>
                    <option value="프리미엄">프리미엄</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>시작일</label>
                  <div className="date-input-container">
                    <input
                      type="text"
                      value={editedUser?.startDate || ''}
                      onChange={(e) => {
                        handleDateInputChange('startDate', e.target.value, setEditedUser);
                      }}
                      onFocus={(e) => {
                        // startDate 포커스
                      }}
                      placeholder="YYYY-MM-DD"
                      maxLength="10"
                      disabled={editedUser?.companyType === '무료 사용자'}
                      style={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #ccc'
                      }}
                    />
                    <div 
                      className="calendar-icon" 
                      onClick={(e) => {
                        const currentCompanyType = editedUser?.companyType || user?.companyType;
                        if (currentCompanyType === '무료 사용자') {
                          return; // 무료 사용자일 때는 달력 클릭 무시
                        }
                        const inputElement = e.target.previousElementSibling;
                        const currentStartDate = editedUser?.startDate || user?.startDate;
                        handleOpenCalendar('start', inputElement, currentStartDate);
                      }}
                      style={(() => {
                        const currentCompanyType = editedUser?.companyType || user?.companyType;
                        const isDisabled = currentCompanyType === '무료 사용자';
                        return isDisabled ? { opacity: 0.3, cursor: 'not-allowed' } : {};
                      })()}
                    >
                      📅
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label>종료일</label>
                  <div className="date-input-container">
                    <input
                      type="text"
                      value={editedUser?.endDate || ''}
                      onChange={(e) => {
                        handleDateInputChange('endDate', e.target.value, setEditedUser);
                      }}
                      onFocus={(e) => {
                        // endDate 포커스
                      }}
                      placeholder="YYYY-MM-DD"
                      maxLength="10"
                      disabled={editedUser?.companyType === '무료 사용자'}
                      style={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #ccc'
                      }}
                    />
                    <div 
                      className="calendar-icon" 
                      onClick={(e) => {
                        const currentCompanyType = editedUser?.companyType || user?.companyType;
                        if (currentCompanyType === '무료 사용자') {
                          return; // 무료 사용자일 때는 달력 클릭 무시
                        }
                        const inputElement = e.target.previousElementSibling;
                        const currentEndDate = editedUser?.endDate || user?.endDate;
                        handleOpenCalendar('end', inputElement, currentEndDate);
                      }}
                      style={(() => {
                        const currentCompanyType = editedUser?.companyType || user?.companyType;
                        const isDisabled = currentCompanyType === '무료 사용자';
                        return isDisabled ? { opacity: 0.3, cursor: 'not-allowed' } : {};
                      })()}
                    >
                      📅
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>승인 상태</label>
                                     <select
                     value={editedUser?.approvalStatus || ''}
                     onChange={(e) => handleInputChange('approvalStatus', e.target.value)}
                     disabled={editedUser?.companyType === '무료 사용자'}
                     style={editedUser?.companyType === '무료 사용자' ? { backgroundColor: '#f5f5f5', color: '#666', cursor: 'not-allowed' } : {}}
                   >
                     <option value="승인 예정">승인 예정</option>
                     <option value="승인 완료">승인 완료</option>
                     <option value="탈퇴">탈퇴</option>
                   </select>
                </div>
              </div>

              {/* 승인 완료 이력 테이블 */}
              <div className="approval-history-section">
                <h3 className="section-title">승인 완료 이력</h3>
                <div className="history-table-container">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>상태</th>
                        <th>시작일</th>
                        <th>종료일</th>
                        <th>업체 형태</th>
                        <th>요금제</th>
                        <th>활성화 기간</th>
                        <th>삭제</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userHistory
                        .filter(history => {
                          // 승인 완료 이력만 표시 (종료일 < 오늘, 승인 이력 탭과 동일)
                          if (history.approval_status !== '승인 완료' || !history.end_date) return false;
                          
                          // 문자열 비교 사용 (YYYY-MM-DD 형식)
                          const today = new Date();
                          const todayString = today.toISOString().split('T')[0];
                          const endDateString = history.end_date.toString().split('T')[0];
                          
                          return endDateString < todayString;
                        })
                        .map((history, index) => (
                        <tr key={index}>
                          <td>
                            <span className="status-badge approved">
                              ✓ {history.status_type}
                            </span>
                          </td>
                          <td>{formatDate(history.start_date)}</td>
                          <td>{formatDate(history.end_date)}</td>
                          <td>{history.company_type || '-'}</td>
                          <td>{history.pricing_plan || '-'}</td>
                          <td>
                            {history.start_date && history.end_date ? 
                              `${Math.round((new Date(history.end_date) - new Date(history.start_date)) / (1000 * 60 * 60 * 24 * 30))}개월` : 
                              '-'
                            }
                          </td>
                          <td>
                            <button 
                              className="status-button delete-red"
                              onClick={() => {
                                                                                                                                // ID가 없으면 index를 사용
                                const deleteId = history.id || index;
                                handleDeleteHistory(deleteId);
                              }}
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                      {userHistory.filter(history => {
                        // approval_status가 '승인 완료'이고 종료일 < 오늘인 경우만 표시 (승인 이력 탭과 동일)
                        return history.approval_status === '승인 완료' && history.end_date && new Date(history.end_date) < new Date();
                      }).length === 0 && (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                            등록된 승인 완료 이력이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            // 일반 상세 정보 모드 - 요청하신 레이아웃으로 수정
            <>
              {/* 사용자 정보 섹션 */}
              <div className="form-section user-info-section">
                <h3 className="section-title">사용자 정보</h3>
                
                {renderFormRow(
                  renderInputField('사용자 ID', 'userId', editedUser?.userId || '', () => {}, { readOnly: true, className: 'readonly-input' }),
                  renderInputField('이름', 'userName', editedUser?.userName || '', (e) => handleInputChange('userName', e.target.value))
                )}
                
                {renderFormRow(
                  renderInputField('부서', 'department', editedUser?.department !== undefined ? editedUser.department : (user.department || ''), (e) => handleInputChange('department', e.target.value)),
                  renderInputField('직책', 'position', editedUser?.position !== undefined ? editedUser.position : (user.manager_position || ''), (e) => handleInputChange('position', e.target.value))
                )}
                
                {renderFormRow(
                  renderInputField('휴대전화', 'mobilePhone', editedUser?.mobilePhone || '', (e) => handleInputChange('mobilePhone', e.target.value)),
                  renderInputField('이메일', 'email', editedUser?.email !== undefined ? editedUser.email : (user.email || ''), (e) => handleInputChange('email', e.target.value), { type: 'email' })
                )}
              </div>

              {/* 승인 정보 섹션 */}
              <div className="form-section approval-info-section">
                <h3 className="section-title">승인 정보</h3>
                
                {renderFormRow(
                  renderDateField('시작일', formatDate(editedUser?.startDate || user.startDate || user.start_date || '')),
                  renderDateField('종료일', formatDate(editedUser?.endDate || user.endDate || user.end_date || ''))
                )}
                
                {renderFormRow(
                  renderInputField('업체 형태', 'companyType', editedUser?.companyType || '무료 사용자', () => {}, { readOnly: true, className: 'readonly-input' }),
                  renderInputField('요금제', 'pricingPlan', editedUser?.pricingPlan || '무료', () => {}, { readOnly: true, className: 'readonly-input' })
                )}
                
                {renderFormRow(
                  renderInputField('승인 상태', 'approvalStatus', editedUser?.approvalStatus || '승인 예정', () => {}, { readOnly: true, className: 'readonly-input' }),
                  <div className="form-group"><label></label><div></div></div>
                )}
              </div>

              {/* 사용량 정보 섹션 */}
              <div className="form-section usage-info-section">
                <h3 className="section-title">사용량 정보</h3>
                
                {renderFormRow(
                  renderInputField('MSDS', 'msdsLimit', editedUser?.msdsLimit || 0, () => {}, { readOnly: true, className: 'readonly-input' }),
                  renderInputField('영상분석', 'aiImageLimit', editedUser?.aiImageLimit || 0, () => {}, { readOnly: true, className: 'readonly-input' })
                )}
                
                <div className="form-row">
                  <div className="form-group">
                    <label>AI 보고서</label>
                    <input 
                      type="text" 
                      value={editedUser?.aiReportLimit || 0} 
                      readOnly 
                      className="readonly-input"
                    />
                  </div>
                  <div className="form-group">
                    <label></label>
                    <div></div>
                  </div>
                </div>
              </div>

              {/* 회사 정보 섹션 */}
              <div className="form-section company-info-section">
                <h3 className="section-title">회사 정보</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>회사명</label>
                    <input 
                      type="text" 
                      value={editedUser?.companyName || ''} 
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      readOnly={!isEditable}
                      className={!isEditable ? 'readonly-input' : ''}
                    />
                  </div>
                                                       <div className="form-group">
                    <label>대표자</label>
                    <input 
                      type="text" 
                      value={editedUser?.representative !== undefined ? editedUser.representative : (user.representative || '')} 
                      onChange={(e) => handleInputChange('representative', e.target.value)}
                      readOnly={!isEditable}
                      className={!isEditable ? 'readonly-input' : ''}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>사업자 등록 번호</label>
                    <input 
                      type="text" 
                      value={formatBusinessLicense(editedUser?.businessLicense || '')} 
                      onChange={(e) => handleInputChange('businessLicense', e.target.value)}
                      readOnly={!isEditable}
                      className={!isEditable ? 'readonly-input' : ''}
                      maxLength="12"
                    />
                  </div>
                                                       <div className="form-group">
                    <label>업종</label>
                    <input 
                      type="text" 
                      value={editedUser?.industry !== undefined ? editedUser.industry : (user.industry || '')} 
                      onChange={(e) => handleInputChange('industry', e.target.value)}
                      readOnly={!isEditable}
                      className={!isEditable ? 'readonly-input' : ''}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>전화번호</label>
                    <input 
                      type="text" 
                      value={editedUser?.phoneNumber !== undefined ? editedUser.phoneNumber : (user.phoneNumber || '')} 
                      onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      readOnly={!isEditable}
                      className={!isEditable ? 'readonly-input' : ''}
                    />
                  </div>
                  <div className="form-group">
                    <label>팩스번호</label>
                    <input 
                      type="text" 
                      value={editedUser?.faxNumber !== undefined ? editedUser.faxNumber : (user.faxNumber || '')} 
                      onChange={(e) => handleInputChange('faxNumber', e.target.value)}
                      readOnly={!isEditable}
                      className={!isEditable ? 'readonly-input' : ''}
                    />
                  </div>
                </div>
                
                <div className="form-row-single">
                  <div className="form-group">
                    <label>주소</label>
                    <input 
                      type="text" 
                      value={editedUser?.address !== undefined ? editedUser.address : (user.address || '')} 
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      readOnly={!isEditable}
                      className={!isEditable ? 'readonly-input' : ''}
                    />
                  </div>
                </div>
                
                <div className="form-row-single">
                  <div className="form-group">
                    <label>계좌 정보</label>
                    <input 
                      type="text" 
                      value={editedUser?.accountInfo !== undefined ? editedUser.accountInfo : (user.accountInfo || user.account_info || '')} 
                      onChange={(e) => handleInputChange('accountInfo', e.target.value)}
                      readOnly={!isEditable}
                      className={!isEditable ? 'readonly-input' : ''}
                    />
                  </div>
                </div>
                
                <div className="form-row-single">
                  <div className="form-group">
                    <label>메모</label>
                    <input 
                      type="text" 
                      value={editedUser?.notes !== undefined ? editedUser.notes : (user.notes || '')} 
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      readOnly={!isEditable}
                      className={!isEditable ? 'readonly-input' : ''}
                    />
                  </div>
                </div>
              </div>

              {/* 회계 담당자 정보 섹션 */}
              <div className="form-section accountant-info-section">
                <h3 className="section-title">회계 담당자 정보</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>이름</label>
                    <input 
                      type="text" 
                      value={editedUser?.accountantName !== undefined ? editedUser.accountantName : (user.accountantName || user.accountant_name || '')} 
                      onChange={(e) => handleInputChange('accountantName', e.target.value)}
                      readOnly={!isEditable}
                      className={!isEditable ? 'readonly-input' : ''}
                    />
                  </div>
                  <div className="form-group">
                    <label>직책</label>
                    <input 
                      type="text" 
                      value={editedUser?.accountantPosition !== undefined ? editedUser.accountantPosition : (user.accountantPosition || user.accountant_position || '')} 
                      onChange={(e) => handleInputChange('accountantPosition', e.target.value)}
                      readOnly={!isEditable}
                      className={!isEditable ? 'readonly-input' : ''}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>휴대전화</label>
                    <input 
                      type="text" 
                      value={editedUser?.accountantMobile !== undefined ? editedUser.accountantMobile : (user.accountantMobile || user.accountant_mobile || '')} 
                      onChange={(e) => handleInputChange('accountantMobile', e.target.value)}
                      readOnly={!isEditable}
                      className={!isEditable ? 'readonly-input' : ''}
                      maxLength="20"
                    />
                  </div>
                  <div className="form-group">
                    <label>이메일</label>
                    <input 
                      type="text" 
                      value={editedUser?.accountantEmail !== undefined ? editedUser.accountantEmail : (user.accountantEmail || user.accountant_email || '')} 
                      onChange={(e) => handleInputChange('accountantEmail', e.target.value)}
                      readOnly={!isEditable}
                      className={!isEditable ? 'readonly-input' : ''}
                      maxLength="100"
                    />
                  </div>
                </div>
                             </div>
             </>
          )}
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
      {/* 시작일 달력 팝업창 */}
      {showStartDatePicker && (
        <div className="date-picker-overlay" onClick={() => setShowStartDatePicker(false)}>
          <div 
            className="date-picker" 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: `${calendarPosition.top}px`,
              left: `${calendarPosition.left}px`,
              zIndex: 9999
            }}
          >
            <div className="date-picker-header">
              <button className="today-button" onClick={() => goToToday('start')}>오늘</button>
              <button className="close-button" onClick={() => setShowStartDatePicker(false)}>×</button>
            </div>
            <div className="date-picker-body">
              <div className="calendar-grid">
                <div className="calendar-header">
                  <button onClick={() => handleMonthChange('start', -1)}>&lt;</button>
                  <span>{getCurrentMonthYear('start')}</span>
                  <button onClick={() => handleMonthChange('start', 1)}>&gt;</button>
                </div>
                <div className="calendar-weekdays">
                  <div>일</div>
                  <div>월</div>
                  <div>화</div>
                  <div>수</div>
                  <div>목</div>
                  <div>금</div>
                  <div>토</div>
                </div>
                <div className="calendar-days">
                  {getCalendarDays('start', editedUser?.startDate || user?.startDate).map((day, index) => (
                    <div
                      key={index}
                      className={`calendar-day ${day.isCurrentMonth ? '' : 'other-month'} ${day.isToday ? 'today' : ''} ${day.isSelected ? 'selected' : ''}`}
                      onClick={() => day.isCurrentMonth && handleDateSelect(day.date, 'start', handleUserDateSelect)}
                    >
                      {day.day}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 종료일 달력 팝업창 */}
      {showEndDatePicker && (
        <div className="date-picker-overlay" onClick={() => setShowEndDatePicker(false)}>
          <div 
            className="date-picker" 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: `${calendarPosition.top}px`,
              left: `${calendarPosition.left}px`,
              zIndex: 9999
            }}
          >
            <div className="date-picker-header">
              <button className="today-button" onClick={() => goToToday('end')}>오늘</button>
              <button className="close-button" onClick={() => setShowEndDatePicker(false)}>×</button>
            </div>
            <div className="date-picker-body">
              <div className="calendar-grid">
                <div className="calendar-header">
                  <button onClick={() => handleMonthChange('end', -1)}>&lt;</button>
                  <span>{getCurrentMonthYear('end')}</span>
                  <button onClick={() => handleMonthChange('end', 1)}>&gt;</button>
                </div>
                <div className="calendar-weekdays">
                  <div>일</div>
                  <div>월</div>
                  <div>화</div>
                  <div>수</div>
                  <div>목</div>
                  <div>금</div>
                  <div>토</div>
                </div>
                <div className="calendar-days">
                  {getCalendarDays('end', editedUser?.endDate || user?.endDate).map((day, index) => (
                    <div
                      key={index}
                      className={`calendar-day ${day.isCurrentMonth ? '' : 'other-month'} ${day.isToday ? 'today' : ''} ${day.isSelected ? 'selected' : ''}`}
                      onClick={() => day.isCurrentMonth && handleDateSelect(day.date, 'end', handleUserDateSelect)}
                    >
                      {day.day}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
