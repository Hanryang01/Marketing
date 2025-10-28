import React from 'react';
import UserTableHeader from './UserTableHeader';
import UserTableRow from './UserTableRow';

const UserTable = ({ 
  activeTab, 
  filteredUsers, 
  companyHistory,
  formatDate, 
  handleDoubleClick, 
  handleDeleteUser, 
  handleDeleteHistory,
  handleRevenueUser,
  isUserActive,
  showMessageRef
}) => {
  return (
    <div className="users-table-container">
      <table className="users-table">
        <UserTableHeader activeTab={activeTab} />
        <tbody>
          {activeTab === '승인' ? (
            // 승인 이력 탭: companyHistory 데이터 표시 (종료일 내림차순 정렬)
            companyHistory && companyHistory.length > 0 ? (
              [...companyHistory]
                .sort((a, b) => {
                  // 종료일이 없는 경우 맨 뒤로
                  if (!a.end_date && !b.end_date) return 0;
                  if (!a.end_date) return 1;
                  if (!b.end_date) return -1;
                  
                  // 종료일 기준 내림차순 정렬
                  const dateA = new Date(a.end_date);
                  const dateB = new Date(b.end_date);
                  return dateB.getTime() - dateA.getTime();
                })
                .map((history, index) => (
                <UserTableRow
                  key={`history-${index}`}
                  user={history}
                  activeTab={activeTab}
                  formatDate={formatDate}
                  handleDoubleClick={handleDoubleClick}
                  handleDeleteUser={handleDeleteUser}
                  handleDeleteHistory={handleDeleteHistory}
                  handleRevenueUser={handleRevenueUser}
                  isUserActive={isUserActive}
                  showMessageRef={showMessageRef}
                />
              ))
            ) : (
              <tr>
                <td colSpan="12" style={{ textAlign: 'center', padding: '20px' }}>
                  승인 이력이 없습니다.
                </td>
              </tr>
            )
          ) : (
            // 다른 탭: filteredUsers 데이터 표시
            filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="15" style={{ textAlign: 'center', padding: '20px' }}>
                  데이터가 없습니다.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user, index) => (
                <UserTableRow
                  key={`${user.id}-${index}`}
                  user={user}
                  activeTab={activeTab}
                  formatDate={formatDate}
                  handleDoubleClick={handleDoubleClick}
                  handleDeleteUser={handleDeleteUser}
                  handleDeleteHistory={handleDeleteHistory}
                  handleRevenueUser={handleRevenueUser}
                  isUserActive={isUserActive}
                  showMessageRef={showMessageRef}
                />
              ))
            )
          )}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable;
