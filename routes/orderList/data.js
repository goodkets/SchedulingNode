// 导入数据库模块
const db = require("../../db/index");
//  导入加密
const bcrypt = require("bcryptjs");
// 用这个包来生成 Token 字符串
const jwt = require("jsonwebtoken");
// 导入配置文件
const config = require("../../config");

// 查询所有表格的数据，表格是 purchase-订单数据
// 这个查询主要分两个功能，如果没传任何参数就返回所有的数据，如果传了 searchParam 参数就根据规则匹配订单号或产品名称进行查询
exports.getPurchaseData = async (req, res) => {
  try {
    const { searchParam, page = 1, pageSize = 10 } = req.body; 
    // 确保 page 和 pageSize 是有效的正整数
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedPageSize = Math.max(1, parseInt(pageSize, 10) || 10);

    let order_no = null;
    let name = null;

    // 定义正则表达式
    const orderNoRegex = /^[a-zA-Z][a-zA-Z0-9]*$/;

    if (searchParam) {
      if (orderNoRegex.test(searchParam)) {
        order_no = searchParam;
      } else {
        // 只要不是订单号格式，都按产品名称精确查询
        name = searchParam;
      }
    }

    let sql = 'SELECT * FROM purchase';
    let countSql = 'SELECT COUNT(*) as total FROM purchase';
    let params = [];

    if (order_no || name) {
      let conditions = [];
      if (order_no) {
        // 修改为精确查询
        conditions.push('order_no = ?');
        params.push(order_no);
      }
      if (name) {
        // 修改为精确查询
        conditions.push('name = ?');
        params.push(name);
      }
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      sql += whereClause;
      countSql += whereClause;
    }

    // 添加按 id 字段倒序排序
    sql += ' ORDER BY id DESC';

    // 输出 countSql 和对应的参数
    console.log('countSql:', countSql);
    console.log('countSql 参数:', params);
    // 获取总记录数
    const [countResults] = await db.execute(countSql, params);
    const total = countResults[0].total;

    // 计算偏移量
    const offset = (parsedPage - 1) * parsedPageSize;
    console.log('offset:11111', offset);
    // 在 LIMIT 前添加空格
    sql += ' LIMIT ? OFFSET ?';
    // 确保参数为有效的正整数
    params.push(parsedPageSize+'', offset+'');

    // 输出最终的 SQL 语句和参数
    console.log('最终 SQL:', sql);
    console.log('最终 SQL 参数:', params);
    const [results] = await db.execute(sql, params);

    res.send({
      status: 0,
      message: '查询成功',
      data: results,
      total,
      currentPage: parsedPage,
      pageSize: parsedPageSize
    });
  } catch (err) {
    console.error('错误信息:', err);
    if (err.code === 'ER_WRONG_ARGUMENTS') {
      res.send({
        status: 1,
        message: 'SQL 参数错误，请检查传入参数类型和数量',
        error: err.message
      });
    } else {
      res.send({
        status: 1,
        message: '查询失败',
        error: err.message
      });
    }
  }
};

// 新增表格数据，表格是 purchase-订单数据
exports.addPurchaseData = async (req, res) => {
  try {
    const { name, order_no, quantity, due_data, status, priority } = req.body;

    // 验证必要参数
    if (!name || !order_no || !quantity || !due_data || !status || !priority) {
      return res.send({
        status: 1,
        message: '缺少必要参数，请检查 name, order_no, quantity, due_data, status, priority',
      });
    }

    // 生成 0 - 10 之间的随机数作为 product_id
    const product_id = Math.floor(Math.random() * 11);

    // 构建插入 SQL 语句
    const sql = `INSERT INTO purchase (name, order_no, product_id, quantity, due_data, status, priority) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [name, order_no, product_id, quantity, due_data, status, priority];

    // 执行插入操作
    const [result] = await db.execute(sql, params);

    if (result.affectedRows === 1) {
      res.send({
        status: 0,
        message: '数据新增成功',
        insertId: result.insertId,
      });
    } else {
      res.send({
        status: 1,
        message: '数据新增失败',
      });
    }
  } catch (err) {
    console.error('错误信息:', err);
    res.send({
      status: 1,
      message: '新增数据时发生错误',
      error: err.message,
    });
  }
};


// 删除表格数据，表格是 purchase-订单数据
exports.deletePurchaseData = async (req, res) => {
  try {
    const { order_no } = req.body;

    // 验证必要参数
    if (!order_no) {
      return res.send({
        status: 1,
        message: '缺少必要参数，请检查 order_no',
      });
    }

    // 构建删除 SQL 语句
    const sql = `DELETE FROM purchase WHERE order_no = ?`;
    const params = [order_no];

    // 执行删除操作
    const [result] = await db.execute(sql, params);

    if (result.affectedRows === 1) {
      res.send({
        status: 0,
        message: '订单删除成功',
      });
    } else {
      res.send({
        status: 1,
        message: '未找到对应订单数据，删除失败',
      });
    }
  } catch (err) {
    console.error('错误信息:', err);
    res.send({
      status: 1,
      message: '删除数据时发生错误',
      error: err.message,
    });
  }
};


// 编辑表格数据，表格是 purchase-订单数据
exports.editPurchaseData = async (req, res) => {
  try {
    const { order_no, name, quantity, due_data, status, priority } = req.body;

    // 验证必要参数
    if (!order_no || !name || !quantity || !due_data || !status || !priority) {
      return res.send({
        status: 1,
        message: '缺少必要参数，请检查 order_no, name, quantity, due_data, status, priority',
      });
    }

    // 生成 0 - 10 之间的随机数作为 product_id
    const product_id = Math.floor(Math.random() * 11);

    // 构建更新 SQL 语句
    const sql = `UPDATE purchase 
                 SET name = ?, product_id = ?, quantity = ?, due_data = ?, status = ?, priority = ? 
                 WHERE order_no = ?`;
    const params = [name, product_id, quantity, due_data, status, priority, order_no];

    // 执行更新操作
    const [result] = await db.execute(sql, params);

    if (result.affectedRows === 1) {
      res.send({
        status: 0,
        message: '订单编辑成功',
      });
    } else {
      res.send({
        status: 1,
        message: '未找到对应订单数据，编辑失败',
      });
    }
  } catch (err) {
    console.error('错误信息:', err);
    res.send({
      status: 1,
      message: '编辑数据时发生错误',
      error: err.message,
    });
  }
};