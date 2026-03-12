import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './SalesManagement.css';
import { apiCall, API_ENDPOINTS } from '../config/api';
import useExcelExport from '../hooks/useExcelExport';
import { useCalendar } from '../hooks/useCalendar';
import { useMessage } from '../hooks/useMessage';
import MessageModal from './MessageModal';
import RevenueModal from './RevenueModal';
import { formatBusinessLicense, isValidBusinessLicense } from '../utils/businessLicenseUtils';

const SalesManagement = () => {
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddRevenueModal, setShowAddRevenueModal] = useState(false);
  const [showEditRevenueModal, setShowEditRevenueModal] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState(null);
  // 검색 필터 상태
  const [companyNameFilter, setCompanyNameFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [companyTypeFilter, setCompanyTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datePreset, setDatePreset] = useState('');

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
      // 전체
      setStartDate('');
      setEndDate('');
    }
  }, []);

  // 커스텀 필터링 로직
  const filteredRevenueData = useMemo(() => {
    if (!revenueData || revenueData.length === 0) return [];
    return revenueData.filter(item => {
      // 업체명 필터
      if (companyNameFilter) {
        const name = (item.companyName || '').toLowerCase();
        if (!name.includes(companyNameFilter.toLowerCase())) return false;
      }
      // 결제 방법 필터
      if (paymentMethodFilter && item.paymentMethod !== paymentMethodFilter) return false;
      // 업체 형태 필터
      if (companyTypeFilter && item.companyType !== companyTypeFilter) return false;
      // 조회 기간 필터 (발행일 기준)
      if (startDate || endDate) {
        const issueDate = (item.issueDate || '').substring(0, 10);
        if (startDate && issueDate < startDate) return false;
        if (endDate && issueDate > endDate) return false;
      }
      return true;
    });
  }, [revenueData, companyNameFilter, paymentMethodFilter, companyTypeFilter, startDate, endDate]);

  // useCalendar 훅 사용
  const {
    showIssueDatePicker,
    setShowIssueDatePicker,
    showPaymentDatePicker,
    setShowPaymentDatePicker,
    calendarPosition,
    handleDateSelect,
    handleMonthChange,
    getCurrentMonthYear,
    getCalendarDays,
    goToToday,
  } = useCalendar();

  // 업체별 현황 관련 상태
  const [currentView, setCurrentView] = useState('list'); // 'list' 또는 'company'
  const [expandedCompanies, setExpandedCompanies] = useState(new Set());
  
  // 필터링된 매출 데이터 (서버에서 이미 발행일 기준으로 정렬됨)
  const sortedFilteredRevenueData = useMemo(() => {
    return filteredRevenueData;
  }, [filteredRevenueData]);
  
  // 메시지 관련 로직을 useMessage 훅으로 분리
  const messageProps = useMessage();
  const { showMessage } = messageProps;
  
  // 날짜 처리 관련 로직을 useCalendar 훅으로 분리
  const calendarProps = useCalendar();
  const { formatDate } = calendarProps;
  



  // 매출 데이터 가져오기
  const fetchRevenueData = useCallback(async () => {
    try {
      setLoading(true);
            const result = await apiCall(API_ENDPOINTS.REVENUE);
            if (result && result.success && Array.isArray(result.data)) {
        // DB 데이터를 프론트엔드 형식으로 변환 (snake_case → camelCase)
        const formattedData = result.data.map(revenue => ({
          id: revenue.id,
          issueDate: revenue.issue_date,
          companyName: revenue.company_name,
          businessLicense: revenue.business_license,
          paymentDate: revenue.payment_date || '', // null이면 빈 문자열로 변환
          paymentMethod: revenue.payment_method,
          companyType: revenue.company_type,
          item: revenue.item,
          supplyAmount: Number(revenue.supply_amount) || 0, // 명시적으로 숫자로 변환
          vat: Number(revenue.vat) || 0,                   // 명시적으로 숫자로 변환
          totalAmount: Number(revenue.total_amount) || 0,   // 명시적으로 숫자로 변환
          createdAt: revenue.created_at,
          updatedAt: revenue.updated_at
        }));
        
                setRevenueData(formattedData);
              } else {
        console.error('매출 데이터 로드 실패:', result.error);
      }
    } catch (error) {
      console.error('매출 데이터 로드 중 오류:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 매출 데이터 로드
    fetchRevenueData();
  }, [fetchRevenueData]);


  // 필터링된 매출 데이터 (발행일 기준 내림차순 정렬) - useMemo 버전으로 교체됨

  // 엑셀 추출을 위한 컬럼 정의
  const excelColumns = [
    { key: 'issueDate', label: '발행일', width: 12, formatter: (value) => formatDate(value) },
    { key: 'companyName', label: '회사명', width: 25 },
    { key: 'businessLicense', label: '사업자등록번호', width: 18, formatter: (value) => formatBusinessLicense(value) || '' },
    { key: 'item', label: '항목', width: 20 },
    { key: 'supplyAmount', label: '공급가액', width: 12, isNumber: true }, // 숫자 형식 적용
    { key: 'vat', label: '부가세', width: 10, isNumber: true }, // 숫자 형식 적용
    { key: 'totalAmount', label: '총금액', width: 12, isNumber: true } // 숫자 형식 적용
  ];

  // 현재 필터링된 데이터 또는 전체 데이터 사용 (엑셀 추출 시 오름차순 정렬)
  const dataToExport = useMemo(() => {
    const source = sortedFilteredRevenueData.length > 0 ? sortedFilteredRevenueData : revenueData;
    return [...source].sort((a, b) => (a.issueDate || '').localeCompare(b.issueDate || ''));
  }, [sortedFilteredRevenueData, revenueData]);
  
  // 공통 엑셀 추출 훅 사용
  const exportToExcel = useExcelExport(
    dataToExport,
    excelColumns,
    '매출리스트',
    '매출리스트',
    showMessage
  );

  // 업체별 매출 데이터 그룹핑
  const groupRevenueByCompany = useCallback(() => {
    const grouped = {};
    
    revenueData.forEach(revenue => {
      const key = revenue.businessLicense;
      if (!grouped[key]) {
        grouped[key] = {
          companyInfo: {
            name: revenue.companyName,
            businessLicense: key,
            companyType: revenue.companyType
          },
          transactions: [],
          summary: {
            totalRevenue: 0,
            transactionCount: 0
          }
        };
      }
      
      grouped[key].transactions.push(revenue);
      grouped[key].summary.totalRevenue += revenue.supplyAmount;
      grouped[key].summary.transactionCount += 1;
    });
    
    // 총매출액 기준으로 정렬
    const sortedCompanies = Object.values(grouped).sort((a, b) => 
      b.summary.totalRevenue - a.summary.totalRevenue
    );
    
    // 순위 부여
    sortedCompanies.forEach((company, index) => {
      company.rank = index + 1;
    });
    
    return sortedCompanies;
  }, [revenueData]);

  // 업체별 현황 데이터
  const companyRevenueData = useCallback(() => {
    return groupRevenueByCompany();
  }, [groupRevenueByCompany]);

  // 업체별 상세 내역 토글
  const toggleCompanyExpansion = useCallback((businessLicense) => {
    setExpandedCompanies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(businessLicense)) {
        newSet.delete(businessLicense);
      } else {
        newSet.add(businessLicense);
      }
      return newSet;
    });
  }, []);


  // 날짜 선택 처리 (useCalendar 훅 사용)
  const handleRevenueDateSelect = (field, value) => {
    if (showEditRevenueModal) {
      setEditingRevenue(prev => ({ ...prev, [field]: value }));
    }
  };



  // 매출 추가 모달 열기
  const handleOpenAddRevenueModal = () => {
    setShowAddRevenueModal(true);
  };


  // 매출 추가 모달 닫기
  const handleCloseAddRevenueModal = () => {
    setShowAddRevenueModal(false);
  };

  // 새 매출 추가
  const handleAddRevenue = async (revenueData) => {
    // 사업자등록번호 유효성 검사
    if (revenueData.businessLicense && !isValidBusinessLicense(revenueData.businessLicense)) {
      showMessage('error', '사업자등록번호 오류', '사업자등록번호는 숫자 10자리여야 합니다.');
      return;
    }
    
    // 필수 필드 검증 (필수 항목 표시가 되어 있는 모든 항목)
    if (!revenueData.companyName || !revenueData.businessLicense || !revenueData.issueDate || !revenueData.paymentMethod || !revenueData.companyType || !revenueData.item || !revenueData.supplyAmount) {
      showMessage('error', '오류', '필수 항목을 모두 입력해주세요.');
      return;
    }

    try {
      // 날짜 형식 변환 (8자리 숫자를 DATE 형식으로 변환)
      let formattedIssueDate = revenueData.issueDate || null;
      let formattedPaymentDate = revenueData.paymentDate && revenueData.paymentDate !== '-' ? revenueData.paymentDate : null; // '-'일 때 null로 처리
      
      // 콤마 제거하고 숫자로 변환
      const serverData = {
        company_name: revenueData.companyName,
        business_license: revenueData.businessLicense || '',
        issue_date: formattedIssueDate,
        payment_date: formattedPaymentDate,
        payment_method: revenueData.paymentMethod,
        company_type: revenueData.companyType, // 서버에서는 company_type으로 저장
        item: revenueData.item,
        supply_amount: parseFloat(revenueData.supplyAmount.replace(/,/g, '')) || 0,
        vat: parseFloat(revenueData.vat.replace(/,/g, '')) || 0,
        total_amount: parseFloat(revenueData.totalAmount.replace(/,/g, '')) || 0
      };

      const result = await apiCall(API_ENDPOINTS.REVENUE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serverData),
      });

      if (result && result.success) {
        showMessage('success', '성공', '매출이 성공적으로 등록되었습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
        setShowAddRevenueModal(false);
        fetchRevenueData();
      } else {
        console.error('매출 추가 실패:', result);
        showMessage('error', '오류', '매출 등록에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('매출 추가 실패:', error);
      showMessage('error', '오류', '매출 등록 중 오류가 발생했습니다: ' + error.message);
    }
  };



  // 매출 수정 모달 열기
  const handleEditRevenue = (revenue) => {
    // useCalendar의 formatDate 함수 사용 (한국 시간대 처리)
    const editingData = {
      ...revenue,
      issueDate: formatDate(revenue.issueDate),
      paymentDate: revenue.paymentDate ? formatDate(revenue.paymentDate) : null, // null일 때는 null 유지
      companyType: revenue.companyType || '무료 사용자' // 기본값 설정
    };
    
    setEditingRevenue(editingData);
    setShowEditRevenueModal(true);
  };



  // 매출 수정 제출
  const handleEditRevenueSubmit = async (revenueData) => {
    try {
      // 사업자등록번호 유효성 검사
      if (revenueData.businessLicense && !isValidBusinessLicense(revenueData.businessLicense)) {
        showMessage('error', '사업자등록번호 오류', '사업자등록번호는 숫자 10자리여야 합니다.');
        return;
      }
      
      // 필수 항목 유효성 검사
      const missingFields = [];
      
      if (!revenueData.companyName || revenueData.companyName.trim() === '') {
        missingFields.push('회사명');
      }
      if (!revenueData.businessLicense || revenueData.businessLicense.trim() === '') {
        missingFields.push('사업자등록번호');
      }
      if (!revenueData.issueDate) {
        missingFields.push('발행일');
      }
      if (!revenueData.item || revenueData.item.trim() === '') {
        missingFields.push('항목');
      }
      if (!revenueData.supplyAmount || revenueData.supplyAmount === 0) {
        missingFields.push('공급가액');
      }
      if (!revenueData.paymentMethod || revenueData.paymentMethod === '') {
        missingFields.push('결제 형태');
      }
      if (!revenueData.companyType || revenueData.companyType === '') {
        missingFields.push('업체 형태');
      }
      
      if (missingFields.length > 0) {
        showMessage('error', '오류', `다음 필수 항목을 입력해주세요: ${missingFields.join(', ')}`);
        return;
      }
      
      // 콤마 제거하고 숫자로 변환
      const serverData = {
        company_name: revenueData.companyName,
        business_license: revenueData.businessLicense || '',
        issue_date: revenueData.issueDate, // YYYY-MM-DD 형식 그대로 유지
        payment_date: revenueData.paymentDate && revenueData.paymentDate !== '-' ? revenueData.paymentDate : null, // '-'일 때 null로 처리
        payment_method: revenueData.paymentMethod,
        company_type: revenueData.companyType, // company_type으로 저장
        item: revenueData.item,
        supply_amount: parseFloat(revenueData.supplyAmount.toString().replace(/,/g, '')) || 0,
        vat: parseFloat(revenueData.vat.toString().replace(/,/g, '')) || 0,
        total_amount: parseFloat(revenueData.totalAmount.toString().replace(/,/g, '')) || 0
      };

                  const result = await apiCall(API_ENDPOINTS.REVENUE_DETAIL(editingRevenue.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serverData),
      });

      if (result && result.success) {
                showMessage('success', '성공', '매출이 성공적으로 수정되었습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
        setShowEditRevenueModal(false);
        setEditingRevenue(null);
        
        // 즉시 리스트 새로고침
                await fetchRevenueData();
              } else {
        console.error('매출 수정 실패:', result);
        showMessage('error', '오류', '매출 수정에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('매출 수정 실패:', error);
      showMessage('error', '오류', '매출 수정 중 오류가 발생했습니다: ' + error.message);
    }
  };

  // 매출 삭제 확인
  const handleDeleteRevenue = (id) => {
    showMessage('warning', '데이터 삭제', '정말로 삭제하시겠습니까?', {
      showCancel: true,
      confirmText: '삭제',
      cancelText: '취소',
      onConfirm: () => performDeleteRevenue(id)
    });
  };

  // 매출 삭제 실행
  const performDeleteRevenue = async (id) => {
    try {
      const response = await apiCall(API_ENDPOINTS.REVENUE_DETAIL(id), {
        method: 'DELETE',
      });

      if (response && response.success) {
        fetchRevenueData();
        showMessage('success', '성공', '매출이 성공적으로 삭제되었습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
      } else {
        showMessage('error', '오류', '매출 삭제 중 오류가 발생했습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
      }
    } catch (error) {
      console.error('매출 삭제 실패:', error);
      showMessage('error', '오류', '매출 삭제 중 오류가 발생했습니다: ' + error.message, {
        showCancel: false,
        confirmText: '확인'
      });
    }
  };

  // 모달 닫기
  const handleCloseEditRevenueModal = () => {
    setShowEditRevenueModal(false);
    setEditingRevenue(null);
  };


  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="sales-management">
      {/* 뷰 전환 탭 */}
      <div className="view-tabs">
        <div className="view-tabs-left">
          <button 
            className={`view-tab ${currentView === 'list' ? 'active' : ''}`}
            onClick={() => setCurrentView('list')}
          >
            📋 매출 리스트 ({sortedFilteredRevenueData.length}건)
          </button>
          <button 
            className={`view-tab ${currentView === 'company' ? 'active' : ''}`}
            onClick={() => setCurrentView('company')}
          >
            🏢 업체별 매출 현황
          </button>
        </div>
        <div className="view-tabs-right">
          <button 
            className="export-excel-button"
            onClick={exportToExcel}
            title="매출 리스트를 엑셀 파일로 다운로드"
          >
            엑셀 추출
          </button>
          <button 
            className="add-revenue-button"
            onClick={handleOpenAddRevenueModal}
          >
            매출 추가
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
              </select>
              <span className="sales-dropdown-icon">▼</span>
            </div>
          </div>
          <div className="sales-search-group">
            <label className="sales-search-label">업체 형태</label>
            <div className="sales-dropdown-wrapper">
              <select
                className="sales-search-dropdown"
                value={companyTypeFilter}
                onChange={(e) => setCompanyTypeFilter(e.target.value)}
              >
                <option value="">전체</option>
                <option value="컨설팅 업체">컨설팅업체</option>
                <option value="일반 업체">일반업체</option>
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
                <span className="sales-date-icon">📅</span>
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
                <span className="sales-date-icon">📅</span>
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

      {/* 매출 목록 테이블 또는 업체별 현황 */}
      {currentView === 'list' ? (
        <div className="revenue-table-container">
          <table className="revenue-table">
            <thead>
              <tr>
                <th>회사명</th>
                <th>사업자등록번호</th>
                <th>발행일</th>
                <th>입금일</th>
                <th>항목</th>
                <th>결제 방법</th>
                <th>업체 형태</th>
                <th>공급가액</th>
                <th>부가세</th>
                <th>합계 금액</th>
                <th>삭제</th>
              </tr>
            </thead>
            <tbody>
              {sortedFilteredRevenueData.map((revenue) => (
                <tr 
                  key={revenue.id}
                  className="revenue-row"
                  onDoubleClick={() => handleEditRevenue(revenue)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{revenue.companyName}</td>
                  <td>{formatBusinessLicense(revenue.businessLicense)}</td>
                  <td>{formatDate(revenue.issueDate)}</td>
                  <td>{formatDate(revenue.paymentDate)}</td>
                  <td>{revenue.item || '-'}</td>
                  <td>{revenue.paymentMethod || '-'}</td>
                  <td>{revenue.companyType || '-'}</td>
                  <td>{revenue.supplyAmount?.toLocaleString()}원</td>
                  <td>{revenue.vat?.toLocaleString()}원</td>
                  <td>{revenue.totalAmount?.toLocaleString()}원</td>
                  <td>
                    <button 
                      className="status-button delete-red"
                      onClick={(e) => {
                        e.stopPropagation(); // 더블클릭 이벤트 전파 방지
                        handleDeleteRevenue(revenue.id);
                      }}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="company-revenue-grid">
          {companyRevenueData().map((company) => (
            <div key={company.companyInfo.businessLicense} className="company-card">
              <div className="company-card-header">
                <div className="company-header-top">
                  <div className="company-name">{company.companyInfo.name}</div>
                  <div className="company-rank">
                    {company.rank === 1 ? '🥇 1위' : 
                     company.rank === 2 ? '🥈 2위' : 
                     company.rank === 3 ? '🥉 3위' : 
                     `${company.rank}위`}
                  </div>
                </div>
                <div className="company-header-bottom">
                  <span className="business-license">{formatBusinessLicense(company.companyInfo.businessLicense)}</span>
                  <span className="company-type">{company.companyInfo.companyType}</span>
                </div>
                <div className="company-summary">
                  <div className="summary-row">
                    <div className="total-revenue">총 매출: {company.summary.totalRevenue.toLocaleString()}원</div>
                    <button 
                      className="transaction-count-button"
                      onClick={() => toggleCompanyExpansion(company.companyInfo.businessLicense)}
                    >
                      거래 건수: {company.summary.transactionCount}건
                    </button>
                  </div>
                </div>
              </div>
              {expandedCompanies.has(company.companyInfo.businessLicense) && (
                <div className="company-card-body">
                  <div className="transactions-list">
                    {company.transactions.map((transaction) => (
                      <div key={transaction.id} className="transaction-item">
                        <div className="transaction-date">{formatDate(transaction.issueDate)}</div>
                        <div className="transaction-item-name">{transaction.item}</div>
                        <div className="transaction-amount">{transaction.supplyAmount.toLocaleString()}원</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}


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
                  {getCalendarDays('issue', showEditRevenueModal ? editingRevenue?.issueDate : '').map((day, index) => (
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
                  {getCalendarDays('payment', showEditRevenueModal ? editingRevenue?.paymentDate : '').map((day, index) => (
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

      {/* 매출 추가 모달 */}
      <RevenueModal
        isOpen={showAddRevenueModal}
        onClose={handleCloseAddRevenueModal}
        onSave={handleAddRevenue}
        mode="add"
        initialData={{}}
        title="매출 입력"
      />

      {/* 매출 수정 모달 */}
      <RevenueModal
        isOpen={showEditRevenueModal}
        onClose={handleCloseEditRevenueModal}
        onSave={handleEditRevenueSubmit}
        mode="edit"
        initialData={editingRevenue}
        title="매출 수정"
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

export default SalesManagement;

