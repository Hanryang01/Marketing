/**
 * 한국 시간대 날짜 계산 유틸리티
 */
class DateUtils {
  /**
   * 현재 한국 시간을 반환
   * @returns {Date} 한국 시간대 Date 객체
   */
  static getKoreaTime() {
    const now = new Date();
    // UTC 시간에 9시간을 더해서 한국 시간 계산
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    return koreaTime;
  }

  /**
   * 한국 시간 기준 오늘 날짜 문자열 반환 (YYYY-MM-DD)
   * @returns {string} 오늘 날짜 문자열
   */
  static getTodayString() {
    const koreaTime = this.getKoreaTime();
    const year = koreaTime.getFullYear();
    const month = String(koreaTime.getMonth() + 1).padStart(2, '0');
    const day = String(koreaTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 한국 시간 기준 N일 후 날짜 문자열 반환 (YYYY-MM-DD)
   * @param {number} days - 추가할 일수
   * @returns {string} N일 후 날짜 문자열
   */
  static getDateStringAfter(days) {
    const koreaTime = this.getKoreaTime();
    const futureDate = new Date(koreaTime);
    futureDate.setDate(futureDate.getDate() + days);
    return futureDate.getFullYear() + '-' + 
      String(futureDate.getMonth() + 1).padStart(2, '0') + '-' + 
      String(futureDate.getDate()).padStart(2, '0');
  }

  /**
   * 한국 시간 기준 14일 후 날짜 문자열 반환
   * @returns {string} 14일 후 날짜 문자열
   */
  static getTwoWeeksLaterString() {
    return this.getDateStringAfter(14);
  }

  /**
   * 한국 시간 기준 1일 후 날짜 문자열 반환
   * @returns {string} 1일 후 날짜 문자열
   */
  static getOneDayLaterString() {
    return this.getDateStringAfter(1);
  }

  /**
   * 한국 시간 기준 현재 시간이 9시 이후인지 확인
   * @returns {boolean} 9시 이후 여부
   */
  static isAfter9AM() {
    const koreaTime = this.getKoreaTime();
    return koreaTime.getHours() >= 9;
  }
}

module.exports = DateUtils;
