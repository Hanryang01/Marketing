import React from 'react';

const UserTableHeader = ({ activeTab }) => {
  const renderHeaders = () => {
    switch (activeTab) {
      case '무료':
        return (
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
        );
      case '컨설팅':
        return (
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
        );
      case '일반':
        return (
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
        );
      case '승인':
        return (
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
        );
      case '탈퇴':
        return (
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
        );
      default:
        return (
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
        );
    }
  };

  return (
    <thead>
      <tr>
        {renderHeaders()}
      </tr>
    </thead>
  );
};

export default UserTableHeader;
