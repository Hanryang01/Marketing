import React from 'react';
import { formatBusinessLicense } from '../../utils/businessLicenseUtils';

const DetailModeView = ({ 
  editedUser, 
  user, 
  handleInputChange, 
  getFieldValue,
  getInputProps,
  isEditable,
  formatDate
}) => {
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

  return (
    <>
      {/* 사용자 정보 섹션 */}
      <div className="form-section user-info-section">
        <h3 className="section-title">사용자 정보</h3>
        
        {renderFormRow(
          renderInputField('사용자 ID', 'userId', getFieldValue('userId'), () => {}, { readOnly: true, className: 'readonly-input' }),
          renderInputField('이름', 'userName', getFieldValue('userName'), (e) => handleInputChange('userName', e.target.value))
        )}
        
        {renderFormRow(
          renderInputField('부서', 'department', getFieldValue('department'), (e) => handleInputChange('department', e.target.value)),
          renderInputField('직책', 'position', getFieldValue('position'), (e) => handleInputChange('position', e.target.value))
        )}
        
        {renderFormRow(
          renderInputField('휴대전화', 'mobilePhone', getFieldValue('mobilePhone'), (e) => handleInputChange('mobilePhone', e.target.value)),
          renderInputField('이메일', 'email', getFieldValue('email'), (e) => handleInputChange('email', e.target.value), { type: 'email' })
        )}
      </div>

      {/* 승인 정보 섹션 */}
      <div className="form-section approval-info-section">
        <h3 className="section-title">승인 정보</h3>
        
        {renderFormRow(
          renderDateField('시작일', formatDate(editedUser?.startDate || user?.startDate || '')),
          renderDateField('종료일', formatDate(editedUser?.endDate || user?.endDate || ''))
        )}
        
        {renderFormRow(
          renderInputField('업체 형태', 'companyType', getFieldValue('companyType') || '무료 사용자', () => {}, { readOnly: true, className: 'readonly-input' }),
          renderInputField('요금제', 'pricingPlan', getFieldValue('pricingPlan') || '무료', () => {}, { readOnly: true, className: 'readonly-input' })
        )}
        
        {renderFormRow(
          renderInputField('승인 상태', 'approvalStatus', getFieldValue('approvalStatus') || '승인 예정', () => {}, { readOnly: true, className: 'readonly-input' }),
          <div className="form-group"><label></label><div></div></div>
        )}
      </div>

      {/* 사용량 정보 섹션 */}
      <div className="form-section usage-info-section">
        <h3 className="section-title">사용량 정보</h3>
        
        {renderFormRow(
          renderInputField('MSDS', 'msdsLimit', getFieldValue('msdsLimit') || 0, () => {}, { readOnly: true, className: 'readonly-input' }),
          renderInputField('영상분석', 'aiImageLimit', getFieldValue('aiImageLimit') || 0, () => {}, { readOnly: true, className: 'readonly-input' })
        )}
        
        <div className="form-row">
          <div className="form-group">
            <label>AI 보고서</label>
            <input 
              type="text" 
              value={getFieldValue('aiReportLimit') || 0} 
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
              value={getFieldValue('companyName')} 
              onChange={(e) => handleInputChange('companyName', e.target.value)}
              readOnly={!isEditable}
              className={!isEditable ? 'readonly-input' : ''}
            />
          </div>
          <div className="form-group">
            <label>대표자</label>
            <input 
              type="text" 
              value={getFieldValue('representative')} 
              onChange={(e) => handleInputChange('representative', e.target.value)}
              {...getInputProps()}
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>사업자등록번호</label>
            <input 
              type="text" 
              value={formatBusinessLicense(getFieldValue('businessLicense'))} 
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
              value={getFieldValue('industry')} 
              onChange={(e) => handleInputChange('industry', e.target.value)}
              {...getInputProps()}
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>전화번호</label>
            <input 
              type="text" 
              value={getFieldValue('phoneNumber')} 
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
              {...getInputProps()}
            />
          </div>
          <div className="form-group">
            <label>팩스번호</label>
            <input 
              type="text" 
              value={getFieldValue('faxNumber')} 
              onChange={(e) => handleInputChange('faxNumber', e.target.value)}
              {...getInputProps()}
            />
          </div>
        </div>
        
        <div className="form-row-single">
          <div className="form-group">
            <label>주소</label>
            <input 
              type="text" 
              value={getFieldValue('address')} 
              onChange={(e) => handleInputChange('address', e.target.value)}
              {...getInputProps()}
            />
          </div>
        </div>
        
        <div className="form-row-single">
          <div className="form-group">
            <label>계좌 정보</label>
            <input 
              type="text" 
              value={getFieldValue('accountInfo')} 
              onChange={(e) => handleInputChange('accountInfo', e.target.value)}
              {...getInputProps()}
            />
          </div>
        </div>
        
        <div className="form-row-single">
          <div className="form-group">
            <label>메모</label>
            <input 
              type="text" 
              value={getFieldValue('notes')} 
              onChange={(e) => handleInputChange('notes', e.target.value)}
              {...getInputProps()}
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
              value={getFieldValue('accountantName')} 
              onChange={(e) => handleInputChange('accountantName', e.target.value)}
              {...getInputProps()}
            />
          </div>
          <div className="form-group">
            <label>직책</label>
            <input 
              type="text" 
              value={getFieldValue('accountantPosition')} 
              onChange={(e) => handleInputChange('accountantPosition', e.target.value)}
              {...getInputProps()}
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>휴대전화</label>
            <input 
              type="text" 
              value={getFieldValue('accountantMobile')} 
              onChange={(e) => handleInputChange('accountantMobile', e.target.value)}
              {...getInputProps()}
              maxLength="20"
            />
          </div>
          <div className="form-group">
            <label>이메일</label>
            <input 
              type="text" 
              value={getFieldValue('accountantEmail')} 
              onChange={(e) => handleInputChange('accountantEmail', e.target.value)}
              {...getInputProps()}
              maxLength="100"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default DetailModeView;
