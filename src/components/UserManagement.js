import React, { useState, useEffect, useCallback, useRef } from 'react';
import './UserManagement.css';

// Import the UserDetailModal component
import UserDetailModal from './UserDetailModal';
import AddUserModal from './AddUserModal';
import ApprovalModal from './ApprovalModal';
import MessageModal from './MessageModal';
import RevenueModal from './RevenueModal';
import { useMessage } from '../hooks/useMessage';
import { useCalendar } from '../hooks/useCalendar';
import { isValidBusinessLicense } from '../utils/businessLicenseUtils';
import { isUserActive } from '../utils/userUtils';
import { apiCall, API_ENDPOINTS } from '../config/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [approvalUser, setApprovalUser] = useState(null);
  const [activeTab, setActiveTab] = useState('전체');
  const [companyHistory, setCompanyHistory] = useState([]);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [revenueUser, setRevenueUser] = useState(null);
  
  // 메시지 관련 로직을 useMessage 훅으로 분리
  const messageProps = useMessage();
  const { showMessage } = messageProps;
  const showMessageRef = useRef(showMessage);
  
  // showMessage 함수가 변경될 때마다 ref 업데이트
  useEffect(() => {
    showMessageRef.current = showMessage;
  }, [showMessage]);
  
  // 날짜 처리 관련 로직을 useCalendar 훅으로 분리
  const calendarProps = useCalendar();
  const { formatDate } = calendarProps;
  
  const [searchFilters, setSearchFilters] = useState({
    id: '',
    name: '',
    companyName: ''
  });

  const [newUser, setNewUser] = useState({
    userId: '',
    companyName: '',
    userName: '',
    email: '',
    department: '',
    mobilePhone: '',
    phoneNumber: '',
    faxNumber: '',
    address: '',
    businessLicense: '',
    position: '',
    startDate: '',
    endDate: '',
    pricingPlan: '무료',
    approvalStatus: '승인 예정',
    msdsLimit: 0,
    aiImageLimit: 0,
    aiReportLimit: 0
  });



  // 사용자 목록 로드
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const result = await apiCall(API_ENDPOINTS.USERS, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (result && result.success && Array.isArray(result.data)) {
        const formattedUsers = result.data.map(user => ({
           id: user.id,
           userId: user.user_id,
          companyName: user.company_name,
          userName: user.user_name,
           email: user.email,
          department: user.department,
          mobilePhone: user.mobile_phone,
          phoneNumber: user.phone_number,
          faxNumber: user.fax_number,
          address: user.address,
          businessLicense: user.business_license,
          notes: user.notes,
          accountInfo: user.account_info,
          position: user.manager_position,
          accountantName: user.accountant_name,
          accountantPosition: user.accountant_position,
          accountantMobile: user.accountant_mobile,
          accountantEmail: user.accountant_email,
          representative: user.representative,
          industry: user.industry,
          startDate: user.start_date,
           endDate: user.end_date,
          companyType: user.company_type,
          pricingPlan: user.pricing_plan,
          approvalStatus: user.approval_status,
          isActive: user.is_active,
          msdsLimit: user.msds_limit,
          aiImageLimit: user.ai_image_limit,
          aiReportLimit: user.ai_report_limit,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }));
        
        setUsers(formattedUsers);
      }
    } catch (error) {
      console.error('사용자 데이터 로드 중 오류 발생:', error);
      showMessageRef.current('error', '데이터 로드 실패', '사용자 데이터를 불러오는 중 오류가 발생했습니다.', {
        showCancel: false,
        confirmText: '확인'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // 승인 이력 데이터 로드
  const fetchCompanyHistory = useCallback(async () => {
    try {
      const result = await apiCall(API_ENDPOINTS.COMPANY_HISTORY_LIST, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (result && result.success && result.data && result.data.history && Array.isArray(result.data.history)) {
        setCompanyHistory(result.data.history);
      } else {
        console.error('승인 이력 데이터 형식 오류:', result);
        setCompanyHistory([]);
      }
    } catch (error) {
      console.error('승인 이력 데이터 로드 중 오류 발생:', error);
      setCompanyHistory([]);
    }
  }, []);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadUsers();
    fetchCompanyHistory();
  }, [loadUsers, fetchCompanyHistory]);

  // 탭별 필터링된 사용자 데이터

  // 공통 isUserActive 함수 사용 (import된 함수)

  const getFilteredUsersByTab = () => {
    switch (activeTab) {
      case '무료':
        return users.filter(user => 
          // 업체 형태와 상관없이 승인 예정 상태인 모든 사용자
          user.approvalStatus === '승인 예정'
        ).sort((a, b) => {
          // 종료일 기준 오름차순 정렬 (가장 빠른 날짜부터)
          if (!a.endDate && !b.endDate) return 0;
          if (!a.endDate) return 1;
          if (!b.endDate) return -1;
          return new Date(a.endDate) - new Date(b.endDate);
        });
      case '컨설팅':
        return users.filter(user => 
          user.companyType === '컨설팅 업체' &&
          user.approvalStatus === '승인 완료'
        ).sort((a, b) => {
          // 종료일 기준 오름차순 정렬 (가장 빠른 날짜부터)
          if (!a.endDate && !b.endDate) return 0;
          if (!a.endDate) return 1;
          if (!b.endDate) return -1;
          return new Date(a.endDate) - new Date(b.endDate);
        });
      case '일반':
        return users.filter(user => 
          user.companyType === '일반 업체' &&
          isUserActive({
            approvalStatus: user.approvalStatus,
            companyType: user.companyType,
            pricingPlan: user.pricingPlan,
            startDate: user.startDate,
            endDate: user.endDate
          })
        ).sort((a, b) => {
          // 종료일 기준 오름차순 정렬 (가장 빠른 날짜부터)
          if (!a.endDate && !b.endDate) return 0;
          if (!a.endDate) return 1;
          if (!b.endDate) return -1;
          return new Date(a.endDate) - new Date(b.endDate);
          });
      case '탈퇴':
        return users.filter(user => user.approvalStatus === '탈퇴');
      case '승인':
        // 승인 이력 데이터를 사용자 데이터 형식으로 변환
        if (!companyHistory || !Array.isArray(companyHistory) || companyHistory.length === 0) {
          return [];
        }
        
        const transformedData = companyHistory
          .filter(history => {
            // 승인 완료 이력만 표시 (모든 승인 완료 이력)
            return history.status_type === '승인 완료';
          })
          .map(history => ({
            id: history.id,
            userId: history.user_id_string,
            companyName: history.company_name,
            userName: history.user_name,
            email: history.email,
            managerPosition: history.manager_position || '', // company_history 테이블의 manager_position 필드 사용
            mobilePhone: history.mobile_phone,
            phoneNumber: history.phone_number,
            faxNumber: history.fax_number,
            address: history.address,
            businessLicense: history.business_license,
            position: history.manager_position,
            startDate: history.start_date,
            endDate: history.end_date,
            companyType: history.company_type,
            pricingPlan: history.pricing_plan,
            activeDays: history.active_days || 0,
            activeMonths: history.active_days ? Math.round(history.active_days / 30) : 0,
            approvalStatus: history.approval_status,
            statusType: history.status_type,
            statusDate: history.status_date,
            user_id_string: history.user_id_string
        }))
        .sort((a, b) => {
          // 종료일이 가장 늦은 순서대로 정렬 (내림차순)
          if (!a.endDate && !b.endDate) return 0;
          if (!a.endDate) return 1;
          if (!b.endDate) return -1;
          return new Date(b.endDate) - new Date(a.endDate);
        });
        
        return transformedData;
      default:
        return users;
    }
  };
        
        // 검색 필터 적용
  const getFilteredUsers = () => {
    const tabFilteredData = getFilteredUsersByTab();
    
    return tabFilteredData.filter(user => {
      const idMatch = !searchFilters.id || user.userId?.toLowerCase().includes(searchFilters.id.toLowerCase());
      const nameMatch = !searchFilters.name || user.userName?.toLowerCase().includes(searchFilters.name.toLowerCase());
      const companyMatch = !searchFilters.companyName || user.companyName?.toLowerCase().includes(searchFilters.companyName.toLowerCase());
      
      return idMatch && nameMatch && companyMatch;
    });
  };

  // 필터 변경 핸들러
  const handleFilterChange = (field, value) => {
    setSearchFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 사용자 상세보기
  const handleUserDetail = (user) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  // 더블클릭 핸들러
  const handleDoubleClick = (user) => {
    // 승인 이력 탭에서는 더블 클릭 비활성화
    if (activeTab === '승인') {
      return;
    }
    handleUserDetail(user);
  };

  // 사용자 추가
  const handleAddUser = async (userData) => {
    try {
      // 사업자 등록번호 유효성 검사 (추가 보안)
      if (userData.businessLicense && !isValidBusinessLicense(userData.businessLicense)) {
        showMessage('error', '사업자 등록번호 오류', '사업자 등록번호는 숫자 10자리여야 합니다.', {
          showCancel: false,
          confirmText: '확인'
        });
        return;
      }
      
      // 프론트엔드 필드명을 서버 필드명으로 변환
      const serverData = {
        company_name: userData.companyName,
        user_id: userData.userId,
        email: userData.email,
        password_hash: 'default_hash_for_existing_users',
        company_type: userData.companyType || '무료 사용자',
        user_name: userData.userName,
        department: userData.department,
        mobile_phone: userData.mobilePhone,
        business_license: userData.businessLicense,
        phone_number: userData.phoneNumber,
        fax_number: userData.faxNumber,
        address: userData.address,
        notes: '',
        msds_limit: userData.msdsLimit || 0,
        ai_image_limit: userData.aiImageLimit || 0,
        ai_report_limit: userData.aiReportLimit || 0,
        is_active: true,
        approval_status: userData.approvalStatus,
        pricing_plan: userData.pricingPlan,
        start_date: userData.startDate,
        end_date: userData.endDate,
        manager_position: userData.position || '',
        representative: '',  // 대표자는 별도로 입력받지 않으므로 빈 문자열
        industry: ''
      };

      const result = await apiCall(API_ENDPOINTS.USERS, {
        method: 'POST',
        body: JSON.stringify(serverData)
      });
      
      if (result.success && result.data && result.data.userId) {
        showMessage('success', '성공', '사용자가 성공적으로 추가되었습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
        setShowAddUserModal(false);
        setNewUser({
          userId: '',
          companyName: '',
          userName: '',
          email: '',
          department: '',
          mobilePhone: '',
          phoneNumber: '',
          faxNumber: '',
          address: '',
          businessLicense: '',
          position: '',
          startDate: '',
          endDate: '',
          pricingPlan: '무료',
          approvalStatus: '승인 예정',
          msdsLimit: 0,
          aiImageLimit: 0,
          aiReportLimit: 0
        });
        await loadUsers();
      } else {
        // 구체적인 오류 메시지 표시
        let errorTitle = '사용자 추가 오류';
        let errorMessage = result.error || '사용자 추가에 실패했습니다.';
        
        // 특정 오류에 대한 더 구체적인 메시지
        if (result.error && result.error.includes('이미 사용 중인 사용자 ID')) {
          errorTitle = '중복된 사용자 ID';
          errorMessage = `입력하신 사용자 ID "${userData.userId}"는 이미 사용 중입니다.\n\n다른 사용자 ID를 입력해주세요.`;
        } else if (result.error && result.error.includes('사용자 ID는 필수')) {
          errorTitle = '필수 입력 항목 누락';
          errorMessage = '사용자 ID는 반드시 입력해야 합니다.\n\n사용자 ID를 입력해주세요.';
        }
        
        showMessage('error', errorTitle, errorMessage, {
          showCancel: false,
          confirmText: '확인'
        });
      }
     } catch (error) {
      
      // 네트워크 오류나 서버 연결 오류에 대한 구체적인 메시지
      let errorTitle = '사용자 추가 오류';
      let errorMessage = '사용자 추가 중 오류가 발생했습니다.';
      
      if (error.message && error.message.includes('Failed to fetch')) {
        errorTitle = '서버 연결 오류';
        errorMessage = '서버에 연결할 수 없습니다.\n\n네트워크 연결을 확인하고 다시 시도해주세요.';
      } else if (error.message && error.message.includes('HTTP error')) {
        errorTitle = '서버 오류';
        errorMessage = '서버에서 오류가 발생했습니다.\n\n잠시 후 다시 시도해주세요.';
      } else if (error.message) {
        errorMessage = `오류가 발생했습니다.\n\n${error.message}`;
      }
      
      showMessage('error', errorTitle, errorMessage, {
         showCancel: false,
         confirmText: '확인'
       });
     }
  };


  // 사용자 상세 저장
  const handleDetailSave = async (userData) => {
    try {
      // 사업자 등록번호 유효성 검사
      if (userData.business_license && !isValidBusinessLicense(userData.business_license)) {
        showMessage('error', '사업자 등록번호 오류', '사업자 등록번호는 숫자 10자리여야 합니다.', {
          showCancel: false,
          confirmText: '확인'
        });
        return;
      }
      
      // 승인 탭에서 수정하는 경우, 실제 사용자 ID를 찾아서 사용
      let actualUserId = userData.id;
      
      if (activeTab === '승인' && selectedUser) {
        // 승인 이력에서 실제 사용자 ID 찾기
        const historyItem = companyHistory.find(history => 
          history.user_id_string === selectedUser.userId && 
          history.company_name === selectedUser.companyName
        );
        
        if (historyItem && historyItem.user_id) {
          actualUserId = historyItem.user_id;
        } else {
          // 승인 이력에서 찾을 수 없는 경우, users 배열에서 찾기
          const actualUser = users.find(user => 
            user.userId === selectedUser.userId && 
            user.companyName === selectedUser.companyName
          );
          if (actualUser) {
            actualUserId = actualUser.id;
          }
        }
      }
      
      const result = await apiCall(API_ENDPOINTS.USER_DETAIL(actualUserId), {
        method: 'PUT',
        body: JSON.stringify(userData)
      });
      
      if (result.message) {
        await loadUsers();
        
        // selectedUser 업데이트 (모달이 열려있는 동안 데이터 동기화)
        if (selectedUser) {
          const updatedUser = {
            ...selectedUser,
            companyName: userData.company_name,
            userName: userData.user_name,
            email: userData.email,
            department: userData.department,
            mobilePhone: userData.mobile_phone,
            phoneNumber: userData.phone_number,
            faxNumber: userData.fax_number,
            address: userData.address,
            businessLicense: userData.business_license,
            notes: userData.notes,
            accountInfo: userData.account_info,
            companyType: userData.company_type,
            approvalStatus: userData.approval_status,
            isActive: userData.is_active,
            pricingPlan: userData.pricing_plan,
            startDate: userData.start_date,
            endDate: userData.end_date,
            managerPosition: userData.manager_position,
            accountantName: userData.accountant_name,
            accountantPosition: userData.accountant_position,
            accountantMobile: userData.accountant_mobile,
            accountantEmail: userData.accountant_email,
            representative: userData.representative,
            industry: userData.industry,
            msdsLimit: userData.msds_limit,
            aiImageLimit: userData.ai_image_limit,
            aiReportLimit: userData.ai_report_limit
          };
          setSelectedUser(updatedUser);
        }
        
        showMessage('success', '성공', '사용자 정보가 성공적으로 저장되었습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
        // 저장 성공 후 모달 닫기
        setShowDetailModal(false);
      } else {
        showMessage('error', '오류', result.error || '사용자 정보 저장에 실패했습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
      }
    } catch (error) {
      showMessage('error', '오류', '사용자 정보 저장 중 오류가 발생했습니다.', {
        showCancel: false,
        confirmText: '확인'
      });
    }
  };

  // 승인 관리 모달 열기
  const handleOpenApprovalModal = (user) => {
    setApprovalUser(user);
    setShowApprovalModal(true);
  };

  // 매출 모달 열기
  const handleOpenRevenueModal = (user) => {
    setRevenueUser({
      companyName: user.companyName || '',
      businessLicense: user.businessLicense || '',
      companyType: user.companyType || '',
      issueDate: '',
      paymentDate: '',
      paymentMethod: '세금계산서',
      item: '',
      supplyAmount: '',
      vat: '',
      totalAmount: ''
    });
    setShowRevenueModal(true);
  };


  // 매출 저장
  const handleRevenueSave = async (revenueData) => {
    // 사업자 등록번호 유효성 검사
    if (revenueData.businessLicense && !isValidBusinessLicense(revenueData.businessLicense)) {
      messageProps.showMessage('error', '사업자 등록번호 오류', '사업자 등록번호는 숫자 10자리여야 합니다.', {
        showCancel: false,
        confirmText: '확인'
      });
      return;
    }
    
    // 필수 필드 검증
    if (!revenueData.companyName || !revenueData.businessLicense || !revenueData.issueDate || !revenueData.paymentMethod || !revenueData.companyType || !revenueData.item || !revenueData.supplyAmount) {
      messageProps.showMessage('error', '오류', '필수 항목을 모두 입력해주세요.', {
        showCancel: false,
        confirmText: '확인'
      });
      return;
    }

    try {
      // 날짜 형식 변환 (8자리 숫자를 DATE 형식으로 변환)
      let formattedIssueDate = revenueData.issueDate || null;
      let formattedPaymentDate = revenueData.paymentDate || null;
      
      // 콤마 제거하고 숫자로 변환하여 서버 데이터 구성
      const serverData = {
        company_name: revenueData.companyName,
        business_license: revenueData.businessLicense || '',
        issue_date: formattedIssueDate,
        payment_date: formattedPaymentDate,
        payment_method: revenueData.paymentMethod,
        company_type: revenueData.companyType,
        item: revenueData.item,
        supply_amount: parseFloat(revenueData.supplyAmount.replace(/,/g, '')) || 0,
        vat: parseFloat(revenueData.vat.replace(/,/g, '')) || 0,
        total_amount: parseFloat(revenueData.totalAmount.replace(/,/g, '')) || 0
      };

      const result = await apiCall(API_ENDPOINTS.REVENUE, {
        method: 'POST',
        body: JSON.stringify(serverData)
      });
      
      if (result.success) {
        messageProps.showMessage('success', '성공', '매출이 성공적으로 등록되었습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
        setShowRevenueModal(false);
        setRevenueUser(null);
      } else {
        messageProps.showMessage('error', '오류', result.error || '매출 등록 중 오류가 발생했습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
      }
    } catch (error) {
      messageProps.showMessage('error', '오류', '매출 등록 중 오류가 발생했습니다.', {
        showCancel: false,
        confirmText: '확인'
      });
    }
  };

  // 승인 저장
  const handleApprovalSave = async (approvalData) => {
    try {
      // 승인 관리 모드에서는 사업자 등록번호 검증을 하지 않음
      // (승인 관리 모달에는 사업자 등록번호 입력창이 없음)
      
      // 프론트엔드 필드명을 서버 필드명으로 변환
      const serverData = {
        id: approvalData.id,
        company_name: approvalData.companyName || approvalData.company_name,
        user_id: approvalData.userId || approvalData.user_id,
        email: approvalData.email,
        company_type: approvalData.companyType || approvalData.company_type,
        user_name: approvalData.userName || approvalData.user_name,
        department: approvalData.department,
        mobile_phone: approvalData.mobilePhone || approvalData.mobile_phone,
        business_license: approvalData.businessLicense || approvalData.business_license,
        phone_number: approvalData.phoneNumber || approvalData.phone_number,
        fax_number: approvalData.faxNumber || approvalData.fax_number,
        address: approvalData.address,
        notes: approvalData.notes || '',
        account_info: approvalData.accountInfo || approvalData.account_info || '',
        msds_limit: approvalData.msdsLimit || approvalData.msds_limit || 0,
        ai_image_limit: approvalData.aiImageLimit || approvalData.ai_image_limit || 0,
        ai_report_limit: approvalData.aiReportLimit || approvalData.ai_report_limit || 0,
        is_active: approvalData.isActive !== undefined ? approvalData.isActive : (approvalData.is_active !== undefined ? approvalData.is_active : true),
        approval_status: approvalData.approvalStatus || approvalData.approval_status,
        pricing_plan: approvalData.pricingPlan || approvalData.pricing_plan,
        start_date: approvalData.startDate || approvalData.start_date,
        end_date: approvalData.endDate || approvalData.end_date,
        manager_position: approvalData.position,
        accountant_name: approvalData.accountantName || approvalData.accountant_name,
        accountant_position: approvalData.accountantPosition || approvalData.accountant_position,
        accountant_mobile: approvalData.accountantMobile || approvalData.accountant_mobile || '',
        accountant_email: approvalData.accountantEmail || approvalData.accountant_email,
        representative: approvalData.representative || '',
        industry: approvalData.industry || ''
      };

      const result = await apiCall(API_ENDPOINTS.USER_DETAIL(approvalData.id), {
        method: 'PUT',
        body: JSON.stringify(serverData)
      });
      
      if (result.message) {
        // 서버에서 승인 이력을 자동으로 기록하므로 프론트엔드에서는 별도 처리 불필요
        
        // 상태가 변경된 경우 추가 메시지 표시
        if (result.statusChanged && result.newStatus === '승인 예정') {
          showMessage('info', '알림', '종료일이 지난 사용자로 인해 승인 예정 상태로 변경되었습니다.', {
            showCancel: false,
            confirmText: '확인'
          });
        } else {
          showMessage('success', '성공', '승인 정보가 성공적으로 저장되었습니다.', {
            showCancel: false,
            confirmText: '확인'
          });
        }
        
        setShowApprovalModal(false);
        setApprovalUser(null);
        await loadUsers();
        await fetchCompanyHistory();
      } else {
        showMessage('error', '오류', result.error || '승인 정보 저장에 실패했습니다.', {
        showCancel: false,
        confirmText: '확인'
      });
      }
    } catch (error) {
      showMessage('error', '오류', '승인 정보 저장 중 오류가 발생했습니다.', {
        showCancel: false,
        confirmText: '확인'
      });
    }
  };

  // 사용자 삭제
  const handleDeleteUser = async (user) => {
    // 통일된 메시지 팝업창으로 삭제 확인
    showMessage('warning', '사용자 삭제', '이 사용자를 삭제하시겠습니까?', {
      showCancel: true,
      confirmText: '삭제',
      cancelText: '취소',
      onConfirm: () => executeDeleteUser(user)
    });
  };

  // 실제 사용자 삭제 실행 함수
  const executeDeleteUser = async (user) => {
    try {
      const result = await apiCall(API_ENDPOINTS.USER_DETAIL(user.id), {
        method: 'DELETE'
      });
      
      if (result.message) {
        showMessage('success', '성공', '사용자가 성공적으로 삭제되었습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
        await loadUsers();
      } else {
        showMessage('error', '오류', result.error || '사용자 삭제에 실패했습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
      }
    } catch (error) {
      showMessage('error', '오류', '사용자 삭제 중 오류가 발생했습니다.', {
        showCancel: false,
        confirmText: '확인'
      });
    }
  };

  // 이력 삭제
  const handleDeleteHistory = async (historyId) => {
    // 통일된 메시지 팝업창으로 삭제 확인
    showMessage('warning', '이력 삭제', '이 이력을 삭제하시겠습니까?', {
      showCancel: true,
      confirmText: '삭제',
      cancelText: '취소',
      onConfirm: () => executeDeleteHistory(historyId)
    });
  };

  // 실제 삭제 실행 함수
  const executeDeleteHistory = async (historyId) => {
    try {
      const result = await apiCall(API_ENDPOINTS.HISTORY_USER(historyId), {
        method: 'DELETE'
      });
      
      if (result.success) {
        showMessage('success', '성공', '이력이 성공적으로 삭제되었습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
        await fetchCompanyHistory();
      } else {
        showMessage('error', '오류', result.error || '이력 삭제에 실패했습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
      }
    } catch (error) {
      showMessage('error', '오류', '이력 삭제 중 오류가 발생했습니다.', {
        showCancel: false,
        confirmText: '확인'
      });
    }
  };


  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="user-management">
      {/* 탭 네비게이션 */}
      {(
        <div className="user-tabs">
          <div className="user-tabs-left">
            <button 
              className={`tab-button ${activeTab === '전체' ? 'active' : ''}`}
              onClick={() => setActiveTab('전체')}
            >
              👥 전체 ({users.length}명)
            </button>
            <button 
              className={`tab-button ${activeTab === '무료' ? 'active' : ''}`}
              onClick={() => setActiveTab('무료')}
            >
              💰 무료 ({users.filter(user => 
                // 업체 형태와 상관없이 승인 예정 상태인 모든 사용자
                user.approvalStatus === '승인 예정'
              ).length}명)
            </button>
            <button 
              className={`tab-button ${activeTab === '컨설팅' ? 'active' : ''}`}
              onClick={() => setActiveTab('컨설팅')}
            >
              🏢 컨설팅 ({users.filter(user => 
                user.companyType === '컨설팅 업체' &&
                user.approvalStatus === '승인 완료'
              ).length}명)
            </button>
            <button 
              className={`tab-button ${activeTab === '일반' ? 'active' : ''}`}
              onClick={() => setActiveTab('일반')}
            >
              🏭 일반 ({users.filter(user => 
                user.companyType === '일반 업체' &&
                isUserActive({
                  approvalStatus: user.approvalStatus,
                  companyType: user.companyType,
                  pricingPlan: user.pricingPlan,
                  startDate: user.startDate,
                  endDate: user.endDate
                })
              ).length}명)
            </button>
            <button 
              className={`tab-button ${activeTab === '탈퇴' ? 'active' : ''}`}
              onClick={() => setActiveTab('탈퇴')}
            >
              🚪 탈퇴 ({users.filter(user => user.approvalStatus === '탈퇴').length}명)
            </button>
            <button 
              className={`tab-button ${activeTab === '승인' ? 'active' : ''}`}
              onClick={() => setActiveTab('승인')}
            >
              📋 승인 이력 ({Array.isArray(companyHistory) ? companyHistory.length : 0}건)
            </button>
          </div>
          <div className="user-tabs-right">
            <button 
              className="add-user-button"
              onClick={() => {
                // 모달 열기 전에 newUser 초기화
                setNewUser({
                  userId: '',
                  companyName: '',
                  userName: '',
                  email: '',
                  department: '',
                  mobilePhone: '',
                  phoneNumber: '',
                  faxNumber: '',
                  address: '',
                  businessLicense: '',
                  position: '',
                  startDate: '',
                  endDate: '',
                  pricingPlan: '무료',
                  approvalStatus: '승인 예정',
                  msdsLimit: 0,
                  aiImageLimit: 0,
                  aiReportLimit: 0
                });
                setShowAddUserModal(true);
              }}
            >
              사용자 추가
            </button>
          </div>
        </div>
      )}

      {/* 검색 필터 */}
      <div className="search-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="사용자 ID 검색"
            value={searchFilters.id}
            onChange={(e) => handleFilterChange('id', e.target.value)}
          />
        </div>
        <div className="filter-group">
          <input
            type="text"
            placeholder="이름 검색"
            value={searchFilters.name}
            onChange={(e) => handleFilterChange('name', e.target.value)}
          />
        </div>
        <div className="filter-group">
          <input
            type="text"
            placeholder="회사명 검색"
            value={searchFilters.companyName}
            onChange={(e) => handleFilterChange('companyName', e.target.value)}
          />
        </div>
      </div>

             {/* 사용자 목록 테이블 */}
       <div className="users-table-container">
         <table className="users-table">
                      <thead>
              <tr>
                { activeTab === '무료' ? (
                  <>
                    <th>사용자 ID</th>
                    <th>회사명</th>
                    <th>이름</th>
                    <th>직책</th>
                    <th>휴대전화</th>
                    <th>이메일</th>
                    <th>업체 형태</th>
                    <th>요금제</th>
                    <th>시작일</th>
                    <th>종료일</th>
                    <th>승인 상태</th>
                  </>
              ) :  activeTab === '컨설팅' ? (
                  <>
                    <th>사용자 ID</th>
                    <th>회사명</th>
                    <th>이름</th>
                    <th>휴대전화</th>
                    <th>업체 형태</th>
                    <th>요금제</th>
                    <th>시작일</th>
                    <th>종료일</th>
                    <th>MSDS</th>
                    <th>영상분석</th>
                    <th>AI 보고서</th>
                    <th>승인 상태</th>
                    <th>매출</th>
                  </>
              ) :  activeTab === '일반' ? (
                  <>
                    <th>사용자 ID</th>
                    <th>회사명</th>
                    <th>이름</th>
                    <th>휴대전화</th>
                    <th>업체 형태</th>
                    <th>요금제</th>
                    <th>시작일</th>
                    <th>종료일</th>
                    <th>MSDS</th>
                    <th>영상분석</th>
                    <th>AI 보고서</th>
                    <th>승인 상태</th>
                    <th>매출</th>
                  </>
                ) :  activeTab === '승인' ? (
                  <>
                    <th>사용자 ID</th>
                    <th>회사명</th>
                    <th>이름</th>
                    <th>직책</th>
                    <th>휴대전화</th>
                    <th>이메일</th>
                    <th>업체 형태</th>
                    <th>요금제</th>
                    <th>활성화 기간</th>
                    <th>시작일</th>
                    <th>종료일</th>
                    <th>삭제</th>
                  </>
                ) :  activeTab === '탈퇴' ? (
                  <>
                    <th>사용자 ID</th>
                    <th>회사명</th>
                    <th>이름</th>
                    <th>직책</th>
                    <th>휴대전화</th>
                    <th>이메일</th>
                    <th>업체 형태</th>
                    <th>삭제</th>
                  </>
                ) : (
                  <>
                    <th>사용자 ID</th>
                    <th>회사명</th>
                    <th>이름</th>
                    <th>직책</th>
                    <th>휴대전화</th>
                    <th>이메일</th>
                    <th>업체 형태</th>
                    <th>요금제</th>
                    <th>시작일</th>
                    <th>종료일</th>
                    <th>승인 상태</th>
                  </>
                )}
              </tr>
            </thead>
                     <tbody>
             {(() => {
              const filteredData = getFilteredUsers();
               
               return filteredData.length === 0 ? (
                 <tr>
                   <td colSpan={
 activeTab === '무료' ? 11 :
 activeTab === '컨설팅' ? 11 :
 activeTab === '일반' ? 11 :
 activeTab === '탈퇴' ? 8 :
 activeTab === '전체' ? 11 :
 activeTab === '승인' ? 11 : 12
                   } style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                     데이터가 없습니다.
                   </td>
                 </tr>
               ) : filteredData.map((user) => (
                              <tr key={user.id}>
                  <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: activeTab === '승인' ? 'default' : 'pointer' }}>{user.userId}</td>
                  <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: activeTab === '승인' ? 'default' : 'pointer' }}>{user.companyName}</td>
                  <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: activeTab === '승인' ? 'default' : 'pointer' }}>{user.userName}</td>
                  {(activeTab === '전체' || activeTab === '무료' || activeTab === '탈퇴' || activeTab === '승인') && <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: activeTab === '승인' ? 'default' : 'pointer' }}>{user.position || ''}</td>}
                                    { activeTab === '무료' ? (
                    <>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.mobilePhone || user.phoneNumber || ''}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.email}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.companyType || ''}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.pricingPlan || '무료'}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.startDate || ''}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.endDate || ''}</td>
                      <td>
                        <button 
                          className={`status-button ${user.approvalStatus === '승인 완료' ? 'approved' : user.approvalStatus === '탈퇴' ? 'withdrawn' : 'pending'}`}
                          onClick={() => handleOpenApprovalModal(user)}
                          title="승인 관리"
                        >
                          {user.approvalStatus}
                        </button>
                      </td>
                    </>
                  ) :  activeTab === '컨설팅' ? (
                    <>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.mobilePhone || user.phoneNumber || ''}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.companyType || ''}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.pricingPlan || '무료'}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.startDate || ''}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.endDate || ''}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.msdsLimit || 0}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.aiImageLimit || 0}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.aiReportLimit || 0}</td>
                      <td>
                        <button 
                          className={`status-button ${user.approvalStatus === '승인 완료' ? 'approved' : user.approvalStatus === '탈퇴' ? 'withdrawn' : 'pending'}`}
                          onClick={() => handleOpenApprovalModal(user)}
                          title="승인 관리"
                        >
                          {user.approvalStatus}
                        </button>
                      </td>
                      <td>
                        <button 
                          className="status-button revenue-button"
                          onClick={() => handleOpenRevenueModal(user)}
                          title="매출 입력"
                        >
                          매출
                        </button>
                      </td>
                    </>
                  ) :  activeTab === '일반' ? (
                    <>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.mobilePhone || user.phoneNumber || ''}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.companyType || ''}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.pricingPlan || '무료'}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.startDate || ''}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.endDate || ''}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.msdsLimit || 0}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.aiImageLimit || 0}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.aiReportLimit || 0}</td>
                      <td>
                        <button 
                          className={`status-button ${user.approvalStatus === '승인 완료' ? 'approved' : user.approvalStatus === '탈퇴' ? 'withdrawn' : 'pending'}`}
                          onClick={() => handleOpenApprovalModal(user)}
                          title="승인 관리"
                        >
                          {user.approvalStatus}
                        </button>
                      </td>
                      <td>
                        <button 
                          className="status-button revenue-button"
                          onClick={() => handleOpenRevenueModal(user)}
                          title="매출 입력"
                        >
                          매출
                        </button>
                      </td>
                    </>
                  ) :  activeTab === '탈퇴' ? (
                    <>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.mobilePhone || user.phoneNumber || ''}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.email}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.companyType || ''}</td>
                      <td>
                        <button 
                          className="status-button delete-red"
                          onClick={() => handleDeleteUser(user)}
                          title="사용자 삭제"
                        >
                          삭제
                        </button>
                      </td>
                    </>
                  ) :  activeTab === '승인' ? (
                    <>
                      <td>{user.mobilePhone || user.phoneNumber || ''}</td>
                      <td>{user.email}</td>
                      <td>{user.companyType || ''}</td>
                      <td>{user.pricingPlan || '무료'}</td>
                      <td>{user.activeMonths ? `${user.activeMonths}개월` : '-'}</td>
                      <td>{formatDate(user.startDate)}</td>
                      <td>{formatDate(user.endDate)}</td>
                      <td>
                        <button 
                          className="status-button delete-red"
                          onClick={() => {
                            if (!user.id) {
                              showMessage('error', '오류', '삭제할 수 없습니다. ID가 없습니다.', {
                                showCancel: false,
                                confirmText: '확인'
                              });
                              return;
                            }
                            handleDeleteHistory(user.id);
                          }}
                          title="이력 삭제"
                        >
                          삭제
                        </button>
                      </td>
                    </>
                  ) :  activeTab !== '무료' && activeTab !== '컨설팅' && activeTab !== '일반' && activeTab !== '탈퇴' && activeTab !== '승인' ? (
                    <>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.mobilePhone || user.phoneNumber || ''}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.email}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.companyType || ''}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.pricingPlan || '무료'}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.startDate || ''}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.endDate || ''}</td>
                      <td>
                        <button 
                          className={`status-button ${user.approvalStatus === '승인 완료' ? 'approved' : user.approvalStatus === '탈퇴' ? 'withdrawn' : 'pending'}`}
                          onClick={() => handleOpenApprovalModal(user)}
                          title="승인 관리"
                        >
                          {user.approvalStatus}
                        </button>
                      </td>
                    </>
                  ) : (
                     <>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.companyType || ''}</td>
                       <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.pricingPlan || '무료'}</td>
                       <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.startDate || ''}</td>
                       <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.endDate || ''}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.msdsLimit || 0}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.aiImageLimit || 0}</td>
                      <td onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.aiReportLimit || 0}</td>
                       <td>
                        <button 
                          className={`status-button ${user.approvalStatus === '승인 완료' ? 'approved' : user.approvalStatus === '승인 예정' ? 'pending' : user.approvalStatus === '탈퇴' ? 'withdrawn' : 'pending'}`}
                          onClick={() => handleOpenApprovalModal(user)}
                          title="승인 관리"
                        >
                          {user.approvalStatus}
                        </button>
                      </td>
                     </>
                   )}
                </tr>
             ));
           })()}
           </tbody>
        </table>
      </div>

      {/* 사용자 추가 모달 */}
      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onSave={handleAddUser}
        newUser={newUser}
        setNewUser={setNewUser}
        showMessage={showMessage}
      />

      {/* 사용자 상세 정보 모달 */}
        <UserDetailModal
          isOpen={showDetailModal}
          user={selectedUser}
        onClose={() => setShowDetailModal(false)}
          onSave={handleDetailSave}
          isEditable={true}
          showFooter={true}
          companyHistory={companyHistory}
          showMessage={showMessage}
        />

       {/* 승인 관리 모달 */}
       <ApprovalModal
         isOpen={showApprovalModal}
         user={approvalUser}
         onClose={() => setShowApprovalModal(false)}
         onSave={handleApprovalSave}
         companyHistory={companyHistory}
         showMessage={showMessage}
       />

       {/* 매출 입력 모달 */}
       <RevenueModal
         isOpen={showRevenueModal}
         onClose={() => setShowRevenueModal(false)}
         onSave={handleRevenueSave}
         mode="add"
         initialData={revenueUser}
         title="매출 입력"
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

export default UserManagement;