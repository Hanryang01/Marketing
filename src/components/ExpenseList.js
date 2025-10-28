import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './ExpenseList.css';
import { useMessage } from '../hooks/useMessage';
import { apiCall, API_ENDPOINTS } from '../config/api';
import { useCalendar } from '../hooks/useCalendar';
import { formatBusinessLicense } from '../utils/businessLicenseUtils';
import useExcelExport from '../hooks/useExcelExport';
import useSearchFilters from '../hooks/useSearchFilters';
import ExpenseModal from './ExpenseModal';
import MessageModal from './MessageModal';
import SearchFilters from './common/SearchFilters';

const ExpenseList = () => {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [activeTab, setActiveTab] = useState('expense'); // 'expense' | 'income'
  // 검색 필터 필드 정의
  const expenseFilterFields = [
    { name: 'companyName', placeholder: '회사명 검색' },
    { name: 'businessLicense', placeholder: '사업자등록번호 검색' },
    { name: 'item', placeholder: '항목 검색' }
  ];
  const messageProps = useMessage();
  const { formatDate } = useCalendar();

  // 공통 검색 필터 훅 사용
  const { searchFilters, handleFilterChange, filteredData } = useSearchFilters(
    expenseFilterFields,
    expenses
  );

  // 탭별 필터링 적용
  const filteredExpenses = useMemo(() => {
    return filteredData.filter(expense => {
      const transactionType = expense.transactionType || 'expense';
      return activeTab === 'income' ? transactionType === 'income' : transactionType === 'expense';
    });
  }, [filteredData, activeTab]);

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
    setShowAddModal(true);
  };

  // 지출 수정 모달 열기
  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setShowEditModal(true);
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
  };

  // 저장 후 콜백
  const handleSaveSuccess = () => {
    loadExpenses();
    handleCloseModal();
  };


  // 엑셀 추출을 위한 컬럼 정의
  const excelColumns = [
    { key: 'companyName', label: '회사명', width: 20 },
    { key: 'businessLicense', label: '사업자등록번호', width: 15, formatter: (value) => value ? formatBusinessLicense(value) : '' },
    { key: 'issueDate', label: '결제일', width: 12, formatter: (value) => formatDate(value) },
    { key: 'expenseDate', label: '지출일', width: 12, formatter: (value) => formatDate(value) },
    { key: 'paymentMethod', label: '결제 방법', width: 12 },
    { key: 'item', label: '항목', width: 20 },
    { key: 'supplyAmount', label: '공급가액', width: 15, formatter: (value) => Math.round(value || 0).toLocaleString() },
    { key: 'vatAmount', label: '부가세', width: 12, formatter: (value) => Math.round(value || 0).toLocaleString() },
    { key: 'totalAmount', label: '합계금액', width: 15, formatter: (value) => Math.round(value || 0).toLocaleString() }
  ];

  // 공통 엑셀 추출 훅 사용
  const exportToExcel = useExcelExport(
    filteredExpenses,
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
      <SearchFilters 
        filters={searchFilters}
        onFilterChange={handleFilterChange}
        fields={expenseFilterFields}
      />

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
                  <th>회사명</th>
                  <th>사업자등록번호</th>
                  <th>{activeTab === 'expense' ? '결제일' : '결제일'}</th>
                  <th>{activeTab === 'expense' ? '지출일' : '입금일'}</th>
                  <th>결제 방법</th>
                  <th>항목</th>
                  <th>{activeTab === 'expense' ? '공급가액' : '입금액'}</th>
                  {activeTab === 'expense' && <th>부가세</th>}
                  <th>합계금액</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => {
                  const transactionType = expense.transactionType || 'expense';
                  const isIncome = transactionType === 'income';
                  
                  return (
                    <tr key={expense.id} onDoubleClick={() => handleEditExpense(expense)}>
                      <td>{expense.companyName}</td>
                      <td>{expense.businessLicense ? formatBusinessLicense(expense.businessLicense) : '-'}</td>
                      <td>{formatDate(expense.issueDate)}</td>
                      <td>{formatDate(expense.expenseDate)}</td>
                      <td>{expense.paymentMethod}</td>
                      <td>{expense.item}</td>
                      <td className={`amount ${isIncome ? 'income-amount' : 'expense-amount'}`}>
                        {parseFloat(expense.supplyAmount || 0).toLocaleString()}원
                      </td>
                      {!isIncome && (
                        <td className="amount">{parseFloat(expense.vatAmount || 0).toLocaleString()}원</td>
                      )}
                      <td className={`amount ${isIncome ? 'income-amount' : 'expense-amount'}`}>
                        {parseFloat(expense.totalAmount || 0).toLocaleString()}원
                      </td>
                      <td className="actions">
                        <button
                          className="status-button delete-red"
                          onClick={() => handleDeleteClick(expense.id)}
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
        mode="add"
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
                </div>
              );
            };

            export default ExpenseList;