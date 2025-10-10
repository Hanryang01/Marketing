const { logger } = require('../utils/logger');

// pool을 매개변수로 받도록 수정
let pool;

class NotificationService {
  // pool 설정
  static setPool(databasePool) {
    pool = databasePool;
  }

  // 데이터베이스 연결 헬퍼
  static async withDatabase(callback) {
    const connection = await pool.getConnection();
    try {
      return await callback(connection);
    } finally {
      connection.release();
    }
  }

  // 알림 조회
  static async getNotifications() {
    return await this.withDatabase(async (connection) => {
      const [result] = await connection.execute(`
        SELECT id, type, title, message, is_read, created_at, read_at, expires_at
        FROM notifications 
        WHERE expires_at > NOW()
        ORDER BY created_at DESC
      `);
      return result;
    });
  }

  // 알림 읽음 처리
  static async markAsRead(id) {
    return await this.withDatabase(async (connection) => {
      const [result] = await connection.execute(`
        UPDATE notifications 
        SET is_read = true, read_at = NOW()
        WHERE id = ? AND expires_at > NOW()
      `, [id]);
      return result;
    });
  }

  // 알림 삭제
  static async deleteNotification(id) {
    return await this.withDatabase(async (connection) => {
      const [result] = await connection.execute(`
        DELETE FROM notifications 
        WHERE id = ?
      `, [id]);
      return result;
    });
  }

  // 알림 생성 (기존 checkAndCreateNotifications 로직)
  static async createNotifications() {
    try {
      logger.info('알림 생성 시작...');
      
      const connection = await pool.getConnection();
      
      // 현재 날짜 계산
      const today = new Date();
      const todayString = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0');
      
      // 14일 후 날짜 계산
      const twoWeeksLater = new Date(today);
      twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
      const twoWeeksLaterString = twoWeeksLater.getFullYear() + '-' + 
        String(twoWeeksLater.getMonth() + 1).padStart(2, '0') + '-' + 
        String(twoWeeksLater.getDate()).padStart(2, '0');
      
      // 1일 후 날짜 계산
      const oneDayLater = new Date(today);
      oneDayLater.setDate(oneDayLater.getDate() + 1);
      const oneDayLaterString = oneDayLater.getFullYear() + '-' + 
        String(oneDayLater.getMonth() + 1).padStart(2, '0') + '-' + 
        String(oneDayLater.getDate()).padStart(2, '0');
      
      logger.info(`오늘: ${todayString}`);
      logger.info(`14일 후: ${twoWeeksLaterString}`);
      logger.info(`1일 후: ${oneDayLaterString}`);
      
      // 오늘 이미 생성된 알림이 있는지 확인 (중복 방지)
      const [existingNotifications] = await connection.execute(`
        SELECT COUNT(*) as count FROM notifications 
        WHERE DATE(CONVERT_TZ(created_at, '+00:00', '+09:00')) = ? 
        AND type IN ('end_date_14days', 'end_date_1day', 'tax_invoice')
      `, [todayString]);
      
      if (existingNotifications[0].count > 0) {
        logger.warning(`오늘 이미 알림이 생성되었습니다. (기존 알림 ${existingNotifications[0].count}개)`);
        connection.release();
        return { success: true, message: '오늘 이미 알림이 생성되었습니다.', count: existingNotifications[0].count };
      }
      
      let notificationCount = 0;
      
      // 14일 후 종료 예정 사용자들
      const [twoWeekEndUsers] = await connection.execute(`
        SELECT id, company_name, user_id, end_date
        FROM users 
        WHERE approval_status = '승인 완료'
        AND company_type IN ('컨설팅 업체', '일반 업체')
        AND end_date IS NOT NULL
        AND DATE(CONVERT_TZ(end_date, '+00:00', '+09:00')) = ?
      `, [twoWeeksLaterString]);
      
      // 1일 후 종료 예정 사용자들
      const [oneDayEndUsers] = await connection.execute(`
        SELECT id, company_name, user_id, end_date
        FROM users 
        WHERE approval_status = '승인 완료'
        AND company_type IN ('컨설팅 업체', '일반 업체')
        AND end_date IS NOT NULL
        AND DATE(CONVERT_TZ(end_date, '+00:00', '+09:00')) = ?
      `, [oneDayLaterString]);
      
      // 14일 후 종료일 알림 생성
      for (const user of twoWeekEndUsers) {
        try {
          await connection.execute(`
            INSERT INTO notifications (user_id, type, title, message, created_at, expires_at)
            VALUES (?, 'end_date_14days', ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY))
          `, [
            user.id,
            '서비스 종료 예정 알림',
            `【${user.company_name}】의 서비스가 14일 후(${twoWeeksLaterString}) 종료됩니다.`
          ]);
          notificationCount++;
          logger.success(`14일 후 종료일 알림 생성: ${user.company_name} (ID: ${user.id})`);
        } catch (error) {
          logger.error(`14일 후 종료일 알림 생성 실패: ${user.company_name}`, error);
        }
      }
      
      // 1일 후 종료일 알림 생성
      for (const user of oneDayEndUsers) {
        try {
          await connection.execute(`
            INSERT INTO notifications (user_id, type, title, message, created_at, expires_at)
            VALUES (?, 'end_date_1day', ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY))
          `, [
            user.id,
            '서비스 종료 임박 알림',
            `【${user.company_name}】의 서비스가 1일 후(${oneDayLaterString}) 종료됩니다.`
          ]);
          notificationCount++;
          logger.success(`1일 후 종료일 알림 생성: ${user.company_name} (ID: ${user.id})`);
        } catch (error) {
          logger.error(`1일 후 종료일 알림 생성 실패: ${user.company_name}`, error);
        }
      }
      
      // 세금계산서 알림 생성 (기존 로직 유지)
      try {
        const [settings] = await connection.execute(`
          SELECT company_name, day_of_month FROM tax_invoice_notification_settings
          WHERE day_of_month = DAY(NOW())
        `);
        
        for (const setting of settings) {
          try {
            await connection.execute(`
              INSERT INTO notifications (user_id, type, title, message, created_at, expires_at)
              VALUES (0, 'tax_invoice', ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY))
            `, [
              '세금계산서 발행일 알림',
              `【${setting.company_name}】의 세금계산서 발행일입니다.`
            ]);
            notificationCount++;
            logger.success(`세금계산서 알림 생성: ${setting.company_name}`);
          } catch (error) {
            logger.error(`세금계산서 알림 생성 실패: ${setting.company_name}`, error);
          }
        }
      } catch (error) {
        logger.error('세금계산서 알림 처리 실패:', error);
      }
      
      logger.success(`알림 생성 완료: ${notificationCount}개 생성`);
      
      // 만료된 알림 삭제 (7일 이상 된 알림)
      const [deleteResult] = await connection.execute(`
        DELETE FROM notifications 
        WHERE expires_at < NOW()
      `);
      
      if (deleteResult.affectedRows > 0) {
        logger.info(`만료된 알림 삭제: ${deleteResult.affectedRows}개`);
      }
      
      connection.release();
      return { success: true, message: '알림 생성 완료', count: notificationCount };
      
    } catch (error) {
      logger.error('알림 생성 실패:', error);
      return { success: false, message: error.message };
    }
  }

}

module.exports = NotificationService;
