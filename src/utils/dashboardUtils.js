// 대시보드 관련 유틸리티 함수들

// 사용자 데이터 변환 (snake_case → camelCase)
export const transformUserData = (users) => {
  return users.map(user => ({
    id: user.id,
    companyName: user.company_name,
    userId: user.user_id,
    userName: user.user_name || user.user_id,
    email: user.email,
    companyType: user.company_type,
    registrationDate: user.registration_date,
    endDate: user.end_date,
    department: user.department || '',
    mobilePhone: user.mobile_phone || '',
    startDate: user.start_date || user.registration_date || '',
    msdsUsage: { current: 0, total: user.msds_limit || 0 },
    aiImageUsage: { current: 0, total: user.ai_image_limit || 0 },
    aiReportUsage: { current: 0, total: user.ai_report_limit || 0 },
    businessLicense: user.business_license || '',
    phoneNumber: user.phone_number || '',
    faxNumber: user.fax_number || '',
    address: user.address || '',
    notes: user.notes || '',
    position: user.manager_position || '',
    approvalStatus: user.approval_status || (user.is_active ? '승인 완료' : (user.company_type === '탈퇴 사용자' ? '탈퇴' : '승인 예정'))
  }));
};

// 매출 데이터 변환 (snake_case → camelCase)
export const transformRevenueData = (revenue) => {
  return revenue.map(item => ({
    id: item.id,
    issueDate: item.issue_date,
    companyName: item.company_name,
    businessLicense: item.business_license,
    paymentDate: item.payment_date || '',
    paymentMethod: item.payment_method,
    companyType: item.company_type,
    item: item.item,
    supplyAmount: Number(item.supply_amount) || 0,
    vat: Number(item.vat) || 0,
    totalAmount: Number(item.total_amount) || 0,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  }));
};

// 사용자 통계 계산
export const calculateUserStats = (users) => {
  const totalUsers = users.length;
  const pendingUsers = users.filter(user => user.approvalStatus === '승인 예정').length;
  const approvedUsers = users.filter(user => user.approvalStatus === '승인 완료').length;
  
  // 무료 사용자 계산 (무료 탭과 동일한 조건)
  const totalFreeUsers = users.filter(user => 
    user.approvalStatus === '승인 예정'
  ).length;
  
  // 컨설팅 업체 (무료 요금제 포함)
  const consultingUsers = users.filter(user => 
    user.companyType === '컨설팅 업체' &&
    user.approvalStatus === '승인 완료'
  ).length;
  
  // 일반 업체 (무료 요금제 포함)
  const generalUsers = users.filter(user => 
    user.companyType === '일반 업체' &&
    user.approvalStatus === '승인 완료'
  ).length;
  
  // 탈퇴 사용자 (업체 형태가 '탈퇴 사용자'인 사용자)
  const withdrawnUsers = users.filter(user => 
    user.companyType === '탈퇴 사용자'
  ).length;

  return {
    totalUsers,
    pendingUsers,
    approvedUsers,
    totalFreeUsers,
    consultingUsers,
    generalUsers,
    withdrawnUsers
  };
};

// 매출 통계 계산
export const calculateRevenueStats = (revenueData) => {
  const totalRevenue = revenueData.reduce((sum, item) => sum + (item.supplyAmount || 0), 0);
  
  // 업체 형태별 매출 계산 (공급가액 기준)
  const consultingRevenue = revenueData
    .filter(item => item.companyType === '컨설팅 업체')
    .reduce((sum, item) => sum + (item.supplyAmount || 0), 0);
  
  const generalRevenue = revenueData
    .filter(item => item.companyType === '일반 업체')
    .reduce((sum, item) => sum + (item.supplyAmount || 0), 0);
  
  const otherRevenue = revenueData
    .filter(item => item.companyType === '기타')
    .reduce((sum, item) => sum + (item.supplyAmount || 0), 0);

  return {
    totalRevenue,
    consultingRevenue,
    generalRevenue,
    otherRevenue
  };
};
