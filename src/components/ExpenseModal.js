import React, { useState, useEffect } from 'react';
import { useCalendar } from '../hooks/useCalendar';
import { useMessage } from '../hooks/useMessage';
import { apiCall, API_ENDPOINTS } from '../config/api';
import { formatAmount } from '../utils/helpers';
import { handleBusinessLicenseInput, formatBusinessLicense, isValidBusinessLicense } from '../utils/businessLicenseUtils';
import './ExpenseModal.css';

const ExpenseModal = ({ 
  isOpen, 
  onClose, 
  mode = 'add', // 'add' or 'edit'
  initialData = null,
  onSave 
}) => {
  const { showMessage } = useMessage();
  const [isLoading, setIsLoading] = useState(false);
  const [transactionType, setTransactionType] = useState('expense'); // 'expense' | 'income'
  const [formData, setFormData] = useState({
    companyName: '',
    businessLicense: '',
    paymentMethod: '',
    issueDate: '',
    expenseDate: '',
    item: '',
    totalAmount: '',
    supplyAmount: '',
    vatAmount: '',
    transactionType: 'expense'
  });

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
    handleDateInputChange,
    formatDateForInput
  } = useCalendar();

  // 초기 데이터 설정
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      const type = initialData.transactionType || 'expense';
      setTransactionType(type);
      setFormData({
        companyName: initialData.companyName || '',
        businessLicense: initialData.businessLicense || '',
        paymentMethod: initialData.paymentMethod || '',
        issueDate: formatDateForInput(initialData.issueDate) || '',
        expenseDate: formatDateForInput(initialData.expenseDate) || '',
        item: initialData.item || '',
        totalAmount: formatAmount(initialData.totalAmount || 0),
        supplyAmount: formatAmount(initialData.supplyAmount || 0),
        vatAmount: formatAmount(initialData.vatAmount || 0),
        transactionType: type
      });
    } else {
      resetForm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialData]); // formatDateForInput 제거하여 무한 루프 방지

  const resetForm = () => {
    setTransactionType('expense');
    setFormData({
      companyName: '',
      businessLicense: '',
      paymentMethod: '',
      issueDate: '',
      expenseDate: '',
      item: '',
      totalAmount: '',
      supplyAmount: '',
      vatAmount: '',
      transactionType: 'expense'
    });
  };

  // 거래 유형 변경 핸들러
  const handleTransactionTypeChange = (type) => {
    setTransactionType(type);
    setFormData(prev => ({
      ...prev,
      transactionType: type,
      companyName: '',
      businessLicense: '',
      paymentMethod: '',
      issueDate: '',
      expenseDate: '',
      item: '',
      supplyAmount: '',
      vatAmount: type === 'income' ? '0' : '', // 입금 모드에서는 부가세를 0으로 설정
      totalAmount: ''
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // 사업자등록번호 특별 처리
    if (name === 'businessLicense') {
      const processedValue = handleBusinessLicenseInput(value);
      setFormData(prev => ({
        ...prev,
        [name]: processedValue
      }));
      return;
    }
    
    // 금액 필드인 경우 천 단위 구분자 추가
    if (['totalAmount', 'supplyAmount', 'vatAmount'].includes(name)) {
      const numericValue = value.replace(/,/g, '');
      if (numericValue === '' || /^\d+$/.test(numericValue)) {
        const formattedValue = numericValue === '' ? '' : formatAmount(numericValue);
        
        setFormData(prev => {
          const newData = { ...prev, [name]: formattedValue };
          
          if (transactionType === 'income') {
            // 입금 모드: 단순 금액 입력 (부가세 없음)
            if (name === 'supplyAmount') {
              newData.vatAmount = '0'; // 입금은 부가세 0
              newData.totalAmount = formattedValue; // 입금은 부가세 없이 금액 그대로
            }
          } else {
            // 지출 모드: 기존 로직 (부가세 계산 포함)
            if (name === 'supplyAmount') {
              const supplyAmount = parseFloat(numericValue) || 0;
              const calculatedVat = Math.round(supplyAmount * 0.1);
              newData.vatAmount = formatAmount(calculatedVat);
              newData.totalAmount = formatAmount(supplyAmount + calculatedVat);
            } else if (name === 'vatAmount') {
              // 부가세 변경 시 합계금액만 재계산
              const supplyAmount = parseFloat(prev.supplyAmount.replace(/,/g, '')) || 0;
              const vatAmount = parseFloat(numericValue) || 0;
              newData.totalAmount = formatAmount(supplyAmount + vatAmount);
            }
          }
          
          return newData;
        });
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // 공통 유효성 검사 함수
  const validateForm = () => {
    if (formData.businessLicense && !isValidBusinessLicense(formData.businessLicense)) {
      showMessage('error', '사업자등록번호 오류', '사업자등록번호는 숫자 10자리여야 합니다.');
      return false;
    }

    const getFieldLabels = () => {
      if (transactionType === 'income') {
        return {
          companyName: '입금처명',
          issueDate: '입금일',
          item: '입금 항목',
          supplyAmount: '입금액'
        };
      } else {
        return {
          companyName: '회사명',
          issueDate: '결제일',
          item: '항목',
          supplyAmount: '공급가액'
        };
      }
    };

    const labels = getFieldLabels();
    const requiredFields = [
      { field: 'companyName', message: `${labels.companyName}을 입력해주세요.` },
      { field: 'issueDate', message: `${labels.issueDate}을 입력해주세요.` },
      { field: 'item', message: `${labels.item}을 입력해주세요.` },
      { field: 'supplyAmount', message: `${labels.supplyAmount}을 입력해주세요.` }
    ];

    // 지출 모드에서만 부가세 검증 추가
    if (transactionType === 'expense') {
      requiredFields.push({ field: 'vatAmount', message: '부가세를 입력해주세요.' });
    }

    for (const { field, message } of requiredFields) {
      if (!formData[field].trim()) {
        showMessage('error', '입력 오류', message);
        return false;
      }
    }
    return true;
  };

  // 공통 데이터 포맷팅 함수
  const formatSubmitData = () => {
    const baseData = {
      companyName: formData.companyName,
      businessLicense: formData.businessLicense || null,
      paymentMethod: formData.paymentMethod,
      issueDate: formData.issueDate && formData.issueDate.trim() !== '' ? formData.issueDate : null,
      expenseDate: formData.expenseDate && formData.expenseDate !== '-' && formData.expenseDate.trim() !== '' ? formData.expenseDate : null,
      item: formData.item,
      transactionType: transactionType
    };

    if (transactionType === 'income') {
      // 입금 데이터
      const amount = parseFloat(formData.supplyAmount.replace(/,/g, '')) || 0;
      return {
        ...baseData,
        totalAmount: amount,
        supplyAmount: amount,
        vatAmount: 0 // 입금은 부가세 없음
      };
    } else {
      // 지출 데이터
      return {
        ...baseData,
        totalAmount: parseFloat(formData.totalAmount.replace(/,/g, '')) || 0,
        supplyAmount: parseFloat(formData.supplyAmount.replace(/,/g, '')) || 0,
        vatAmount: parseFloat(formData.vatAmount.replace(/,/g, '')) || 0
      };
    }
  };

  // 공통 저장 로직
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsLoading(true);

    try {
      if (!validateForm()) {
        setIsLoading(false);
        return;
      }

      const isEdit = mode === 'edit';
      const url = isEdit ? `${API_ENDPOINTS.EXPENSES}/${initialData.id}` : API_ENDPOINTS.EXPENSES;
      const method = isEdit ? 'PUT' : 'POST';
      
      const result = await apiCall(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formatSubmitData()),
      });

      if (result && result.message) {
        const action = isEdit ? '수정' : '추가';
        const type = transactionType === 'income' ? '입금' : '지출';
        showMessage('success', `${type} ${action} 성공`, `${type}이 성공적으로 ${action}되었습니다.`);
        onSave && onSave();
        onClose();
        resetForm();
      } else {
        const action = isEdit ? '수정' : '추가';
        const type = transactionType === 'income' ? '입금' : '지출';
        showMessage('error', `${type} ${action} 실패`, result?.message || `${type} ${action}에 실패했습니다.`);
      }
    } catch (error) {
      const action = mode === 'edit' ? '수정' : '추가';
      const type = transactionType === 'income' ? '입금' : '지출';
      showMessage('error', `${type} ${action} 실패`, `${type} ${action} 중 오류가 발생했습니다.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    onClose();
    resetForm();
  };

  const handleExpenseDateSelect = (field, value) => {
    // useCalendar는 'payment' 타입 선택 시 'paymentDate' 키로 콜백을 호출하므로
    // 지출 모달의 상태 키 'expenseDate'로 매핑한다.
    const mappedField = field === 'paymentDate' ? 'expenseDate' : field;
    setFormData(prev => ({ ...prev, [mappedField]: value }));
  };

  // UI 텍스트 설정
  const getUITexts = () => {
    const isIncome = transactionType === 'income';
    return {
      companyLabel: isIncome ? '입금처명' : '회사명',
      issueDateLabel: isIncome ? '결제일' : '결제일',
      expenseDateLabel: isIncome ? '입금일' : '지출일',
      itemLabel: isIncome ? '입금 항목' : '항목',
      amountLabel: isIncome ? '입금액' : '공급가액',
      buttonText: isIncome ? '입금' : '지출',
      modalTitle: isIncome ? '입금' : '지출'
    };
  };

  // 금액 입력 필드 렌더링
  const renderAmountFields = () => {
    const isIncome = transactionType === 'income';
    const texts = getUITexts();

    if (isIncome) {
      // 입금 모드: 단순 금액 입력
      return (
        <div className="form-row">
          <div className="form-group">
            <label>{texts.amountLabel}<span className="required-asterisk">*</span></label>
            <input
              type="text"
              name="supplyAmount"
              value={formData.supplyAmount}
              onChange={handleInputChange}
              placeholder="0"
              required
            />
          </div>
          <div className="form-group">
            <label>합계금액</label>
            <input
              type="text"
              name="totalAmount"
              value={formData.totalAmount}
              readOnly
              className="readonly"
              placeholder="0"
            />
          </div>
        </div>
      );
    } else {
      // 지출 모드: 공급가액, 부가세, 합계금액
      return (
        <>
          <div className="form-row">
            <div className="form-group">
              <label>{texts.amountLabel}<span className="required-asterisk">*</span></label>
              <input
                type="text"
                name="supplyAmount"
                value={formData.supplyAmount}
                onChange={handleInputChange}
                placeholder="0"
                required
              />
            </div>
            <div className="form-group">
              <label>부가세<span className="required-asterisk">*</span></label>
              <input
                type="text"
                name="vatAmount"
                value={formData.vatAmount}
                onChange={handleInputChange}
                placeholder="0"
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>합계금액</label>
              <input
                type="text"
                name="totalAmount"
                value={formData.totalAmount}
                readOnly
                className="readonly"
                placeholder="0"
              />
            </div>
          </div>
        </>
      );
    }
  };

  // 달력 렌더링을 RevenueModal과 동일한 방식으로 구성
  const renderCalendar = (type, showPicker, setShowPicker) => {
    const isIssue = type === 'issue';
    const currentDate = isIssue ? formData.issueDate : formData.expenseDate;
    return showPicker && (
      <div className="date-picker-overlay" onClick={() => setShowPicker(false)}>
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
            <button className="today-button" onClick={() => goToToday(type)}>오늘</button>
            <button className="close-button" onClick={() => setShowPicker(false)}>×</button>
          </div>
          <div className="date-picker-body">
            <div className="calendar-grid">
              <div className="calendar-header">
                <button onClick={() => handleMonthChange(type, -1)}>&lt;</button>
                <span>{getCurrentMonthYear(type)}</span>
                <button onClick={() => handleMonthChange(type, 1)}>&gt;</button>
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
                {getCalendarDays(type, currentDate).map((day, index) => (
                  <div
                    key={index}
                    className={`calendar-day ${day.isCurrentMonth ? '' : 'other-month'} ${day.isToday ? 'today' : ''} ${day.isSelected ? 'selected' : ''}`}
                    onClick={() => day.isCurrentMonth && handleDateSelect(day.date, type, handleExpenseDateSelect)}
                  >
                    {day.day}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleCloseModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === 'add' ? `${getUITexts().modalTitle} 입력` : `${getUITexts().modalTitle} 수정`}</h2>
          <button className="close-button" onClick={handleCloseModal}>×</button>
        </div>
        
        {/* 거래 유형 토글 스위치 */}
        <div className="transaction-type-toggle">
          <button 
            className={`toggle-btn ${transactionType === 'expense' ? 'active' : ''}`}
            onClick={() => handleTransactionTypeChange('expense')}
            type="button"
          >
            💸 지출
          </button>
          <button 
            className={`toggle-btn ${transactionType === 'income' ? 'active' : ''}`}
            onClick={() => handleTransactionTypeChange('income')}
            type="button"
          >
            💰 입금
          </button>
        </div>

        
        <div className="modal-body">
          <form onSubmit={handleSave} className="expense-form">
            <div className="form-row">
              <div className="form-group">
                <label>{getUITexts().companyLabel}<span className="required-asterisk">*</span></label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>사업자등록번호</label>
                <input
                  type="text"
                  name="businessLicense"
                  value={formatBusinessLicense(formData.businessLicense || '')}
                  onChange={handleInputChange}
                  placeholder="123-45-67890"
                  maxLength="12"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{getUITexts().issueDateLabel}<span className="required-asterisk">*</span></label>
                <div className="date-input-container">
                  <input
                    type="text"
                    name="issueDate"
                    value={formData.issueDate}
                    onChange={(e) => {
                      handleDateInputChange('issueDate', e.target.value, setFormData);
                    }}
                    placeholder="YYYY-MM-DD"
                    maxLength="10"
                    required
                    className="date-input"
                  />
                  <div 
                    className="calendar-icon" 
                    onClick={(e) => {
                      const inputElement = e.target.previousElementSibling;
                      handleOpenCalendar('issue', inputElement, formData.issueDate);
                    }}
                  >
                    📅
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>{getUITexts().expenseDateLabel}</label>
                <div className="date-input-container">
                  <input
                    type="text"
                    name="expenseDate"
                    value={formData.expenseDate}
                    onChange={(e) => {
                      handleDateInputChange('expenseDate', e.target.value, setFormData);
                    }}
                    placeholder="YYYY-MM-DD"
                    maxLength="10"
                    className="date-input"
                  />
                  <div 
                    className="calendar-icon" 
                    onClick={(e) => {
                      const inputElement = e.target.previousElementSibling;
                      handleOpenCalendar('payment', inputElement, formData.expenseDate);
                    }}
                  >
                    📅
                  </div>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>결제 방법<span className="required-asterisk">*</span></label>
                <select name="paymentMethod" value={formData.paymentMethod} onChange={handleInputChange} required>
                  <option value="">선택하세요</option>
                  <option value="세금계산서">세금계산서</option>
                  <option value="영수증">영수증</option>
                  <option value="신용카드">신용카드</option>
                </select>
              </div>
            </div>

            <div className="form-row-single">
              <div className="form-group">
                <label>{getUITexts().itemLabel}<span className="required-asterisk">*</span></label>
                <input
                  type="text"
                  name="item"
                  value={formData.item}
                  onChange={handleInputChange}
                  required
                  style={{ width: 'calc(90% - 15px)' }}
                />
              </div>
            </div>

            {renderAmountFields()}
          </form>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="cancel-button"
            onClick={handleCloseModal}
            disabled={isLoading}
          >
            취소
          </button>
          <button
            type="button"
            className="submit-button"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? '처리중...' : 
              `${getUITexts().buttonText} ${mode === 'add' ? '추가' : '수정'}`
            }
          </button>
        </div>
      </div>

      {/* 달력 팝업창 (RevenueModal과 동일 구조) */}
      {renderCalendar('issue', showIssueDatePicker, setShowIssueDatePicker)}
      {renderCalendar('payment', showPaymentDatePicker, setShowPaymentDatePicker)}
    </div>
  );
};

export default ExpenseModal;
