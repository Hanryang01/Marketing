const express = require('express');
const router = express.Router();

// 데이터베이스 연결 풀을 외부에서 주입받도록 설정
let pool;

const setPool = (databasePool) => {
  pool = databasePool;
};

// 지출 목록 조회
router.get('/', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

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
      ORDER BY 
        CASE 
          WHEN transaction_type = 'income' THEN expense_date 
          ELSE issue_date 
        END DESC, 
        created_at DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error('지출 목록 조회 오류:', error);
    res.status(500).json({ error: '지출 목록 조회에 실패했습니다.' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// 지출 상세 조회
router.get('/:id', async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    connection = await pool.getConnection();

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
      WHERE id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: '지출 항목을 찾을 수 없습니다.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('지출 상세 조회 오류:', error);
    res.status(500).json({ error: '지출 상세 조회에 실패했습니다.' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// 지출 추가
router.post('/', async (req, res) => {
  let connection;
  try {
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

    // 필수 필드 검증 (expenseDate는 필수, issueDate는 선택 사항)
    if (!companyName || !expenseDate || !item || !paymentMethod ||
      supplyAmount === undefined) {
      return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
    }

    // 입금 모드에서는 부가세를 0으로 설정
    const finalVatAmount = transactionType === 'income' ? 0 : (vatAmount || 0);

    // expenseDate가 없으면 null로 저장 (선택적 필드)
    const finalExpenseDate = expenseDate && expenseDate !== '-' && expenseDate.trim() !== '' ? expenseDate : null;

    connection = await pool.getConnection();

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

    res.status(201).json({
      id: result.insertId,
      message: '지출이 성공적으로 추가되었습니다.'
    });
  } catch (error) {
    console.error('지출 추가 오류:', error);
    res.status(500).json({ error: '지출 추가에 실패했습니다.' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// 지출 수정
router.put('/:id', async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
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

    // 필수 필드 검증 (expenseDate는 필수, issueDate는 선택 사항)
    if (!companyName || !expenseDate || !item || !paymentMethod ||
      supplyAmount === undefined) {
      return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
    }

    // 입금 모드에서는 부가세를 0으로 설정
    const finalVatAmount = transactionType === 'income' ? 0 : (vatAmount || 0);

    // expenseDate가 없으면 null로 저장 (선택적 필드)
    const finalExpenseDate = expenseDate && expenseDate !== '-' && expenseDate.trim() !== '' ? expenseDate : null;

    connection = await pool.getConnection();

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

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '지출 항목을 찾을 수 없습니다.' });
    }

    res.json({ message: '지출이 성공적으로 수정되었습니다.' });
  } catch (error) {
    console.error('지출 수정 오류:', error);
    res.status(500).json({ error: '지출 수정에 실패했습니다.' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// 지출 삭제
router.delete('/:id', async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    connection = await pool.getConnection();

    const [result] = await connection.execute(
      'DELETE FROM expenses WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '지출 항목을 찾을 수 없습니다.' });
    }

    res.json({ message: '지출이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('지출 삭제 오류:', error);
    res.status(500).json({ error: '지출 삭제에 실패했습니다.' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = { router, setPool };
