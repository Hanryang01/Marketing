import React, { useState, useEffect, useCallback } from 'react';
import { apiCall, API_ENDPOINTS } from '../config/api';
import { useCalendar } from '../hooks/useCalendar';
import './UserRevenueModal.css';

const UserRevenueModal = ({ isOpen, onClose, user }) => {
  const [revenueList, setRevenueList] = useState([]);
  const [loading, setLoading] = useState(false);
  const { formatDate } = useCalendar();

  const fetchUserRevenue = useCallback(async () => {
    if (!user || !user.businessLicense) return;
    
    setLoading(true);
    try {
      const result = await apiCall(API_ENDPOINTS.REVENUE);
      
      if (result && result.success && Array.isArray(result.data)) {
        // 해당 사용자(사업자등록번호)의 매출 데이터만 필터링
        const userRevenue = result.data.filter(revenue => {
          const revenueBusinessLicense = revenue.business_license || revenue.businessLicense || '';
          const userBusinessLicense = user.businessLicense || user.business_license || '';
          // 사업자등록번호 비교 (하이픈 제거 후 비교)
          const normalizeLicense = (license) => license.replace(/-/g, '').replace(/\s/g, '');
          return normalizeLicense(revenueBusinessLicense) === normalizeLicense(userBusinessLicense);
        });
        
        // 발행일 기준 내림차순 정렬
        userRevenue.sort((a, b) => {
          const dateA = new Date(a.issue_date || a.issueDate || '');
          const dateB = new Date(b.issue_date || b.issueDate || '');
          return dateB - dateA;
        });
        
        setRevenueList(userRevenue);
      }
    } catch (error) {
      console.error('매출 데이터 로드 중 오류:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 사용자별 매출 데이터 가져오기
  useEffect(() => {
    if (isOpen && user) {
      fetchUserRevenue();
    }
  }, [isOpen, user, fetchUserRevenue]);

  if (!isOpen) return null;

  // 매출 합계 계산
  const totalAmount = revenueList.reduce((sum, revenue) => {
    const amount = revenue.supply_amount || revenue.supplyAmount || 0;
    return sum + Number(amount);
  }, 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="user-revenue-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{user?.companyName || '회사'} 매출 내역</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {loading ? (
            <div className="loading-container">
              <div>로딩 중...</div>
            </div>
          ) : revenueList.length === 0 ? (
            <div className="empty-container">
              <div>매출 내역이 없습니다.</div>
            </div>
          ) : (
            <div className="revenue-table-container">
              <table className="revenue-table">
                <thead>
                  <tr>
                    <th>회사명</th>
                    <th>발행일</th>
                    <th>항목</th>
                    <th>업체 형태</th>
                    <th>공급가액</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueList.map((revenue) => (
                    <tr key={revenue.id}>
                      <td>{revenue.company_name || revenue.companyName || '-'}</td>
                      <td>{formatDate(revenue.issue_date || revenue.issueDate)}</td>
                      <td>{revenue.item || '-'}</td>
                      <td>{revenue.company_type || revenue.companyType || '-'}</td>
                      <td className="amount-cell">
                        {revenue.supply_amount 
                          ? Number(revenue.supply_amount).toLocaleString() + '원'
                          : revenue.supplyAmount 
                          ? Number(revenue.supplyAmount).toLocaleString() + '원'
                          : '0원'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <div className="total-amount-container">
            <span className="total-amount-label">합계 : </span>
            <span className="total-amount-value">{totalAmount.toLocaleString()}원</span>
          </div>
          <button className="close-button-footer" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserRevenueModal;

