const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { dbConfig } = require('../src/config/mysql.js');

// 지출 목록 조회
router.get('/', async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    try {
      const [rows] = await connection.execute(`
        SELECT 
          id,
          company_name as companyName,
          business_license as businessLicense,
          issue_date as issueDate,
          expense_date as expenseDate,
          item,
          payment_method as paymentMethod,
          supply_amount as supplyAmount,
          vat_amount as vatAmount,
          total_amount as totalAmount,
          transaction_type as transactionType,
          created_at as createdAt,
          updated_at as updatedAt
        FROM expenses 
        ORDER BY expense_date DESC, created_at DESC
      `);
      
      res.json(rows);
    } catch (sqlError) {
      console.error('SQL 오류:', sqlError);
      res.status(500).json({ error: '데이터베이스 오류: ' + sqlError.message });
    }
  } catch (error) {
    console.error('지출 목록 조회 오류:', error);
    res.status(500).json({ error: '지출 목록 조회에 실패했습니다.' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

// 지출 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    try {
      const [rows] = await connection.execute(`
        SELECT 
          id,
          company_name as companyName,
          business_license as businessLicense,
          issue_date as issueDate,
          expense_date as expenseDate,
          item,
          payment_method as paymentMethod,
          supply_amount as supplyAmount,
          vat_amount as vatAmount,
          total_amount as totalAmount,
          'expense' as transactionType,
          created_at as createdAt,
          updated_at as updatedAt
        FROM expenses 
        WHERE id = ?
      `, [id]);
      
      await connection.end();
      
      if (rows.length === 0) {
        return res.status(404).json({ error: '지출 항목을 찾을 수 없습니다.' });
      }
      
      res.json(rows[0]);
    } catch (sqlError) {
      console.error('SQL 오류:', sqlError);
      await connection.end();
      res.status(500).json({ error: '데이터베이스 오류: ' + sqlError.message });
    }
  } catch (error) {
    console.error('지출 상세 조회 오류:', error);
    res.status(500).json({ error: '지출 상세 조회에 실패했습니다.' });
  }
});

// 지출 추가
router.post('/', async (req, res) => {
  try {
    // 요청 본문 로깅 (디버깅용)
    console.log('📝 지출 추가 요청 데이터:', JSON.stringify(req.body, null, 2));
    
    const {
      companyName,
      businessLicense,
      issueDate,
      expenseDate,
      item,
      paymentMethod,
      supplyAmount,
      vatAmount,
      totalAmount,
      transactionType
    } = req.body;

    // 필수 필드 검증 (expenseDate는 선택 사항)
    if (!companyName || !issueDate || !item || !paymentMethod || 
        supplyAmount === undefined) {
      return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
    }

    // 입금 모드에서는 부가세를 0으로 설정
    const finalVatAmount = transactionType === 'income' ? 0 : (vatAmount || 0);

    const connection = await mysql.createConnection(dbConfig);
    
    // expenseDate가 없으면 null로 저장 (선택적 필드)
    const finalExpenseDate = expenseDate && expenseDate !== '-' && expenseDate.trim() !== '' ? expenseDate : null;
    
    console.log('📝 저장할 데이터:', {
      companyName,
      finalExpenseDate,
      item,
      paymentMethod,
      supplyAmount,
      finalVatAmount,
      totalAmount,
      transactionType
    });
    
    try {
      const [result] = await connection.execute(`
        INSERT INTO expenses (
          company_name,
          business_license,
          issue_date,
          expense_date,
          item,
          payment_method,
          supply_amount,
          vat_amount,
          total_amount,
          transaction_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        companyName || '테스트회사',
        businessLicense || null,
        issueDate || new Date().toISOString().split('T')[0],
        finalExpenseDate,
        item || '테스트항목',
        paymentMethod || '세금계산서',
        parseFloat(supplyAmount) || 0,
        parseFloat(finalVatAmount) || 0,
        parseFloat(totalAmount) || 0,
        transactionType || 'expense'
      ]);
      
      await connection.end();
      
      res.status(201).json({ 
        id: result.insertId,
        message: '지출이 성공적으로 추가되었습니다.' 
      });
    } catch (sqlError) {
      console.error('SQL 오류:', sqlError);
      await connection.end();
      res.status(500).json({ error: '데이터베이스 오류: ' + sqlError.message });
    }
  } catch (error) {
    console.error('지출 추가 오류:', error);
    res.status(500).json({ error: '지출 추가에 실패했습니다.' });
  }
});

// 지출 수정
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 PUT 요청 데이터:', JSON.stringify(req.body, null, 2));
    const {
      companyName,
      businessLicense,
      issueDate,
      expenseDate,
      item,
      paymentMethod,
      supplyAmount,
      vatAmount,
      totalAmount,
      transactionType
    } = req.body;

    // 필수 필드 검증 (expenseDate는 선택 사항)
    if (!companyName || !issueDate || !item || !paymentMethod || 
        supplyAmount === undefined) {
      return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
    }

    // 입금 모드에서는 부가세를 0으로 설정
    const finalVatAmount = transactionType === 'income' ? 0 : (vatAmount || 0);

    const connection = await mysql.createConnection(dbConfig);

    // expenseDate가 없으면 null로 저장 (선택적 필드)
    const finalExpenseDate = expenseDate && expenseDate !== '-' && expenseDate.trim() !== '' ? expenseDate : null;
    console.log('🔍 최종 저장 데이터:', {
      companyName,
      businessLicense,
      issueDate,
      finalExpenseDate,
      item,
      paymentMethod,
      supplyAmount: parseFloat(supplyAmount),
      vatAmount: parseFloat(vatAmount),
      totalAmount: parseFloat(totalAmount)
    });

    try {
      const [result] = await connection.execute(`
        UPDATE expenses SET
          company_name = ?,
          business_license = ?,
          issue_date = ?,
          expense_date = ?,
          item = ?,
          payment_method = ?,
          supply_amount = ?,
          vat_amount = ?,
          total_amount = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        companyName,
        businessLicense || null,
        issueDate || new Date().toISOString().split('T')[0],
        finalExpenseDate,
        item,
        paymentMethod,
        parseFloat(supplyAmount) || 0,
        parseFloat(finalVatAmount) || 0,
        parseFloat(totalAmount) || 0,
        id
      ]);
      
      await connection.end();
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: '지출 항목을 찾을 수 없습니다.' });
      }
      
      res.json({ message: '지출이 성공적으로 수정되었습니다.' });
    } catch (sqlError) {
      console.error('SQL 오류:', sqlError);
      await connection.end();
      res.status(500).json({ error: '데이터베이스 오류: ' + sqlError.message });
    }
  } catch (error) {
    console.error('❌ 지출 수정 오류:', error);
    console.error('❌ SQL 에러:', error.sqlMessage || error.message);
    console.error('❌ 에러 코드:', error.code);
    res.status(500).json({ 
      error: '지출 수정에 실패했습니다.', 
      detail: error.sqlMessage || error.message,
      code: error.code
    });
  }
});

// 지출 삭제
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    const [result] = await connection.execute(
      'DELETE FROM expenses WHERE id = ?',
      [id]
    );
    
    await connection.end();
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '지출 항목을 찾을 수 없습니다.' });
    }
    
    res.json({ message: '지출이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('지출 삭제 오류:', error);
    res.status(500).json({ error: '지출 삭제에 실패했습니다.' });
  }
});

module.exports = router;
