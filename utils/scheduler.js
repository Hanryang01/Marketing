const NotificationService = require('../services/notificationService');
const { logger } = require('./logger');

class NotificationScheduler {
  constructor() {
    this.lastNotificationDate = null;
  }

  // 정기 배치 알림 생성 함수
  startScheduledNotifications() {
    logger.info('정기 배치 알림 시스템 시작...');
    
    // 매일 오전 9시에 알림 생성
    const runDailyNotification = () => {
      const now = new Date();
      // 서버 환경 변수로 이미 한국 시간으로 설정되어 있음 (process.env.TZ = 'Asia/Seoul')
      const koreaTime = now;
      const currentHour = koreaTime.getHours();
      const currentMinute = koreaTime.getMinutes();
      const todayString = koreaTime.getFullYear() + '-' + 
        String(koreaTime.getMonth() + 1).padStart(2, '0') + '-' + 
        String(koreaTime.getDate()).padStart(2, '0');
      
      logger.info(`현재 한국 시간: ${koreaTime.toLocaleString()}`);
      logger.info(`알림 생성 시간: ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);
      
      // 오전 9시에 알림 생성 (중복 방지)
      if (currentHour === 9 && this.lastNotificationDate !== todayString) {
        logger.info('정기 배치 알림 생성 시작...');
        this.lastNotificationDate = todayString; // 오늘 날짜로 설정
        
        NotificationService.createNotifications()
          .then(result => {
            if (result.success) {
              logger.success(`정기 배치 알림 생성 완료: ${result.count}개 생성`);
            } else {
              logger.error(`정기 배치 알림 생성 실패: ${result.message}`);
            }
          })
          .catch(error => {
            logger.error('정기 배치 알림 생성 중 오류:', error);
          });
      } else if (currentHour === 9) {
        logger.warning('오늘 이미 알림이 생성되었습니다. (중복 방지)');
      }
    };
    
    // 즉시 실행 (서버 시작 시)
    runDailyNotification();
    
    // 매 시간마다 체크 (9시에 실행되도록)
    this.hourlyCheck = setInterval(() => {
      runDailyNotification();
    }, 60 * 60 * 1000); // 1시간마다 체크
    
    logger.info('정기 배치 시스템이 설정되었습니다. (매일 오전 9시)');
    
    return this.hourlyCheck;
  }
}

module.exports = NotificationScheduler;


