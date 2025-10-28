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
            // 승인 이력 탭: companyHistory 데이터 표시
            companyHistory && companyHistory.length > 0 ? (
              companyHistory.map((history, index) => (
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
