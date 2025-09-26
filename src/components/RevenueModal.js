import React, { useState, useEffect } from 'react';
import './RevenueModal.css';
import { useCalendar } from '../hooks/useCalendar';
import { handleBusinessLicenseInput, formatBusinessLicense } from '../utils/businessLicenseUtils';

const RevenueModal = ({
  isOpen,
  onClose,
  onSave,
  mode = 'add', // 'add' | 'edit'
  initialData = {},
  title = '매출 입력'
}) => {
  const [revenueData, setRevenueData] = useState({
    companyName: '',
    businessLicense: '',
    issueDate: '',
    paymentDate: '',
    paymentMethod: '세금계산서',
    companyType: '',
    item: '',
    supplyAmount: '',
    vat: '',
    totalAmount: ''
  });


  // useCalendar 훅 사용
  const {
    showIssueDatePicker,
    setShowIssueDatePicker,
    showPaymentDatePicker,
    setShowPaymentDatePicker,
    calendarPosition,
    handleOpenCalendar,
    handleDateSelect,
    handleMonthChange,
    getCurrentMonthYear,
    getCalendarDays,
    goToToday,
    handleDateInputChange
  } = useCalendar();

  useEffect(() => {
    if (isOpen && initialData) {
      // 금액 필드에 천 단위 구분자 추가
      const formatAmount = (amount) => {
        if (!amount) return '';
        const numericValue = parseFloat(amount.toString().replace(/,/g, ''));
        return isNaN(numericValue) ? '' : numericValue.toLocaleString();
      };
      
      setRevenueData(prev => ({
        ...prev,
        companyName: initialData.companyName || '',
        businessLicense: initialData.businessLicense || '',
        companyType: initialData.companyType || '',
        issueDate: initialData.issueDate || '',
        paymentDate: initialData.paymentDate || '',
        paymentMethod: initialData.paymentMethod || '세금계산서',
        item: initialData.item || '',
        supplyAmount: formatAmount(initialData.supplyAmount),
        vat: formatAmount(initialData.vat),
        totalAmount: formatAmount(initialData.totalAmount)
      }));
    } else if (!isOpen) {
      // Reset form when modal closes
      setRevenueData({
        companyName: '',
        businessLicense: '',
        issueDate: '',
        paymentDate: '',
        paymentMethod: '세금계산서',
        companyType: '',
        item: '',
        supplyAmount: '',
        vat: '',
        totalAmount: ''
      });
    }
  }, [isOpen, initialData]);

  // 날짜 선택 처리
  const handleRevenueDateSelect = (field, value) => {
    setRevenueData(prev => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (field, value) => {
    setRevenueData(prev => {
      const newData = { ...prev, [field]: value };
      
      // 사업자 등록번호 특별 처리
      if (field === 'businessLicense') {
        const processedValue = handleBusinessLicenseInput(value);
        newData[field] = processedValue;
        return newData;
      }
      
      if (field === 'supplyAmount') {
        // 숫자만 추출
        const numericValue = value.replace(/[^0-9]/g, '');
        const supplyAmount = parseFloat(numericValue) || 0;
        const vat = Math.round(supplyAmount * 0.1);
        const totalAmount = supplyAmount + vat;
        
        // 천 단위 구분자 추가
        newData.supplyAmount = supplyAmount.toLocaleString();
        newData.vat = vat.toLocaleString();
        newData.totalAmount = totalAmount.toLocaleString();
      }
      
      return newData;
    });
  };

  const handleSave = async () => {
    if (onSave) {
      await onSave(revenueData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>회사명<span className="required-asterisk">*</span></label>
              <input
                type="text"
                value={revenueData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder="회사명"
                required
              />
            </div>
            <div className="form-group">
              <label>사업자 등록 번호<span className="required-asterisk">*</span></label>
              <input
                type="text"
                value={formatBusinessLicense(revenueData.businessLicense)}
                onChange={(e) => handleInputChange('businessLicense', e.target.value)}
                placeholder="123-45-67890"
                maxLength="12"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>발행일<span className="required-asterisk">*</span></label>
              <div className="date-input-container">
                <input
                  type="text"
                  value={revenueData.issueDate || ''}
                  onChange={(e) => {
                    console.log('🔍 revenueData issueDate onChange:', e.target.value);
                    handleDateInputChange('issueDate', e.target.value, setRevenueData);
                  }}
                  onFocus={(e) => {
                    console.log('🔍 revenueData issueDate onFocus');
                  }}
                  placeholder="YYYY-MM-DD"
                  maxLength="10"
                  required
                  style={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #ccc'
                  }}
                />
                <div 
                  className="calendar-icon" 
                  onClick={(e) => {
                    const inputElement = e.target.previousElementSibling;
                    handleOpenCalendar('issue', inputElement, revenueData.issueDate);
                  }}
                >
                  📅
                </div>
              </div>
            </div>
            <div className="form-group">
              <label>입금일</label>
              <div className="date-input-container">
                <input
                  type="text"
                  value={revenueData.paymentDate || ''}
                  onChange={(e) => {
                    console.log('🔍 revenueData paymentDate onChange:', e.target.value);
                    handleDateInputChange('paymentDate', e.target.value, setRevenueData);
                  }}
                  onFocus={(e) => {
                    console.log('🔍 revenueData paymentDate onFocus');
                  }}
                  placeholder="YYYY-MM-DD"
                  maxLength="10"
                  style={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #ccc'
                  }}
                />
                <div 
                  className="calendar-icon" 
                  onClick={(e) => {
                    const inputElement = e.target.previousElementSibling;
                    handleOpenCalendar('payment', inputElement, revenueData.paymentDate);
                  }}
                >
                  📅
                </div>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>결제 형태<span className="required-asterisk">*</span></label>
              <select
                value={revenueData.paymentMethod}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                required
              >
                <option value="">선택하세요</option>
                <option value="세금계산서">세금계산서</option>
                <option value="신용카드">신용카드</option>
                <option value="기타">기타</option>
              </select>
            </div>
            <div className="form-group">
              <label>업체 형태<span className="required-asterisk">*</span></label>
              <select
                value={revenueData.companyType}
                onChange={(e) => handleInputChange('companyType', e.target.value)}
                required
              >
                <option value="">선택하세요</option>
                <option value="컨설팅 업체">컨설팅 업체</option>
                <option value="일반 업체">일반 업체</option>
                <option value="기타">기타</option>
              </select>
            </div>
          </div>

          <div className="form-row-single">
            <div className="form-group">
              <label>항목<span className="required-asterisk">*</span></label>
              <input
                type="text"
                value={revenueData.item}
                onChange={(e) => handleInputChange('item', e.target.value)}
                placeholder="매출 항목"
                required
                style={{ width: 'calc(90% - 15px)' }}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>공급가액<span className="required-asterisk">*</span></label>
              <input
                type="text"
                value={revenueData.supplyAmount}
                onChange={(e) => handleInputChange('supplyAmount', e.target.value)}
                placeholder="공급가액"
                required
              />
            </div>
            <div className="form-group">
              <label>부가세<span className="required-asterisk">*</span></label>
              <input
                type="text"
                value={revenueData.vat}
                readOnly
                className="readonly-input"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>총 금액<span className="required-asterisk">*</span></label>
              <input
                type="text"
                value={revenueData.totalAmount}
                readOnly
                className="readonly-input"
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
            disabled={!revenueData.businessLicense}
          >
            {mode === 'edit' ? '수정' : '등록'}
          </button>
        </div>
      </div>

      {/* 발행일 달력 팝업창 */}
      {showIssueDatePicker && (
        <div className="date-picker-overlay" onClick={() => setShowIssueDatePicker(false)}>
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
              <button className="today-button" onClick={() => goToToday('issue')}>오늘</button>
              <button className="close-button" onClick={() => setShowIssueDatePicker(false)}>×</button>
            </div>
            <div className="date-picker-body">
              <div className="calendar-grid">
                <div className="calendar-header">
                  <button onClick={() => handleMonthChange('issue', -1)}>&lt;</button>
                  <span>{getCurrentMonthYear('issue')}</span>
                  <button onClick={() => handleMonthChange('issue', 1)}>&gt;</button>
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
                  {getCalendarDays('issue', revenueData.issueDate).map((day, index) => (
                    <div
                      key={index}
                      className={`calendar-day ${day.isCurrentMonth ? '' : 'other-month'} ${day.isToday ? 'today' : ''} ${day.isSelected ? 'selected' : ''}`}
                      onClick={() => day.isCurrentMonth && handleDateSelect(day.date, 'issue', handleRevenueDateSelect)}
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

      {/* 입금일 달력 팝업창 */}
      {showPaymentDatePicker && (
        <div className="date-picker-overlay" onClick={() => setShowPaymentDatePicker(false)}>
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
              <button className="today-button" onClick={() => goToToday('payment')}>오늘</button>
              <button className="close-button" onClick={() => setShowPaymentDatePicker(false)}>×</button>
            </div>
            <div className="date-picker-body">
              <div className="calendar-grid">
                <div className="calendar-header">
                  <button onClick={() => handleMonthChange('payment', -1)}>&lt;</button>
                  <span>{getCurrentMonthYear('payment')}</span>
                  <button onClick={() => handleMonthChange('payment', 1)}>&gt;</button>
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
                  {getCalendarDays('payment', revenueData.paymentDate).map((day, index) => (
                    <div
                      key={index}
                      className={`calendar-day ${day.isCurrentMonth ? '' : 'other-month'} ${day.isToday ? 'today' : ''} ${day.isSelected ? 'selected' : ''}`}
                      onClick={() => day.isCurrentMonth && handleDateSelect(day.date, 'payment', handleRevenueDateSelect)}
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
    </div>
  );
};

export default RevenueModal;
