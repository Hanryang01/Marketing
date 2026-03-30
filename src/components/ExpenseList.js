import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './ExpenseList.css';
import { useMessage } from '../hooks/useMessage';
import { apiCall, API_ENDPOINTS } from '../config/api';
import { useCalendar } from '../hooks/useCalendar';
import { formatBusinessLicense } from '../utils/businessLicenseUtils';
import useExcelExport from '../hooks/useExcelExport';
import ExpenseModal from './ExpenseModal';
import MessageModal from './MessageModal';

const ExpenseList = () => {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit' | 'copy'
  const [activeTab, setActiveTab] = useState('expense'); // 'expense' | 'income'
  // 검색 필터 상태
  const [companyNameFilter, setCompanyNameFilter] = useState('');
  const [itemFilter, setItemFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datePreset, setDatePreset] = useState('');

  const messageProps = useMessage();
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
    formatDate
  } = useCalendar();

  const handleDateChange = (field, value) => {
    if (field === 'startDate') setStartDate(value);
    if (field === 'endDate') setEndDate(value);
    setDatePreset('');
  };

  // 날짜 프리셋 변경 핸들러
  const handleDatePresetChange = useCallback((preset) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'thisMonth') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
      setStartDate(`${year}-${month}-01`);
      setEndDate(`${year}-${month}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'thisYear') {
      const year = now.getFullYear();
      setStartDate(`${year}-01-01`);
      setEndDate(`${year}-12-31`);
    } else {
      setStartDate('');
      setEndDate('');
    }
  }, []);

  // 커스텀 필터링 + 탭별 필터링 적용
  const filteredExpenses = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];
    return expenses.filter(item => {
      // 탭별 필터
      const transactionType = item.transactionType || 'expense';
      if (activeTab === 'income' ? transactionType !== 'income' : transactionType !== 'expense') return false;
      // 업체명 필터
      if (companyNameFilter) {
        const name = (item.companyName || '').toLowerCase();
        if (!name.includes(companyNameFilter.toLowerCase())) return false;
      }
      // 항목 필터
      if (itemFilter) {
        const itemVal = (item.item || '').toLowerCase();
        if (!itemVal.includes(itemFilter.toLowerCase())) return false;
      }
      // 결제 방법 필터
      if (paymentMethodFilter && item.paymentMethod !== paymentMethodFilter) return false;
      // 조회 기간 필터 (지출일/입금일 기준)
      if (startDate || endDate) {
        const expDate = (item.expenseDate || '').substring(0, 10);
        if (startDate && expDate < startDate) return false;
        if (endDate && expDate > endDate) return false;
      }
      return true;
    });
  }, [expenses, activeTab, companyNameFilter, itemFilter, paymentMethodFilter, startDate, endDate]);

  // 지출 목록 로드
  const loadExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await apiCall(API_ENDPOINTS.EXPENSES);
      setExpenses(result || []);
    } catch (error) {
      messageProps.showMessage('error', '로드 실패', '지출 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [messageProps]);

  // 컴포넌트 마운트 시 지출 목록 로드
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const result = await apiCall(API_ENDPOINTS.EXPENSES);
        setExpenses(result || []);
      } catch (error) {
        messageProps.showMessage('error', '로드 실패', '지출 목록을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 지출 추가 모달 열기
  const handleAddExpense = () => {
    setModalMode('add');
    setEditingExpense(null);
    setShowAddModal(true);
  };

  // 지출 수정 모달 열기
  const handleEditExpense = (expense) => {
    setModalMode('edit');
    setEditingExpense(expense);
    setShowEditModal(true);
  };

  // 지출 복사 모달 열기
  const handleCopyExpense = (expense) => {
    setModalMode('copy');
    const copiedData = { ...expense };
    delete copiedData.id;
    setEditingExpense(copiedData);
    setShowAddModal(true);
  };

  // 지출 삭제
  const handleDeleteClick = (id) => {
    messageProps.showMessage('warning', '삭제 확인', '정말로 이 지출을 삭제하시겠습니까?', {
      showCancel: true,
      confirmText: '삭제',
      cancelText: '취소',
      onConfirm: () => executeDelete(id)
    });
  };

  // 실제 삭제 실행
  const executeDelete = async (id) => {
    setIsLoading(true);
    try {
      const result = await apiCall(`${API_ENDPOINTS.EXPENSES}/${id}`, {
        method: 'DELETE'
      });

      if (result && result.message) {
        messageProps.showMessage('success', '삭제 성공', '지출이 성공적으로 삭제되었습니다.');
        loadExpenses();
      } else {
        messageProps.showMessage('error', '삭제 실패', result?.message || '지출 삭제에 실패했습니다.');
      }
    } catch (error) {
      messageProps.showMessage('error', '삭제 실패', '지출 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setEditingExpense(null);
    setModalMode('add');
  };

  // 저장 후 콜백
  const handleSaveSuccess = () => {
    loadExpenses();
    handleCloseModal();
  };


  // 엑셀 추출을 위한 컬럼 정의
  const excelColumns = [
    { key: 'expenseDate', label: activeTab === 'expense' ? '지출일' : '발행일', width: 12, formatter: (value) => formatDate(value) },
    { key: 'companyName', label: '회사명', width: 20 },
    { key: 'item', label: '항목', width: 20 },
    { key: 'supplyAmount', label: activeTab === 'expense' ? '공급가액' : '입금액', width: 15, isNumber: true },
    { key: 'vatAmount', label: '부가세', width: 12, isNumber: true },
    { key: 'totalAmount', label: '합계금액', width: 15, isNumber: true }
  ];

  // 공통 엑셀 추출 훅 사용 (엑셀 추출 시 오름차순 정렬)
  const excelData = useMemo(() => {
    return [...filteredExpenses].sort((a, b) => (a.expenseDate || '').localeCompare(b.expenseDate || ''));
  }, [filteredExpenses]);

  const exportToExcel = useExcelExport(
    excelData,
    excelColumns,
    '지출리스트',
    '지출리스트',
    messageProps.showMessage
  );

  return (
    <div className="expense-list-container">
      {/* 탭 네비게이션 */}
      <div className="user-tabs">
        <div className="user-tabs-left">
          <button 
            className={`tab-button ${activeTab === 'expense' ? 'active' : ''}`}
            onClick={() => setActiveTab('expense')}
          >
            💸 지출
          </button>
          <button 
            className={`tab-button ${activeTab === 'income' ? 'active' : ''}`}
            onClick={() => setActiveTab('income')}
          >
            💰 입금
          </button>
        </div>
        <div className="user-tabs-right">
          <button 
            className="export-excel-button"
            onClick={exportToExcel}
            title={`${activeTab === 'expense' ? '지출' : '입금'} 리스트를 엑셀 파일로 다운로드`}
          >
            엑셀 추출
          </button>
          <button 
            className="add-expense-button"
            onClick={handleAddExpense}
            disabled={isLoading}
          >
            {activeTab === 'expense' ? '지출 입력' : '입금 입력'}
          </button>
        </div>
      </div>

      {/* 검색 필터 */}
      <div className="sales-search-area">
        <div className="sales-search-row">
          <div className="sales-search-group">
            <label className="sales-search-label">업체명</label>
            <input
              type="text"
              className="sales-search-input"
              placeholder="업체명 검색"
              value={companyNameFilter}
              onChange={(e) => setCompanyNameFilter(e.target.value)}
            />
          </div>
          <div className="sales-search-group">
            <label className="sales-search-label">항목</label>
            <input
              type="text"
              className="sales-search-input"
              placeholder="항목 검색"
              value={itemFilter}
              onChange={(e) => setItemFilter(e.target.value)}
            />
          </div>
          <div className="sales-search-group">
            <label className="sales-search-label">결제 방법</label>
            <div className="sales-dropdown-wrapper">
              <select
                className="sales-search-dropdown"
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
              >
                <option value="">전체</option>
                <option value="세금계산서">세금계산서</option>
                <option value="신용카드">신용카드</option>
                <option value="영수증">영수증</option>
              </select>
              <span className="sales-dropdown-icon">▼</span>
            </div>
          </div>
          <div className="sales-search-group">
            <label className="sales-search-label">조회 기간</label>
            <div className="sales-date-range">
              <div className="sales-date-input-container">
                <input
                  type="text"
                  className="sales-date-input"
                  placeholder="YYYY-MM-DD"
                  value={startDate}
                  maxLength="10"
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('');
                  }}
                />
                <span 
                  className="sales-date-icon" 
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    const inputElement = e.target.previousElementSibling;
                    handleOpenCalendar('start', inputElement, startDate);
                  }}
                >
                  📅
                </span>
              </div>
              <span className="sales-date-separator">~</span>
              <div className="sales-date-input-container">
                <input
                  type="text"
                  className="sales-date-input"
                  placeholder="YYYY-MM-DD"
                  value={endDate}
                  maxLength="10"
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('');
                  }}
                />
                <span 
                  className="sales-date-icon" 
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    const inputElement = e.target.previousElementSibling;
                    handleOpenCalendar('end', inputElement, endDate);
                  }}
                >
                  📅
                </span>
              </div>
              <div className="sales-dropdown-wrapper">
                <select
                  className="sales-search-dropdown"
                  value={datePreset}
                  onChange={(e) => handleDatePresetChange(e.target.value)}
                >
                  <option value="">전체</option>
                  <option value="thisMonth">이번달</option>
                  <option value="thisYear">올해</option>
                </select>
                <span className="sales-dropdown-icon">▼</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="expense-list-content">
        {isLoading ? (
          <div className="loading">로딩 중...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="no-data">{activeTab === 'expense' ? '등록된 지출이 없습니다.' : '등록된 입금이 없습니다.'}</div>
        ) : (
          <div className="expense-table-container">
            <table className="expense-table">
              <thead>
                <tr>
                  <th>발행일</th>
                  <th>{activeTab === 'expense' ? '지출일' : '입금일'}</th>
                  <th>회사명</th>
                  {activeTab === 'expense' && <th>사업자등록번호</th>}
                  <th>결제 방법</th>
                  <th>항목</th>
                  <th>합계금액</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => {
                  const transactionType = expense.transactionType || 'expense';
                  const isIncome = transactionType === 'income';
                  
                  return (
                    <tr key={expense.id} onDoubleClick={() => handleEditExpense(expense)}>
                      <td>{activeTab === 'expense' ? formatDate(expense.issueDate) : formatDate(expense.expenseDate)}</td>
                      <td>{activeTab === 'expense' ? formatDate(expense.expenseDate) : formatDate(expense.issueDate)}</td>
                      <td>{expense.companyName}</td>
                      {activeTab === 'expense' && <td>{expense.businessLicense ? formatBusinessLicense(expense.businessLicense) : '-'}</td>}
                      <td>{expense.paymentMethod}</td>
                      <td>{expense.item}</td>
                      <td className={`amount ${isIncome ? 'income-amount' : 'expense-amount'}`}>
                        {parseFloat(expense.totalAmount || 0).toLocaleString()}원
                      </td>
                      <td className="actions">
                        <button
                          className="status-button copy-green"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyExpense(expense);
                          }}
                          title="복사"
                          style={{ marginRight: '5px' }}
                        >
                          복사
                        </button>
                        <button
                          className="status-button delete-red"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(expense.id);
                          }}
                          title="삭제"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 지출 추가 모달 */}
      <ExpenseModal
        isOpen={showAddModal}
        onClose={handleCloseModal}
        mode={modalMode}
        initialData={modalMode === 'copy' ? editingExpense : null}
        onSave={handleSaveSuccess}
      />

      {/* 지출 수정 모달 */}
      <ExpenseModal
        isOpen={showEditModal}
        onClose={handleCloseModal}
        mode="edit"
        initialData={editingExpense}
        onSave={handleSaveSuccess}
      />

      {/* 메시지 팝업창 */}
      <MessageModal
        isOpen={messageProps.showMessageModal}
        messageData={messageProps.messageData}
        onConfirm={messageProps.handleMessageConfirm}
        onCancel={messageProps.handleMessageCancel}
      />

      {/* 시작일 달력 팝업창 */}
      {showStartDatePicker && (
        <div className="date-picker-overlay" onClick={() => setShowStartDatePicker(false)}>
          <div 
            className="date-picker" 
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'absolute', top: `${calendarPosition.top}px`, left: `${calendarPosition.left}px`, zIndex: 9999 }}
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
                  <div>일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div>토</div>
                </div>
                <div className="calendar-days">
                  {getCalendarDays('start', startDate).map((day, index) => (
                    <div
                      key={index}
                      className={`calendar-day ${day.isCurrentMonth ? '' : 'other-month'} ${day.isToday ? 'today' : ''} ${day.isSelected ? 'selected' : ''}`}
                      onClick={() => day.isCurrentMonth && handleDateSelect(day.date, 'start', (date) => { setStartDate(date); setDatePreset(''); })}
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
            style={{ position: 'absolute', top: `${calendarPosition.top}px`, left: `${calendarPosition.left}px`, zIndex: 9999 }}
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
                  <div>일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div>토</div>
                </div>
                <div className="calendar-days">
                  {getCalendarDays('end', endDate).map((day, index) => (
                    <div
                      key={index}
                      className={`calendar-day ${day.isCurrentMonth ? '' : 'other-month'} ${day.isToday ? 'today' : ''} ${day.isSelected ? 'selected' : ''}`}
                      onClick={() => day.isCurrentMonth && handleDateSelect(day.date, 'end', (date) => { setEndDate(date); setDatePreset(''); })}
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

export default ExpenseList;