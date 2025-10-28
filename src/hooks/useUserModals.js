import { useState, useCallback } from 'react';

const useUserModals = () => {
  // 모달 상태들
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  
  // 선택된 사용자들
  const [selectedUser, setSelectedUser] = useState(null);
  const [revenueUser, setRevenueUser] = useState(null);

  // 새 사용자 폼 상태
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
    notes: '',
    position: '',
    approvalStatus: '승인 예정',
    companyType: '',
    pricingPlan: '무료',
    startDate: '',
    endDate: '',
    msdsLimit: 0,
    aiImageLimit: 0,
    aiReportLimit: 0,
    businessLicense: ''
  });

  // 모달 열기/닫기 핸들러들
  const handleOpenAddUserModal = useCallback(() => {
    setShowAddUserModal(true);
  }, []);

  const handleCloseAddUserModal = useCallback(() => {
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
      notes: '',
      position: '',
      approvalStatus: '승인 예정',
      companyType: '일반 업체',
      pricingPlan: '무료',
      startDate: '',
      endDate: '',
      msdsLimit: 0,
      aiImageLimit: 0,
      aiReportLimit: 0,
      businessLicense: ''
    });
  }, []);

  const handleOpenDetailModal = useCallback((user) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedUser(null);
  }, []);

  const handleOpenRevenueModal = useCallback((user) => {
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
  }, []);

  const handleCloseRevenueModal = useCallback(() => {
    setShowRevenueModal(false);
    setRevenueUser(null);
  }, []);

  // 더블클릭 핸들러
  const handleDoubleClick = useCallback((user) => {
    handleOpenDetailModal(user);
  }, [handleOpenDetailModal]);

  return {
    // 모달 상태들
    showAddUserModal,
    showDetailModal,
    showRevenueModal,
    selectedUser,
    revenueUser,
    setRevenueUser,
    newUser,
    setNewUser,
    
    // 모달 핸들러들
    handleOpenAddUserModal,
    handleCloseAddUserModal,
    handleOpenDetailModal,
    handleCloseDetailModal,
    handleOpenRevenueModal,
    handleCloseRevenueModal,
    handleDoubleClick
  };
};

export default useUserModals;
