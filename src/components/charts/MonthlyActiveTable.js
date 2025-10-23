import React from 'react';

const MonthlyActiveTable = ({ data, selectedYear, onYearChange }) => {
  // 현재 월 확인 함수
  const isCurrentMonth = (month, year) => {
    const now = new Date();
    return month === now.getMonth() + 1 && year === now.getFullYear();
  };

  return (
    <div className="monthly-active-table-container">
      <div className="monthly-active-table-header">
        <h3>월별 활성화 업체 수 (표)</h3>
        <div className="year-selector">
          <label htmlFor="year-select">연도 선택:</label>
          <select 
            id="year-select" 
            value={selectedYear} 
            onChange={(e) => onYearChange(parseInt(e.target.value))}
            className="year-select"
          >
            {Array.from({ length: 6 }, (_, i) => 2029 - i).map(year => (
              <option key={year} value={year}>{year}년</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="monthly-active-table-wrapper">
        <table className="monthly-active-table">
          <thead>
            <tr>
              <th style={{width: '120px', textAlign: 'left', padding: '12px', background: '#f8f9fa', border: '1px solid #e9ecef'}}>구분</th>
              {Array.from({ length: 12 }, (_, i) => {
                const month = i + 1;
                const isCurrent = isCurrentMonth(month, selectedYear);
                return (
                  <th 
                    key={i} 
                    style={{
                      minWidth: '60px',
                      textAlign: 'center',
                      padding: '12px',
                      background: isCurrent ? '#64b5f6' : '#f8f9fa',
                      color: isCurrent ? 'white' : '#333',
                      border: '1px solid #e9ecef'
                    }}
                  >
                    {month}월
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{width: '120px', textAlign: 'left', padding: '12px', background: '#f8f9fa', border: '1px solid #e9ecef', fontWeight: '400', fontSize: '14px'}}>컨설팅 업체</td>
              {data.consulting.map((count, index) => {
                const month = index + 1;
                const isCurrent = isCurrentMonth(month, selectedYear);
                return (
                  <td 
                    key={index} 
                    style={{
                      minWidth: '60px',
                      textAlign: 'center',
                      padding: '12px',
                      background: isCurrent ? '#e3f2fd' : 'white',
                      border: '1px solid #e9ecef',
                      fontWeight: '400',
                      fontSize: '14px'
                    }}
                  >
                    {count}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td style={{width: '120px', textAlign: 'left', padding: '12px', background: '#f8f9fa', border: '1px solid #e9ecef', fontWeight: '400', fontSize: '14px'}}>일반 업체</td>
              {data.general.map((count, index) => {
                const month = index + 1;
                const isCurrent = isCurrentMonth(month, selectedYear);
                return (
                  <td 
                    key={index} 
                    style={{
                      minWidth: '60px',
                      textAlign: 'center',
                      padding: '12px',
                      background: isCurrent ? '#e3f2fd' : 'white',
                      border: '1px solid #e9ecef',
                      fontWeight: '400',
                      fontSize: '14px'
                    }}
                  >
                    {count}
                  </td>
                );
              })}
            </tr>
            <tr style={{background: '#f0f0f0'}}>
              <td style={{width: '120px', textAlign: 'left', padding: '12px', background: '#f0f0f0', border: '1px solid #e9ecef', fontWeight: '400', fontSize: '14px'}}>합계</td>
              {data.total.map((count, index) => {
                const month = index + 1;
                const isCurrent = isCurrentMonth(month, selectedYear);
                return (
                  <td 
                    key={index} 
                    style={{
                      minWidth: '60px',
                      textAlign: 'center',
                      padding: '12px',
                      background: isCurrent ? '#e3f2fd' : '#f0f0f0',
                      border: '1px solid #e9ecef',
                      fontWeight: '500',
                      fontSize: '14px'
                    }}
                  >
                    {count}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MonthlyActiveTable;
