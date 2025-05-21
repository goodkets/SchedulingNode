// 导入数据库模块
const db = require("../../db/index");

// 导入调度算法函数
const schedulingAlgorithm = require("../../utils/schedulingAlgorithm");

// 排产
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
        // 获取订单信息和设备状态
        const orderSql = `SELECT * FROM purchase`;
        const deviceSql = `SELECT * FROM resource`;
        const [orders] = await db.query(orderSql);
        const [devices] = await db.query(deviceSql);
        // 执行调度算法
        const schedulingPlan = schedulingAlgorithm(orders, devices);

        res.send({
          status: 0,
          message: '数据查询成功',
          data: {
            items: schedulingPlan,
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