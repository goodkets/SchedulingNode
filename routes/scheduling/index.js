// 导入数据库模块
const db = require("../../db/index");

//排产
// 返回指定数据字段的接口
// exports.getSchedulingData = async (req, res) => {
//   try {
//     // 构建查询 SQL 语句，将 your_table_name 替换为实际表名
//     const sql = `SELECT id, name, start_time, end_time, status, process, device FROM scheduling`;
    
//     // 执行查询操作
//     const [results] = await db.execute(sql);

//     if (results.length > 0) {
//       res.send({
//         status: 0,
//         message: '数据查询成功',
//         data: results
//       });
//     } else {
//       res.send({
//         status: 1,
//         message: '未查询到相关数据',
//         data: []
//       });
//     }
//   } catch (err) {
//     console.error('错误信息:', err);
//     res.send({
//       status: 1,
//       message: '查询数据时发生错误',
//       error: err.message
//     });
//   }
// };
exports.getSchedulingData = async (req, res) => {
  try {
    // 从请求参数中获取页码和每页数量，设置默认值
    const page = parseInt(req.body  .page) || 1;
    const pageSize = parseInt(req.body.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    // 构建查询 SQL 语句
    const countSql = `SELECT COUNT(*) AS total FROM scheduling`;
    const dataSql = `SELECT id, name, start_time, end_time, status, process, device 
                     FROM scheduling 
                     LIMIT ? OFFSET ?`;
    
    // 执行查询操作 - 传递数字参数而非字符串
    const [countResult] = await db.query(countSql);
    const [results] = await db.query(dataSql, [pageSize, offset]); // 直接传递数字

    const total = parseInt(countResult[0].total, 10);
    const totalPages = Math.ceil(total / pageSize);

    res.send({
      status: 0,
      message: '数据查询成功',
      data: {
        items: results,
        pagination: {
          page,
          pageSize,
          total,
          totalPages
        }
      }
    });
  } catch (err) {
    console.error('错误信息:', err);
    res.status(500).send({
      status: 1,
      message: '查询数据时发生错误',
      error: err.message
    });
  }
};