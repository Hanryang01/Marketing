import React from 'react';
import { handleBusinessLicenseInput, formatBusinessLicense, isValidBusinessLicense } from '../utils/businessLicenseUtils';

const AddUserModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  newUser, 
  setNewUser,
  showMessage 
}) => {
  if (!isOpen) return null;

  // 새 사용자 입력 처리
  const handleInputChange = (field, value) => {
    // 사업자 등록번호 특별 처리
    if (field === 'businessLicense') {
      const processedValue = handleBusinessLicenseInput(value);
      setNewUser(prev => ({
        ...prev,
        [field]: processedValue
      }));
      return;
    }
    
    // 빈 문자열도 허용하도록 처리
    const cleanValue = value === undefined || value === null ? '' : String(value);
    setNewUser(prev => ({
      ...prev,
      [field]: cleanValue
    }));
  };

  // 저장 전 검증
  const handleSave = () => {
    // 필수 필드 검증
    if (!newUser.userId || !newUser.userId.trim()) {
      if (showMessage) {
        showMessage('error', '필수 입력 항목 누락', '사용자 ID는 필수 입력 항목입니다.', {
          showCancel: false,
          confirmText: '확인'
        });
      } else {
        alert('사용자 ID는 필수 입력 항목입니다.');
      }
      return;
    }

    // 사업자 등록번호 유효성 검사
    if (newUser.businessLicense && !isValidBusinessLicense(newUser.businessLicense)) {
      if (showMessage) {
        showMessage('error', '사업자 등록번호 오류', '사업자 등록번호는 숫자 10자리여야 합니다.', {
          showCancel: false,
          confirmText: '확인'
        });
      } else {
        alert('사업자 등록번호는 숫자 10자리여야 합니다.');
      }
      return;
    }
    
    // 저장 실행
    onSave(newUser);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>사용자 추가</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>사용자 ID<span className="required-asterisk">*</span></label>
              <input
                type="text"
                value={newUser.userId || ''}
                onChange={(e) => handleInputChange('userId', e.target.value)}
                placeholder="사용자 ID"
                required
              />
            </div>
            <div className="form-group">
              <label>이름</label>
              <input
                type="text"
                value={newUser.userName || ''}
                onChange={(e) => handleInputChange('userName', e.target.value)}
                placeholder="이름"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>직책</label>
              <input
                type="text"
                value={newUser.position || ''}
                onChange={(e) => handleInputChange('position', e.target.value)}
                placeholder="직책"
              />
            </div>
            <div className="form-group">
              <label>부서</label>
              <input
                type="text"
                value={newUser.department || ''}
                onChange={(e) => handleInputChange('department', e.target.value)}
                placeholder="부서"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>이메일</label>
              <input
                type="email"
                value={newUser.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="이메일"
              />
            </div>
            <div className="form-group">
              <label>휴대전화</label>
              <input
                type="text"
                value={newUser.mobilePhone || ''}
                onChange={(e) => handleInputChange('mobilePhone', e.target.value)}
                placeholder="휴대전화"
              />
            </div>
          </div>

          
          <div className="form-row">
            <div className="form-group">
              <label>회사명</label>
              <input
                type="text"
                value={newUser.companyName || ''}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder="회사명"
              />
            </div>
            <div className="form-group">
              <label>사업자 등록 번호</label>
              <input
                type="text"
                value={formatBusinessLicense(newUser.businessLicense || '')}
                onChange={(e) => handleInputChange('businessLicense', e.target.value)}
                placeholder="123-45-67890"
                maxLength="12"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>전화번호</label>
              <input
                type="text"
                value={newUser.phoneNumber || ''}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                placeholder="전화번호"
              />
            </div>
            <div className="form-group">
              <label>팩스번호</label>
              <input
                type="text"
                value={newUser.faxNumber || ''}
                onChange={(e) => handleInputChange('faxNumber', e.target.value)}
                placeholder="팩스번호"
              />
            </div>
          </div>
          
          <div className="form-row-single">
            <div className="form-group">
              <label>주소</label>
              <input
                type="text"
                value={newUser.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="주소"
                style={{ width: 'calc(90% - 15px)' }}
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>
            취소
          </button>
          <button 
            className="submit-button" 
            onClick={handleSave}
            disabled={!newUser.userId}
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddUserModal;
