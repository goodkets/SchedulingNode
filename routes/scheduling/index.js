// 导入数据库模块
const db = require("../../db/index");

// 导入调度算法函数
const listChange = require("../../utils/listChange");

// 导入 node-schedule 库
const schedule = require('node-schedule');

// 排产
exports.getSchedulingData = async (req, res) => {
    try {
        // 从请求参数中获取页码和每页数量，设置默认值
        const page = parseInt(req.body.page) || 1;
        const pageSize = parseInt(req.body.pageSize) || 10;
        const device = req.body.productName || '';
        const offset = (page - 1) * pageSize;

        // 查询订单表格，获取所有订单的 name 和 quantity
        const orderSql = `SELECT name, quantity FROM purchase`;
        const [orders] = await db.query(orderSql);

        if (device === '') {
            // 构建查询 SQL 语句
            const countSql = `SELECT COUNT(*) AS total FROM scheduling`;
            const dataSql = `SELECT id, name, start_time, end_time, status, process, device, orderNo 
                         FROM scheduling 
                         LIMIT ? OFFSET ?`;

            // 执行查询操作 - 传递数字参数而非字符串
            const [countResult] = await db.query(countSql);
            const [results] = await db.query(dataSql, [pageSize, offset]); // 直接传递数字

            // 匹配订单的 quantity 并添加到排产结果中
            const resultsWithQuantity = results.map(result => {
                const order = orders.find(o => o.name === result.name);
                return {
                    ...result,
                    quantity: order ? order.quantity : null
                };
            });

            const total = parseInt(countResult[0].total, 10);
            const totalPages = Math.ceil(total / pageSize);

            res.send({
                status: 0,
                message: '数据查询成功',
                data: {
                    items: resultsWithQuantity,
                    pagination: {
                        page,
                        pageSize,
                        total,
                        totalPages
                    }
                }
            });
        } else {
            //productName值可能是继电器机床、电容机床、电阻机床，对应数据表的device字段，根据这个字段查询数据
            // 构建查询 SQL 语句
            const countSql = `SELECT COUNT(*) AS total FROM scheduling WHERE device = ?`;
            const dataSql = `SELECT id, name, start_time, end_time, status, process, device
                     FROM scheduling
                     WHERE device = ?
                     LIMIT ? OFFSET ?`;  // 添加了分页参数

            // 执行查询操作 - 传递数字参数而非字符串
            const [countResult] = await db.query(countSql, [device]);
            const [results] = await db.query(dataSql, [device, pageSize, offset]); // 注意参数顺序

            // 匹配订单的 quantity 并添加到排产结果中
            const resultsWithQuantity = results.map(result => {
                const order = orders.find(o => o.name === result.name);
                return {
                    ...result,
                    quantity: order ? order.quantity : null
                };
            });

            const total = parseInt(countResult[0].total, 10);
            const totalPages = Math.ceil(total / pageSize);

            res.send({
                status: 0,
                message: '数据查询成功',
                data: {
                    items: resultsWithQuantity,
                    pagination: {
                        page,
                        pageSize,
                        total,
                        totalPages
                    }
                }
            });
        }
    } catch (err) {
        console.error('错误信息:', err);
        res.status(500).send({
            status: 1,
            message: '查询数据时发生错误',
            error: err.message
        });
    }
};
//根据id数组修改排产信息
exports.updateSchedulingData = async (req, res) => {
    console.log(req.body)
    try {
        // 获取要修改的订单信息数组
        const updateList = req.body; 
        if (!Array.isArray(updateList)) {
            return res.status(400).send({
                status: 1,
                message: '请求参数必须为数组'
            });
        }

        const updatePromises = updateList.map(item => {
            const { id, status, process } = item;
            // 构建更新 SQL 语句，根据 ID 更新订单状态和工序
            const sql = `UPDATE scheduling SET status = ?, process = ? WHERE id = ?`;
            return db.query(sql, [status, process, id]);
        });

        const results = await Promise.all(updatePromises);

        const successCount = results.filter(result => result[0].affectedRows > 0).length;
        const failedCount = updateList.length - successCount;

        // 获取所有的 orderNo
        const orderNos = updateList.map(item => item.orderNo).filter(Boolean);
        if (orderNos.length > 0) {
            const updatePurchaseSql = `UPDATE purchase SET status = 1 WHERE order_no IN (?)`;
            await db.query(updatePurchaseSql, [orderNos]);
        }

        if (failedCount === 0) {
            res.send({
                status: 0,
                message: '所有排产信息状态和工序更新成功，相关订单状态已更新'
            });
        } else {
            res.send({
                status: 1,
                message: `部分排产信息更新成功，成功 ${successCount} 条，失败 ${failedCount} 条，相关订单状态已更新`
            });
        }
    } catch (err) {
        console.error('错误信息:', err);
        res.status(500).send({
            status: 1,
            message: '更新排产信息状态和工序时发生错误',
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
        const schedulingPlan = listChange(orders, devices);

        // 筛选出状态为进行中的订单的 orderNo
        const inProgressOrderNos = schedulingPlan
            .filter(item => item.status === 0) // 假设状态 0 表示进行中
            .map(item => item.orderNo)
            .filter(Boolean);

        if (inProgressOrderNos.length > 0) {
            const updatePurchaseSql = `UPDATE purchase SET status = 0 WHERE order_no IN (?)`;
            await db.query(updatePurchaseSql, [inProgressOrderNos]);
        }

        // 对调度计划进行排序，将已完成的数据放在后面
        const sortedSchedulingPlan = [...schedulingPlan].sort((a, b) => {
            const isACompleted = a.status === 1 && a.process === '无';
            const isBCompleted = b.status === 1 && b.process === '无';
            if (isACompleted === isBCompleted) {
                return 0;
            }
            return isACompleted ? 1 : -1;
        });

        // 清空原有调度数据
        const clearSql = `DELETE FROM scheduling`;
        await db.query(clearSql);

        // 构建插入数据的 SQL 语句
        const insertSql = `INSERT INTO scheduling (name, start_time, end_time, status, process, device, orderNo) VALUES ?`;
        const values = sortedSchedulingPlan.map(item => [
            item.name,
            item.start_time,
            item.end_time,
            item.status,
            item.process,
            item.device,
            item.orderNo
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
        const schedulingPlan = listChange(orders, devices);

        // 筛选出状态为进行中的订单的 orderNo
        const inProgressOrderNos = schedulingPlan
            .filter(item => item.status === 0) // 假设状态 0 表示进行中
            .map(item => item.orderNo)
            .filter(Boolean);

        if (inProgressOrderNos.length > 0) {
            const updatePurchaseSql = `UPDATE purchase SET status = 0 WHERE order_no IN (?)`;
            await db.query(updatePurchaseSql, [inProgressOrderNos]);
        }

        // 对调度计划进行排序，将已完成的数据放在后面
        const sortedSchedulingPlan = [...schedulingPlan].sort((a, b) => {
            const isACompleted = a.status === 1 && a.process === '无';
            const isBCompleted = b.status === 1 && b.process === '无';
            if (isACompleted === isBCompleted) {
                return 0;
            }
            return isACompleted ? 1 : -1;
        });

        // 清空原有调度数据
        const clearSql = `DELETE FROM scheduling`;
        await db.query(clearSql);

        // 构建插入数据的 SQL 语句
        const insertSql = `INSERT INTO scheduling (name, start_time, end_time, status, process, device, orderNo) VALUES ?`;
        const values = sortedSchedulingPlan.map(item => [
            item.name,
            item.start_time,
            item.end_time,
            item.status,
            item.process,
            item.device,
            item.orderNo
        ]);

        // 检查 values 数组是否为空
        if (values.length > 0) {
            // 插入新的调度数据
            await db.query(insertSql, [values]);
        } else {
            console.log('没有可插入的数据');
        }

        res.send({
            status: 0,
            message: '手动执行 SQL 写入成功'
        });
    } catch (err) {
        console.error('手动执行 SQL 写入出错:', err);
        res.status(500).send({
            status: 1,
            message: '手动执行 SQL 写入时发生错误',
            error: err.message
        });
    }
};
