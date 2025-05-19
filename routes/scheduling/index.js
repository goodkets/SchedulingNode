// 导入数据库模块
const db = require("../../db/index");

// 返回指定数据字段的接口
exports.getSchedulingData = async (req, res) => {
  try {
    // 构建查询 SQL 语句，将 your_table_name 替换为实际表名
    const sql = `SELECT id, name, start_time, end_time, status, process, device FROM scheduling`;
    
    // 执行查询操作
    const [results] = await db.execute(sql);

    if (results.length > 0) {
      res.send({
        status: 0,
        message: '数据查询成功',
        data: results
      });
    } else {
      res.send({
        status: 1,
        message: '未查询到相关数据',
        data: []
      });
    }
  } catch (err) {
    console.error('错误信息:', err);
    res.send({
      status: 1,
      message: '查询数据时发生错误',
      error: err.message
    });
  }
};