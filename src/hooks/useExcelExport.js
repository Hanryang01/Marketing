import { useCallback } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useCalendar } from './useCalendar';

/**
 * 엑셀 추출 공통 훅
 * @param {Array} data - 추출할 데이터 배열
 * @param {Array} columns - 컬럼 정의 배열 [{ key, label, width, formatter?, isNumber? }]
 *   - formatter: 값 포맷팅 함수 (isNumber가 true면 적용 안됨)
 *   - isNumber: 숫자 형식으로 저장할지 여부 (true면 천단위 구분자 형식 적용)
 * @param {string} fileName - 파일명 (확장자 제외)
 * @param {string} sheetName - 시트명
 * @param {Function} showMessage - 메시지 표시 함수
 * @returns {Function} exportToExcel - 엑셀 추출 함수
 */
const useExcelExport = (data, columns, fileName, sheetName, showMessage) => {
  const { formatDate } = useCalendar();

  const exportToExcel = useCallback(() => {
    try {
      if (!data || data.length === 0) {
        showMessage('warning', '경고', '추출할 데이터가 없습니다.');
        return;
      }

      // 엑셀용 데이터 준비
      const excelData = data.map((item, index) => {
        const row = { '순번': index + 1 };
        
        columns.forEach(column => {
          const { key, label, formatter, isNumber } = column;
          let value = item[key];
          
          // 숫자 형식이 아닌 경우에만 formatter 적용
          // isNumber가 true면 원본 숫자 값을 유지 (엑셀에서 숫자로 인식되도록)
          if (!isNumber && formatter) {
            value = formatter(value, item);
          } else if (isNumber) {
            // 숫자 형식인 경우 명시적으로 숫자로 변환
            value = typeof value === 'number' ? value : (parseFloat(value) || 0);
          }
          
          row[label] = value;
        });
        
        return row;
      });

      // 워크북 생성
      const workbook = XLSX.utils.book_new();
      
      // 워크시트 생성
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // 컬럼 너비 설정
      const columnWidths = [
        { wch: 8 }, // 순번
        ...columns.map(col => ({ wch: col.width || 15 }))
      ];
      worksheet['!cols'] = columnWidths;

      // 숫자 형식 적용 (천단위 구분자)
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      // 헤더를 제외한 데이터 행에 숫자 형식 적용
      for (let row = 1; row <= range.e.r; row++) {
        let colIndex = 1; // 순번 컬럼 제외하고 시작
        
        columns.forEach((column, colIdx) => {
          if (column.isNumber) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIndex });
            const dataRow = excelData[row - 1];
            
            // 원본 데이터에서 숫자 값 가져오기
            if (dataRow && dataRow[column.label] !== undefined) {
              const numValue = typeof dataRow[column.label] === 'number' 
                ? dataRow[column.label] 
                : parseFloat(dataRow[column.label]);
              
              if (!isNaN(numValue)) {
                // 셀 생성 또는 가져오기
                if (!worksheet[cellAddress]) {
                  worksheet[cellAddress] = {};
                }
                
                // 숫자 타입과 값을 명확히 설정
                worksheet[cellAddress].t = 'n'; // number type
                worksheet[cellAddress].v = numValue; // 숫자 값
                worksheet[cellAddress].z = '#,##0'; // 천단위 구분자 형식
              }
            }
          }
          colIndex++;
        });
      }

      // 워크북에 워크시트 추가
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // 파일명 생성 (현재 날짜 포함)
      const now = new Date();
      const dateStr = formatDate(now).replace(/-/g, '');
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const finalFileName = `${fileName}_${dateStr}_${timeStr}.xlsx`;

      // 엑셀 파일 생성 및 다운로드
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      saveAs(blob, finalFileName);
      
      showMessage('success', '성공', `${sheetName}이 성공적으로 추출되었습니다.\n파일명: ${finalFileName}`, {
        showCancel: false,
        confirmText: '확인'
      });
      
    } catch (error) {
      console.error('엑셀 추출 중 오류:', error);
      showMessage('error', '오류', '엑셀 파일 추출 중 오류가 발생했습니다.');
    }
  }, [data, columns, fileName, sheetName, showMessage, formatDate]);

  return exportToExcel;
};

export default useExcelExport;
