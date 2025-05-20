// 导入数据库模块
const db = require("../../db/index");

// 资源管理接口，查询 resource 表数据并返回关联的 rowList 和 workerList 数据
exports.getResourceData = async (req, res) => {
  try {
    // 第一步：查询 resource 表的数据
    const resourceSql = `
      SELECT 
        id, 
        code, 
        name, 
        type, 
        status, 
        maintenance, 
        output, 
        worker_id, 
        raw_id
      FROM 
        resource
    `;
    const [resourceResults] = await db.execute(resourceSql);

    if (resourceResults.length === 0) {
      return res.send({
        status: 1,
        message: '未查询到相关资源数据',
        data: []
      });
    }

    // 提取所有的 raw_id 和 worker_id
    const rawIds = resourceResults.map(resource => resource.raw_id);
    const workerIds = resourceResults.map(resource => resource.worker_id);

    // 第二步：根据 raw_id 查询 rowList 表的数据，动态生成 IN 子句的占位符
    const rawPlaceholders = rawIds.map(() => '?').join(',');
    const rowListSql = `
      SELECT 
        *
      FROM 
        rowList
      WHERE 
        raw_id IN (${rawPlaceholders})
    `;
    const [rowListResults] = await db.execute(rowListSql, rawIds);

    // 第三步：根据 worker_id 查询 workerlist 表的数据，动态生成 IN 子句的占位符
    const workerPlaceholders = workerIds.map(() => '?').join(',');
    const workerListSql = `
      SELECT 
        *
      FROM 
        workerlist
      WHERE 
        worker_id IN (${workerPlaceholders})
    `;
    const [workerListResults] = await db.execute(workerListSql, workerIds);

    // 将 rowList 数据按 raw_id 分组
    const rowListMap = {};
    rowListResults.forEach(row => {
      if (!rowListMap[row.raw_id]) {
        rowListMap[row.raw_id] = [];
      }
      rowListMap[row.raw_id].push(row); 
    });

    // 将 workerList 数据按 worker_id 分组
    const workerListMap = {};
    workerListResults.forEach(worker => {
      if (!workerListMap[worker.worker_id]) {
        workerListMap[worker.worker_id] = [];
      }
      workerListMap[worker.worker_id].push(worker); 
    });

    // 第四步：将 rowList 和 workerList 数据合并到 resource 数据中
    const combinedResults = resourceResults.map(resource => {
      return {
        ...resource,
        rawList: rowListMap[resource.raw_id] || [],
        workerList: workerListMap[resource.worker_id] || []
      };
    });

    res.send({
      status: 0,
      message: '数据查询成功',
      data: combinedResults
    });
  } catch (err) {
    console.error('错误信息:', err);
    res.send({
      status: 1,
      message: '查询数据时发生错误',
      error: err.message
    });
  }
};