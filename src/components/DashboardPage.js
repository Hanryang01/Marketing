import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './DashboardPage.css';
import { apiCall, API_ENDPOINTS } from '../config/api';
import { useCalendar } from '../hooks/useCalendar';
import ExpenseModal from './ExpenseModal';
import RevenueModal from './RevenueModal';

const DashboardPage = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [revenueData, setRevenueData] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 지출 수정 모달 상태
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  
  // 수입 수정 모달 상태
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState(null);
  
  // useCalendar 훅 사용
  const { parseKoreaDate, formatDate } = useCalendar();
  
  // 거래내역 더블클릭 핸들러
  const handleTransactionDoubleClick = (transaction) => {
    
    if (transaction.type === 'expense') {
      // 지출 데이터 구조 변환
      // 원본 데이터에서 모든 필드를 가져와서 매핑
      const originalData = transaction.originalData || {};
      const expenseData = {
        id: transaction.id.replace('expense_', ''), // expense_ 접두사 제거하여 원본 ID 사용
        companyName: transaction.company || originalData.companyName || '',
        businessLicense: originalData.businessLicense || transaction.businessLicense || '',
        paymentMethod: originalData.paymentMethod || transaction.paymentMethod || '',
        issueDate: originalData.issueDate || transaction.date,
        expenseDate: originalData.expenseDate || transaction.date,
        item: transaction.item || originalData.item || '',
        totalAmount: originalData.totalAmount || transaction.amount,
        supplyAmount: originalData.supplyAmount || Math.round(transaction.amount / 1.1), // 부가세 제외 금액
        vatAmount: originalData.vatAmount || Math.round(transaction.amount / 1.1 * 0.1), // 부가세
        transactionType: 'expense'
      };
      setEditingExpense(expenseData);
      setShowExpenseModal(true);
    } else if (transaction.type === 'income') {
      // 입금 데이터 구조 변환 (지출 모달 사용)
      const originalData = transaction.originalData || {};
      const expenseData = {
        id: transaction.id.replace('income_', ''), // income_ 접두사 제거하여 원본 ID 사용
        companyName: transaction.company || originalData.companyName || '',
        businessLicense: originalData.businessLicense || transaction.businessLicense || '',
        paymentMethod: originalData.paymentMethod || transaction.paymentMethod || '',
        issueDate: originalData.issueDate || transaction.date,
        expenseDate: originalData.expenseDate || transaction.date,
        item: transaction.item || originalData.item || '',
        totalAmount: originalData.totalAmount || transaction.amount,
        supplyAmount: originalData.supplyAmount || transaction.amount, // 입금은 공급가액과 총액이 동일
        vatAmount: 0, // 입금은 부가세 없음
        transactionType: 'income' // 입금 타입으로 설정
      };
      setEditingExpense(expenseData);
      setShowExpenseModal(true);
    } else if (transaction.type === 'revenue') {
      // 매출 리스트와 동일한 데이터 구조로 변환
      // 날짜 형식 변환 (UTC → KST → YYYY-MM-DD)
      const formatDateForModal = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        // 한국 시간대(KST)로 변환하여 YYYY-MM-DD 형식으로 반환
        const formatter = new Intl.DateTimeFormat('ko-KR', {
          timeZone: 'Asia/Seoul',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        const parts = formatter.formatToParts(date);
        const year = parts.find(part => part.type === 'year').value;
        const month = parts.find(part => part.type === 'month').value;
        const day = parts.find(part => part.type === 'day').value;
        return `${year}-${month}-${day}`;
      };
      
      // 원본 데이터에서 모든 필드를 가져와서 매핑
      const originalData = transaction.originalData || {};
      const revenueData = {
        id: transaction.id.replace('revenue_', ''), // revenue_ 접두사 제거하여 원본 ID 사용
        companyName: transaction.company || originalData.company_name || originalData.companyName || '',
        businessLicense: originalData.business_license || originalData.businessLicense || transaction.business_license || transaction.businessLicense || '0000000000', // 기본값 설정
        issueDate: formatDateForModal(originalData.issue_date || originalData.issueDate || transaction.issue_date || transaction.issueDate || transaction.date),
        paymentDate: formatDateForModal(originalData.payment_date || originalData.paymentDate || transaction.payment_date || transaction.paymentDate || transaction.date),
        paymentMethod: originalData.payment_method || originalData.paymentMethod || transaction.payment_method || transaction.paymentMethod || '세금계산서',
        companyType: originalData.company_type || originalData.companyType || transaction.company_type || transaction.companyType || '',
        item: transaction.item || originalData.item || '',
        supplyAmount: originalData.supply_amount || originalData.supplyAmount || transaction.supply_amount || transaction.supplyAmount || Math.round(transaction.amount / 1.1),
        vat: originalData.vat || transaction.vat || Math.round(transaction.amount / 1.1 * 0.1),
        totalAmount: originalData.total_amount || originalData.totalAmount || transaction.total_amount || transaction.totalAmount || transaction.amount
      };
      setEditingRevenue(revenueData);
      setShowRevenueModal(true);
    } else {
    }
  };
  
  // 지출 수정 완료 핸들러
  const handleExpenseUpdated = async (expenseData) => {
    try {
      
      // 서버 형식에 맞게 데이터 변환 (숫자 필드는 숫자로 변환)
      const serverData = {
        companyName: expenseData.companyName,
        businessLicense: expenseData.businessLicense,
        issueDate: expenseData.issueDate,
        expenseDate: expenseData.expenseDate,
        item: expenseData.item,
        paymentMethod: expenseData.paymentMethod,
        totalAmount: parseFloat(expenseData.totalAmount?.toString().replace(/,/g, '') || '0'),
        supplyAmount: parseFloat(expenseData.supplyAmount?.toString().replace(/,/g, '') || '0'),
        vatAmount: parseFloat(expenseData.vatAmount?.toString().replace(/,/g, '') || '0'),
        transactionType: expenseData.transactionType
      };
      
      
      // API 호출로 지출 데이터 수정
      const response = await apiCall(API_ENDPOINTS.EXPENSE_DETAIL(expenseData.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serverData),
      });
      
      
      if (response.success === true || (response.success !== false && response.message && response.message.includes('성공'))) {
        console.log('Expense updated successfully');
        // 모달 닫기
        setShowExpenseModal(false);
        setEditingExpense(null);
        // 데이터 새로고침
        loadData();
      } else {
        console.error('Failed to update expense:', response.message);
      }
    } catch (error) {
      console.error('Error updating expense:', error);
    }
  };
  
  // 수입 수정 완료 핸들러
  const handleRevenueUpdated = async (revenueData) => {
    try {
      
      // 서버 형식에 맞게 데이터 변환 (숫자 필드는 숫자로 변환)
      const serverData = {
        company_name: revenueData.companyName,
        business_license: revenueData.businessLicense,
        issue_date: revenueData.issueDate,
        payment_date: revenueData.paymentDate,
        payment_method: revenueData.paymentMethod,
        company_type: revenueData.companyType,
        item: revenueData.item,
        supply_amount: parseFloat(revenueData.supplyAmount?.toString().replace(/,/g, '') || '0'),
        vat: parseFloat(revenueData.vat?.toString().replace(/,/g, '') || '0'),
        total_amount: parseFloat(revenueData.totalAmount?.toString().replace(/,/g, '') || '0')
      };
      
      
      // API 호출로 매출 데이터 수정
      const response = await apiCall(API_ENDPOINTS.REVENUE_DETAIL(revenueData.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serverData),
      });
      
      
      if (response.success === true || (response.success !== false && response.message && response.message.includes('성공'))) {
        console.log('Revenue updated successfully');
        // 모달 닫기
        setShowRevenueModal(false);
        setEditingRevenue(null);
        // 데이터 새로고침
        loadData();
      } else {
        console.error('Failed to update revenue:', response.message);
      }
    } catch (error) {
      console.error('Error updating revenue:', error);
    }
  };
  
  // 안전한 숫자 변환 함수
  const safeParseFloat = useCallback((value) => {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }, []);

  // 거래내역 생성 함수 (중복 로직 제거)
  const createTransactions = useCallback((monthData) => {
    const transactions = [];
    
    // 매출 데이터 추가
    monthData.revenue.forEach(revenue => {
      transactions.push({
        id: `revenue_${revenue.id}`,
        date: revenue.payment_date || revenue.paymentDate,
        company: revenue.company_name || revenue.companyName,
        item: revenue.item,
        amount: safeParseFloat(revenue.total_amount),
        type: 'revenue',
        business_license: revenue.business_license,
        company_type: revenue.company_type,
        payment_method: revenue.payment_method,
        issue_date: revenue.issue_date,
        payment_date: revenue.payment_date,
        supply_amount: revenue.supply_amount,
        vat: revenue.vat,
        total_amount: revenue.total_amount,
        originalData: revenue
      });
    });
    
    // 입금 데이터 추가
    monthData.income.forEach(income => {
      transactions.push({
        id: `income_${income.id}`,
        date: income.issueDate || income.expenseDate, // issueDate 우선 사용
        company: income.companyName,
        item: income.item,
        amount: safeParseFloat(income.totalAmount),
        type: 'income',
        businessLicense: income.businessLicense,
        paymentMethod: income.paymentMethod,
        originalData: income
      });
    });
    
    // 지출 데이터 추가
    monthData.expense.forEach(expense => {
      transactions.push({
        id: `expense_${expense.id}`,
        date: expense.issueDate || expense.expenseDate, // issueDate 우선 사용
        company: expense.companyName,
        item: expense.item,
        amount: safeParseFloat(expense.totalAmount),
        type: 'expense',
        businessLicense: expense.businessLicense,
        paymentMethod: expense.paymentMethod,
        originalData: expense
      });
    });
    
    // 날짜 기준으로 내림차순 정렬
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return transactions;
  }, [safeParseFloat]);

  // 이전 연도 누적 손익 계산 (공통 함수)
  const calculatePreviousYearCumulative = useCallback((targetYear) => {
    let previousYearCumulative = 0;
    const previousYear = targetYear - 1;
    
    for (let month = 1; month <= 12; month++) {
      // 이전 연도의 매출 (입금일 기준)
      const revenueAmount = Array.isArray(revenueData) ? revenueData
        .filter(revenue => {
          const paymentDate = revenue.payment_date || revenue.paymentDate;
          if (!paymentDate) return false;
          
          const dateObj = parseKoreaDate(paymentDate);
          if (!dateObj) return false;
          
          const itemYear = dateObj.getFullYear();
          const itemMonth = dateObj.getMonth() + 1;
          
          return itemMonth === month && itemYear === previousYear;
        })
        .reduce((sum, revenue) => sum + safeParseFloat(revenue.total_amount), 0) : 0;
      
      // 이전 연도의 입금 (지출 데이터에서)
      const incomeFromExpenses = Array.isArray(expenseData) ? expenseData
        .filter(expense => {
          if (!expense.expenseDate) return false;
          if (expense.transactionType !== 'income') return false;
          
          const dateObj = parseKoreaDate(expense.expenseDate);
          if (!dateObj) return false;
          
          const itemYear = dateObj.getFullYear();
          const itemMonth = dateObj.getMonth() + 1;
          
          return itemMonth === month && itemYear === previousYear;
        })
        .reduce((sum, expense) => sum + safeParseFloat(expense.totalAmount), 0) : 0;
      
      const totalIncome = revenueAmount + incomeFromExpenses;
      
      // 이전 연도의 지출
      const totalExpense = Array.isArray(expenseData) ? expenseData
        .filter(expense => {
          if (!expense.expenseDate) return false;
          if (expense.transactionType !== 'expense') return false;
          
          const dateObj = parseKoreaDate(expense.expenseDate);
          if (!dateObj) return false;
          
          const itemYear = dateObj.getFullYear();
          const itemMonth = dateObj.getMonth() + 1;
          
          return itemMonth === month && itemYear === previousYear;
        })
        .reduce((sum, expense) => sum + safeParseFloat(expense.totalAmount), 0) : 0;
      
      const profit = totalIncome - totalExpense;
      previousYearCumulative += profit;
    }
    
    return previousYearCumulative;
  }, [revenueData, expenseData, parseKoreaDate, safeParseFloat]);
  
  // 날짜 문자열을 년월로 변환하는 함수 (useCalendar 훅 사용)
  const getDateYearMonth = useCallback((dateString) => {
    if (!dateString) return null;
    
    const dateObj = parseKoreaDate(dateString);
    if (!dateObj) return null;
    
    return {
      year: dateObj.getFullYear(),
      month: dateObj.getMonth() + 1
    };
  }, [parseKoreaDate]);

  // 데이터 로드
  const loadData = async () => {
    try {
      setLoading(true);
      
      // 매출 데이터 로드
      const revenueResult = await apiCall('/api/revenue');
      if (revenueResult && revenueResult.success && Array.isArray(revenueResult.data)) {
        setRevenueData(revenueResult.data);
      }

      // 지출 데이터 로드
      const expenseResult = await apiCall('/api/expenses');
      
      // 지출 API는 배열을 직접 반환하는 것 같음
      if (Array.isArray(expenseResult)) {
        setExpenseData(expenseResult);
      } else if (expenseResult && expenseResult.success && Array.isArray(expenseResult.data)) {
        setExpenseData(expenseResult.data);
      }
    } catch (error) {
      // 에러 처리
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 선택된 월의 데이터 계산
  const getMonthData = useCallback((year, month) => {
    
    // 매출 데이터 필터링 (payment_date 기준)
    const monthRevenue = revenueData.filter(revenue => {
      const paymentDate = revenue.payment_date || revenue.paymentDate;
      if (!paymentDate) return false;
      
      // 날짜에서 년월 추출
      const dateInfo = getDateYearMonth(paymentDate);
      if (!dateInfo) return false;
      
      const isMatch = dateInfo.year === year && dateInfo.month === month;
      return isMatch;
    });

    // 지출 데이터 필터링 (expenseDate 기준)
    const monthExpenses = expenseData.filter(expense => {
      if (!expense.expenseDate) return false;
      
      // 날짜에서 년월 추출
      const dateInfo = getDateYearMonth(expense.expenseDate);
      if (!dateInfo) return false;
      
      const isMatch = dateInfo.year === year && dateInfo.month === month;
      return isMatch;
    });

    // 입금/지출 분리
    const income = monthExpenses.filter(expense => expense.transactionType === 'income');
    const expense = monthExpenses.filter(expense => expense.transactionType === 'expense');
    

    // 금액 계산
    const revenueAmount = monthRevenue.reduce((sum, r) => sum + safeParseFloat(r.total_amount), 0);
    const incomeAmount = income.reduce((sum, i) => sum + safeParseFloat(i.totalAmount), 0);
    const expenseAmount = expense.reduce((sum, e) => sum + safeParseFloat(e.totalAmount), 0);

    const totalIncome = revenueAmount + incomeAmount;
    const netProfit = totalIncome - expenseAmount;

    return {
      revenue: monthRevenue,
      income: income,
      expense: expense,
      revenueAmount,
      incomeAmount,
      expenseAmount,
      totalIncome,
      netProfit
    };
  }, [revenueData, expenseData, getDateYearMonth, safeParseFloat]);

  // 이번달 데이터
  const thisMonthData = useMemo(() => {
    return getMonthData(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, getMonthData]);

  // 지난달 데이터
  const lastMonthData = useMemo(() => {
    const lastMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const lastYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    return getMonthData(lastYear, lastMonth);
  }, [selectedYear, selectedMonth, getMonthData]);

  // 지난달 누적 손익 계산 (월별 손익 표와 동일한 로직)
  const lastMonthCumulativeProfit = useMemo(() => {
    const lastMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const lastYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    
    // 이전 연도의 누적 손익 계산
    const previousYearCumulative = calculatePreviousYearCumulative(lastYear);
    
    // 지난달 연도의 누적 손익 계산 (지난달까지)
    let cumulative = previousYearCumulative;
    for (let month = 1; month <= lastMonth; month++) {
      const monthData = getMonthData(lastYear, month);
      cumulative += monthData.netProfit;
    }
    
    return cumulative;
  }, [selectedYear, selectedMonth, calculatePreviousYearCumulative, getMonthData]);

  // 누적 손익 계산 (월별 손익 표와 동일한 로직)
  const cumulativeProfit = useMemo(() => {
    // 이전 연도의 누적 손익 계산
    const previousYearCumulative = calculatePreviousYearCumulative(selectedYear);
    
    // 현재 연도의 누적 손익 계산 (선택된 월까지)
    let cumulative = previousYearCumulative;
    for (let month = 1; month <= selectedMonth; month++) {
      const monthData = getMonthData(selectedYear, month);
      cumulative += monthData.netProfit;
    }
    
    return cumulative;
  }, [selectedYear, selectedMonth, calculatePreviousYearCumulative, getMonthData]);


  // 연도 변경 핸들러 (ExpenseStatus와 동일)
  const handleYearChange = (newYear) => {
    setSelectedYear(newYear);
  };

  // 연도 선택 컴포넌트 (ExpenseStatus와 동일)
  const YearSelector = ({ selectedYear, onYearChange, className = "" }) => {
    return (
      <select 
        value={selectedYear} 
        onChange={(e) => onYearChange(parseInt(e.target.value))}
        className={className}
      >
        {Array.from({ length: 6 }, (_, i) => 2029 - i).map(year => (
          <option key={year} value={year}>
            {year}년
          </option>
        ))}
      </select>
    );
  };

  // 월 옵션 생성
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return { value: month, label: `${month}월` };
  });

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="dashboard-page">
      {/* 헤더 - 제목과 연도/월 선택 */}
      <div className="dashboard-header">
        <h1>월별 입출금</h1>
        <div className="date-selector">
          <YearSelector 
            selectedYear={selectedYear} 
            onYearChange={handleYearChange}
            className="year-select"
          />
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="month-select"
          >
            {monthOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 월별 비교 섹션 */}
      <div className="monthly-comparison">
        {/* 지난달 */}
        <div className="month-section last-month">
          <div className="month-header">
            <h2>지난달 ({selectedMonth === 1 ? selectedYear - 1 : selectedYear}년 {selectedMonth === 1 ? 12 : selectedMonth - 1}월)</h2>
            <div className="month-balance-card">
              <div className={`card-amount ${lastMonthCumulativeProfit >= 0 ? 'profit' : 'loss'}`}>
                {lastMonthCumulativeProfit.toLocaleString()}원
              </div>
            </div>
          </div>
          
          <div className="month-summary">
            <div className="summary-card">
              <div className="card-title">입금</div>
              <div className="card-amount income">{lastMonthData.totalIncome.toLocaleString()}원</div>
            </div>
            <div className="summary-card">
              <div className="card-title">지출</div>
              <div className="card-amount expense">{lastMonthData.expenseAmount.toLocaleString()}원</div>
            </div>
            <div className="summary-card">
              <div className="card-title">손익</div>
              <div className={`card-amount ${lastMonthData.netProfit >= 0 ? 'profit' : 'loss'}`}>
                {lastMonthData.netProfit >= 0 ? '+' : ''}{lastMonthData.netProfit.toLocaleString()}원
              </div>
            </div>
          </div>

          {/* 지난달 거래내역 */}
          <div className="transaction-list">
            <h3>거래내역</h3>
            <div className="list-container">
              {(() => {
                const transactions = createTransactions(lastMonthData);
                
                return transactions.length > 0 ? (
                  transactions.map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className={`transaction-item ${transaction.type === 'income' || transaction.type === 'revenue' ? 'income' : 'expense'}`}
                      onDoubleClick={() => handleTransactionDoubleClick(transaction)}
                      style={{ cursor: (transaction.type === 'expense' || transaction.type === 'income' || transaction.type === 'revenue') ? 'pointer' : 'default' }}
                      title={(transaction.type === 'expense' || transaction.type === 'income' || transaction.type === 'revenue') ? '더블클릭하여 수정' : ''}
                    >
                      <div className="transaction-date">
                        {formatDate(transaction.date)}
                      </div>
                      <div className="transaction-company">
                        {transaction.company}
                      </div>
                      <div className="transaction-item-name">
                        {transaction.item}
                      </div>
                      <div className={`transaction-amount ${transaction.type === 'income' || transaction.type === 'revenue' ? 'income' : 'expense'}`}>
                        {transaction.type === 'income' || transaction.type === 'revenue' ? '+' : '-'}{transaction.amount.toLocaleString()}원
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                    거래내역이 없습니다.
                  </div>
                );
              })()}
            </div>
          </div>

        </div>

        {/* 이번달 */}
        <div className="month-section current-month">
          <div className="month-header">
            <h2>이번달 ({selectedYear}년 {selectedMonth}월)</h2>
            <div className="month-balance-card">
              <div className={`card-amount ${cumulativeProfit >= 0 ? 'profit' : 'loss'}`}>
                {cumulativeProfit.toLocaleString()}원
              </div>
            </div>
          </div>
          
          <div className="month-summary">
            <div className="summary-card">
              <div className="card-title">입금</div>
              <div className="card-amount income">{thisMonthData.totalIncome.toLocaleString()}원</div>
            </div>
            <div className="summary-card">
              <div className="card-title">지출</div>
              <div className="card-amount expense">{thisMonthData.expenseAmount.toLocaleString()}원</div>
            </div>
            <div className="summary-card">
              <div className="card-title">손익</div>
              <div className={`card-amount ${thisMonthData.netProfit >= 0 ? 'profit' : 'loss'}`}>
                {thisMonthData.netProfit >= 0 ? '+' : ''}{thisMonthData.netProfit.toLocaleString()}원
              </div>
            </div>
          </div>

          {/* 이번달 거래내역 */}
          <div className="transaction-list">
            <h3>거래내역</h3>
            <div className="list-container">
              {(() => {
                const transactions = createTransactions(thisMonthData);
                
                return transactions.length > 0 ? (
                  transactions.map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className={`transaction-item ${transaction.type === 'income' || transaction.type === 'revenue' ? 'income' : 'expense'}`}
                      onDoubleClick={() => handleTransactionDoubleClick(transaction)}
                      style={{ cursor: (transaction.type === 'expense' || transaction.type === 'income' || transaction.type === 'revenue') ? 'pointer' : 'default' }}
                      title={(transaction.type === 'expense' || transaction.type === 'income' || transaction.type === 'revenue') ? '더블클릭하여 수정' : ''}
                    >
                      <div className="transaction-date">
                        {formatDate(transaction.date)}
                      </div>
                      <div className="transaction-company">
                        {transaction.company}
                      </div>
                      <div className="transaction-item-name">
                        {transaction.item}
                      </div>
                      <div className={`transaction-amount ${transaction.type === 'income' || transaction.type === 'revenue' ? 'income' : 'expense'}`}>
                        {transaction.type === 'income' || transaction.type === 'revenue' ? '+' : '-'}{transaction.amount.toLocaleString()}원
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                    거래내역이 없습니다.
                  </div>
                );
              })()}
            </div>
          </div>

        </div>
      </div>
      
      {/* 지출 수정 모달 */}
      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        mode="edit"
        initialData={editingExpense}
        onSave={handleExpenseUpdated}
      />
      
      {/* 수입 수정 모달 */}
      <RevenueModal
        isOpen={showRevenueModal}
        onClose={() => setShowRevenueModal(false)}
        onSave={handleRevenueUpdated}
        mode="edit"
        initialData={editingRevenue}
        title="매출 수정"
      />
    </div>
  );
};

export default DashboardPage;