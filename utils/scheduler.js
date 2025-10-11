const NotificationService = require('../services/notificationService');
const { logger } = require('./logger');
const DateUtils = require('./dateUtils');

class NotificationScheduler {
  constructor() {
    // lastNotificationDate 제거 (NotificationService에서 중복 방지 처리)
  }

  // 정기 배치 알림 생성 함수
  startScheduledNotifications() {
    logger.info('정기 배치 알림 시스템 시작...');
    
    // 매일 오전 9시에 알림 생성
    const runDailyNotification = () => {
      const todayString = DateUtils.getTodayString();
      
      // 오전 9시 이후에 알림 생성 (NotificationService에서 중복 방지 처리)
      if (DateUtils.isAfter9AM()) {
        logger.info('정기 배치 알림 생성 시작...');
        
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
      }
    };
    
    // 즉시 실행 (서버 시작 시)
    runDailyNotification();
    
    // 스마트 스케줄링: 상황에 따라 체크 주기 조정
    const scheduleNext = () => {
      let interval;
      if (!DateUtils.isAfter9AM()) {
        // 9시 이전: 체크하지 않음 (요구사항)
        interval = 60 * 60 * 1000; // 1시간마다 체크 (9시가 되면 실행되도록)
      } else {
        // 9시 이후: 5분마다 체크 (NotificationService에서 중복 방지)
        interval = 5 * 60 * 1000;
      }
      
      this.hourlyCheck = setTimeout(() => {
        runDailyNotification();
        scheduleNext(); // 다음 스케줄 설정
      }, interval);
    };
    
    scheduleNext(); // 첫 스케줄 시작
    
    logger.info('정기 배치 시스템이 설정되었습니다. (매일 오전 9시)');
    
    return this.hourlyCheck;
  }
}

module.exports = NotificationScheduler;


