const db = require("../../db/index");

exports.orderProgress = async (req, res) => {
    try {
      const sql = "SELECT * FROM purchase";
      const sql1 = "SELECT * FROM resource";
      // 使用 await 执行查询
      const [results] = await db.query(sql); // 注意这里是数组解构---订单
      const [results1] = await db.query(sql1); // 注意这里是数组解构
  
      // 提取 status=1 且 priority=1 的订单
      const filteredOrders = results.filter(
        (item) => item.status == 0 && item.priority == 1
      );
      //筛选出已交付的订单
      const deliveredOrders = results.filter(
        (item) => item.status == 1
      );
      //未交付订单数
      const undeliveredOrders = results.filter(
        (item) => item.status == 0
      )
      // 订单状态为-1的
      const cancelledOrders = results.filter((item) => item.status == -1);
      //d订单综合：生产中+未交付
      const totalOrders = cancelledOrders.concat(undeliveredOrders);
      //提取数据中status为true的数量
      const trueCount = results1.filter((item) => item.status == 'true').length;
      const inProgressData =  `${trueCount}/${results1.length}`;
  
      res.send({
        status: 0,
        message: "获取订单进度成功",
        data: {
          list: filteredOrders,
          totalOrders: totalOrders.length,
          deliveredOrders: deliveredOrders.length,
          inProgressData:inProgressData,
          trueCount
        }
      });
    } catch (err) {
      res.send({
        status: 1,
        message: err.message,
      });
    }
  };