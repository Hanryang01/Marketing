import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './DashboardPage.css';
import { apiCall } from '../config/api';
import { useCalendar } from '../hooks/useCalendar';

const DashboardPage = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [revenueData, setRevenueData] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // useCalendar 훅 사용
  const { parseKoreaDate } = useCalendar();
  
  // 안전한 숫자 변환 함수
  const safeParseFloat = useCallback((value) => {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }, []);

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


  // 연도 옵션 생성
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year, label: `${year}년` };
  });

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
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="year-select"
          >
            {yearOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
                잔액  {lastMonthCumulativeProfit >= 0 ? '+' : ''}{lastMonthCumulativeProfit.toLocaleString()}원
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
                const transactions = [];
                
                // 매출 데이터 추가
                lastMonthData.revenue.forEach(revenue => {
                  transactions.push({
                    id: `revenue_${revenue.id}`,
                    date: revenue.payment_date || revenue.paymentDate,
                    company: revenue.company_name || revenue.companyName,
                    item: revenue.item,
                    amount: safeParseFloat(revenue.total_amount),
                    type: 'revenue'
                  });
                });
                
                // 입금 데이터 추가
                lastMonthData.income.forEach(income => {
                  transactions.push({
                    id: `income_${income.id}`,
                    date: income.expenseDate,
                    company: income.companyName,
                    item: income.item,
                    amount: safeParseFloat(income.totalAmount),
                    type: 'income'
                  });
                });
                
                // 지출 데이터 추가
                lastMonthData.expense.forEach(expense => {
                  transactions.push({
                    id: `expense_${expense.id}`,
                    date: expense.expenseDate,
                    company: expense.companyName,
                    item: expense.item,
                    amount: safeParseFloat(expense.totalAmount),
                    type: 'expense'
                  });
                });
                
                // 날짜 기준으로 내림차순 정렬
                transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
                
                return transactions.length > 0 ? (
                  transactions.map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className={`transaction-item ${transaction.type === 'income' || transaction.type === 'revenue' ? 'income' : 'expense'}`}
                    >
                      <div className="transaction-date">
                        {new Date(transaction.date).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })}
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
                잔액  {cumulativeProfit >= 0 ? '+' : ''}{cumulativeProfit.toLocaleString()}원
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
                const transactions = [];
                
                // 매출 데이터 추가
                thisMonthData.revenue.forEach(revenue => {
                  transactions.push({
                    id: `revenue_${revenue.id}`,
                    date: revenue.payment_date || revenue.paymentDate,
                    company: revenue.company_name || revenue.companyName,
                    item: revenue.item,
                    amount: safeParseFloat(revenue.total_amount),
                    type: 'revenue'
                  });
                });
                
                // 입금 데이터 추가
                thisMonthData.income.forEach(income => {
                  transactions.push({
                    id: `income_${income.id}`,
                    date: income.expenseDate,
                    company: income.companyName,
                    item: income.item,
                    amount: safeParseFloat(income.totalAmount),
                    type: 'income'
                  });
                });
                
                // 지출 데이터 추가
                thisMonthData.expense.forEach(expense => {
                  transactions.push({
                    id: `expense_${expense.id}`,
                    date: expense.expenseDate,
                    company: expense.companyName,
                    item: expense.item,
                    amount: safeParseFloat(expense.totalAmount),
                    type: 'expense'
                  });
                });
                
                // 날짜 기준으로 내림차순 정렬
                transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
                
                return transactions.length > 0 ? (
                  transactions.map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className={`transaction-item ${transaction.type === 'income' || transaction.type === 'revenue' ? 'income' : 'expense'}`}
                    >
                      <div className="transaction-date">
                        {new Date(transaction.date).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })}
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
    </div>
  );
};

export default DashboardPage;