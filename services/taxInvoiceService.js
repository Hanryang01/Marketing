const { logger } = require('../utils/logger');

let pool;

class TaxInvoiceService {
  static setPool(databasePool) {
    pool = databasePool;
  }

  static async withDatabase(callback) {
    const connection = await pool.getConnection();
    try {
      return await callback(connection);
    } finally {
      connection.release();
    }
  }

  // 세금계산서 설정 조회
  static async getSettings() {
    return await this.withDatabase(async (connection) => {
      const [result] = await connection.execute(`
        SELECT id, company_name, day_of_month, is_active, created_at, updated_at
        FROM tax_invoice_notification_settings
        ORDER BY company_name, day_of_month
      `);
      return result;
    });
  }

  // 세금계산서 설정 생성
  static async createSetting(company_name, day_of_month) {
    return await this.withDatabase(async (connection) => {
      // 중복 체크
      const [existing] = await connection.execute(`
        SELECT id FROM tax_invoice_notification_settings
        WHERE company_name = ? AND day_of_month = ?
      `, [company_name, day_of_month]);
      
      if (existing.length > 0) {
        throw new Error('이미 동일한 회사명과 발행일로 설정된 항목이 있습니다.');
      }
      
      const [insertResult] = await connection.execute(`
        INSERT INTO tax_invoice_notification_settings (company_name, day_of_month, is_active)
        VALUES (?, ?, 1)
      `, [company_name, day_of_month]);
      
      return insertResult;
    });
  }

  // 세금계산서 설정 수정
  static async updateSetting(id, company_name, day_of_month, is_active) {
    return await this.withDatabase(async (connection) => {
      const [result] = await connection.execute(`
        UPDATE tax_invoice_notification_settings
        SET company_name = ?, day_of_month = ?, is_active = ?, updated_at = NOW()
        WHERE id = ?
      `, [company_name, day_of_month, is_active ? 1 : 0, id]);
      
      return result;
    });
  }

  // 세금계산서 설정 삭제
  static async deleteSetting(id) {
    return await this.withDatabase(async (connection) => {
      const [result] = await connection.execute(`
        DELETE FROM tax_invoice_notification_settings
        WHERE id = ?
      `, [id]);
      
      return result;
    });
  }
}

module.exports = TaxInvoiceService;


