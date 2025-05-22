// 导入数据库模块
const db = require("../../db/index");

// 导入调度算法函数
const schedulingAlgorithm = require("../../utils/schedulingAlgorithm");

// 导入 node-schedule 库
const schedule = require('node-schedule');

// 排产
exports.getSchedulingData = async (req, res) => {
    try {
        // 从请求参数中获取页码和每页数量，设置默认值
        const page = parseInt(req.body.page) || 1;
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

// 设置每天凌晨 2 点的定时任务
const rule = new schedule.RecurrenceRule();
rule.hour = 2;
rule.minute = 0;

schedule.scheduleJob(rule, async () => {
    try {
        // 获取订单信息和设备状态
        const orderSql = `SELECT * FROM purchase`;
        const deviceSql = `SELECT * FROM resource`;
        const [orders] = await db.query(orderSql);
        const [devices] = await db.query(deviceSql);

        // 执行调度算法
        const schedulingPlan = schedulingAlgorithm(orders, devices);

        // 清空原有调度数据
        const clearSql = `DELETE FROM scheduling`;
        await db.query(clearSql);

        // 构建插入数据的 SQL 语句
        const insertSql = `INSERT INTO scheduling (name, start_time, end_time, status, process, device) VALUES ?`;
        const values = schedulingPlan.map(item => [
            item.name,
            item.start_time,
            item.end_time,
            item.status,
            item.process,
            item.device
        ]);

        // 插入新的调度数据
        await db.query(insertSql, [values]);

        console.log('每天凌晨 2 点调度算法已执行，SQL 数据已更新');
    } catch (err) {
        console.error('定时任务执行出错:', err);
    }
});


// 手动执行 SQL 写入
exports.manualExecuteSqlWrite = async (req, res) => {
    try {
        // 获取订单信息和设备状态
        const orderSql = `SELECT * FROM purchase`;
        const deviceSql = `SELECT * FROM resource`;
        const [orders] = await db.query(orderSql);
        const [devices] = await db.query(deviceSql);

        // 执行调度算法
        const schedulingPlan = schedulingAlgorithm(orders, devices);

        // 清空原有调度数据
        const clearSql = `DELETE FROM scheduling`;
        await db.query(clearSql);

        // 构建插入数据的 SQL 语句
        const insertSql = `INSERT INTO scheduling (name, start_time, end_time, status, process, device) VALUES ?`;
        const values = schedulingPlan.map(item => [
            item.name,
            item.start_time,
            item.end_time,
            item.status,
            item.process,
            item.device
        ]);

        // 插入新的调度数据
        await db.query(insertSql, [values]);


    } catch (err) {
        console.error('手动执行 SQL 写入出错:', err);
        res.status(500).send({
            status: 1,
            message: '手动执行 SQL 写入时发生错误',
            error: err.message
        });
    }
};
