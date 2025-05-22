// 导入数据库模块
const db = require("../../db/index");

// 设备管理接口，查询 resource 表数据并返回关联的 rowList 和 workerList 数据
exports.getResourceData = async (req, res) => {
  try {
    // 获取分页参数并确保是数字类型
    const page = parseInt(req.body.page, 10) || 1;
    const pageSize = parseInt(req.body.pageSize, 10) || 10;
    const offset = (page - 1) * pageSize;

    // 第一步：查询 resource 表的数据（添加分页）
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
      LIMIT ? OFFSET ?
    `;
    const [resourceResults] = await db.execute(resourceSql, [pageSize.toString(), offset.toString()]);

    if (resourceResults.length === 0) {
      return res.send({
        status: 1,
        message: '未查询到相关资源数据',
        data: []
      });
    }

    // 提取所有的 raw_id 和 worker_id（去重）
    const rawIds = [...new Set(resourceResults.map(resource => resource.raw_id).filter(Boolean))];
    const workerIds = [...new Set(resourceResults.map(resource => resource.worker_id).filter(Boolean))];
    // 第二步：根据 raw_id 查询 rowList 表的数据
    let rowListResults = [];
    if (rawIds.length > 0) {
      const rawPlaceholders = rawIds.map(() => '?').join(',');
      const rowListSql = `
      SELECT * FROM rowlist WHERE raw_id IN (${rawIds.map(() => '?').join(',')})`;
    [rowListResults] = await db.execute(rowListSql, rawIds); // 直接传递数组元素
    }

    // 第三步：根据 worker_id 查询 workerlist 表的数据
    let workerListResults = [];
    if (workerIds.length > 0) {
      const workerPlaceholders = workerIds.map(() => '?').join(',');
      const workerListSql = `
      SELECT * FROM workerlist WHERE worker_id IN (${workerIds.map(() => '?').join(',')})`;
      [workerListResults] = await db.execute(workerListSql, workerIds);
    }

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

    // 获取总记录数用于分页信息
    const [totalCountResult] = await db.execute('SELECT COUNT(*) as total FROM resource');
    const total = totalCountResult[0].total;
    const totalPages = Math.ceil(total / pageSize);

    res.send({
      status: 0,
      message: '数据查询成功',
      data: {
        items: combinedResults,
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
    res.send({
      status: 1,
      message: '查询数据时发生错误',
      error: err.message
    });
  }
};
// 修改resource表的status（机器状态的开启和关闭）
exports.updateResourceStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    
    // 参数验证
    if (!id) {
      return res.send({
        status: 1,
        message: '缺少必要参数id'
      });
    }
    
    // 执行更新操作
    const updateSql = `
      UPDATE resource
      SET status = ?
      WHERE id = ?
    `;
    
    const [result] = await db.execute(updateSql, [status, id]);
    
    if (result.affectedRows === 0) {
      return res.send({
        status: 1,
        message: '更新失败，未找到对应资源'
      });
    }
    res.send({
      status: 0,
      message: '资源状态更新成功',
      affectedRows: result.affectedRows
    });
  } catch (err) {
    console.error('错误信息:', err);
    res.send({
      status: 1,
      message: '更新资源状态时发生错误',
      error: err.message
    });
  }
};

// 修改workerlist表中多个人的status
exports.updateWorkerNum = async (req, res) => {
  try {
    const { workers } = req.body;
    
    // 参数验证
    if (!workers || !Array.isArray(workers) || workers.length === 0) {
      return res.send({
        status: 1,
        message: '缺少必要参数workers或格式不正确'
      });
    }
    
    // 验证每个项目是否包含必要的id和status字段
    for (const item of workers) {
      if (!item.id) {
        return res.send({
          status: 1,
          message: '某项数据缺少必要参数id'
        });
      }
      
      if (item.status === undefined || item.status === null) {
        return res.send({
          status: 1,
          message: '某项数据缺少必要参数status'
        });
      }
    }
    
    // 使用事务进行批量更新
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      let totalAffectedRows = 0;
      const updateSql = `
        UPDATE workerlist
        SET status = ?
        WHERE id = ?
      `;
      
      // 逐个执行更新操作
      for (const item of workers) {
        const [result] = await connection.execute(updateSql, [item.status, item.id]);
        totalAffectedRows += result.affectedRows;
      }
      
      // 提交事务
      await connection.commit();
      
      if (totalAffectedRows === 0) {
        return res.send({
          status: 1,
          message: '更新失败，未找到对应记录'
        });
      }
      
      res.send({
        status: 0,
        message: '人员状态更新成功',
        affectedRows: totalAffectedRows
      });
    } catch (err) {
      // 回滚事务
      await connection.rollback();
      throw err;
    } finally {
      // 释放连接
      connection.release();
    }
  } catch (err) {
    console.error('错误信息:', err);
    res.send({
      status: 1,
      message: '更新人员状态时发生错误',
      error: err.message
    });
  }
};

// 修改rowList表中的材料数量num
exports.updateRowStatus = async (req, res) => {
  try {
    const { materials } = req.body;
    
    // 参数验证
    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      return res.send({
        status: 1,
        message: '缺少必要参数materials或格式不正确'
      });
    }
    
    // 验证每个项目是否包含必要的id和num字段
    for (const item of materials) {
      if (!item.id) {
        return res.send({
          status: 1,
          message: '某项数据缺少必要参数id'
        });
      }
      
      if (item.num === undefined || item.num === null) {
        return res.send({
          status: 1,
          message: '某项数据缺少必要参数num'
        });
      }
    }
    
    // 使用事务进行批量更新
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      let totalAffectedRows = 0;
      const updateSql = `
        UPDATE rowlist
        SET num = ?
        WHERE id = ?
      `;
      
      // 逐个执行更新操作
      for (const item of materials) {
        const [result] = await connection.execute(updateSql, [item.num, item.id]);
        totalAffectedRows += result.affectedRows;
      }
      
      // 提交事务
      await connection.commit();
      
      if (totalAffectedRows === 0) {
        return res.send({
          status: 1,
          message: '更新失败，未找到对应记录'
        });
      }
      
      res.send({
        status: 0,
        message: '材料数量更新成功',
        affectedRows: totalAffectedRows
      });
    } catch (err) {
      // 回滚事务
      await connection.rollback();
      throw err;
    } finally {
      // 释放连接
      connection.release();
    }
  } catch (err) {
    console.error('错误信息:', err);
    res.send({
      status: 1,
      message: '更新材料数量时发生错误',
      error: err.message
    });
  }
};

// 修改resource表的status（机器状态的开启和关闭）并同步更新相关员工状态
exports.updateResourceAndWorkerStatus = async (req, res) => {
  try {
    const { id, status, maintenance } = req.body;
    
    // 参数验证
    if (!id) {
      return res.send({
        status: 1,
        message: '缺少必要参数id'
      });
    }
    
    if (status === undefined || status === null) {
      return res.send({
        status: 1,
        message: '缺少必要参数status'
      });
    }
    
    // 使用事务确保操作的原子性
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // 1. 更新resource表的status
      const updateResourceSql = `
        UPDATE resource
        SET status = ? , maintenance = ?
        WHERE id = ?
      `;
      
      const [resourceResult] = await connection.execute(updateResourceSql, [status, maintenance, id]);
      
      if (resourceResult.affectedRows === 0) {
        await connection.rollback();
        return res.send({
          status: 1,
          message: '更新失败，未找到对应资源'
        });
      }
      
      // 2. 查询该资源关联的worker_id
      const getWorkerIdSql = `
        SELECT worker_id
        FROM resource
        WHERE id = ?
      `;
      
      const [workerIdResult] = await connection.execute(getWorkerIdSql, [id]);
      
      if (workerIdResult.length === 0 || !workerIdResult[0].worker_id) {
        // 如果没有关联的worker_id，则只更新资源状态
        await connection.commit();
        return res.send({
          status: 0,
          message: '资源状态更新成功，无关联员工',
          affectedRows: resourceResult.affectedRows
        });
      }
      
      const worker_id = workerIdResult[0].worker_id;
      // 3. 根据资源状态更新workerlist表中的员工状态
      if (status === 'false') { 
        // 如果资源关闭，则将所有关联员工状态设为0（休息状态）
        const updateAllWorkersSql = `
          UPDATE workerlist
          SET status = 0
          WHERE worker_id = ?
        `;
        
        await connection.execute(updateAllWorkersSql, [worker_id]);
      } else {
        // 如果资源开启，则默认开启第一个员工的状态
        // 先将所有员工状态设为0
        const resetWorkersSql = `
          UPDATE workerlist
          SET status = 0
          WHERE worker_id = ?
        `;
        
        await connection.execute(resetWorkersSql, [worker_id]);
        
        // 然后将第一个员工状态设为1
        const updateFirstWorkerSql = `
          UPDATE workerlist
          SET status = 1
          WHERE worker_id = ?
          ORDER BY id
          LIMIT 1
        `;
        
        await connection.execute(updateFirstWorkerSql, [worker_id]);
      }
      
      // 提交事务
      await connection.commit();
          // 导入手动执行 SQL 写入的方法
    const { manualExecuteSqlWrite } = require('../scheduling/index');
    await manualExecuteSqlWrite(req, res);
      res.send({
        status: 0,
        message: '资源和员工状态更新成功',
        affectedRows: resourceResult.affectedRows
      });
    } catch (err) {
      // 回滚事务
      await connection.rollback();
      throw err;
    } finally {
      // 释放连接
      connection.release();
    }
  } catch (err) {
    console.error('错误信息:', err);
    res.send({
      status: 1,
      message: '更新资源和员工状态时发生错误',
      error: err.message
    });
  }
};

// 工人数据接口
exports.addWorker = async (req, res) => { 
  try {
    const { workers } = req.body;
    
    // Validate all workers first
    for (const worker of workers) {
        const { worker_id } = worker;
        if (!worker_id) {
            return res.status(400).send({
                status: 1,
                message: `${userName}缺少必要参数worker_id`
            });
        }
    }

    // Execute all inserts
    const insertPromises = workers.map(async (item) => {
        const { userName, nameNumber, status, job, worker_id } = item;
        const insertSql = `
        INSERT INTO workerlist (userName, nameNumber, status, job, worker_id)
        VALUES (?, ?, ?, ?, ?)
        `;
        return await db.execute(insertSql, [userName, nameNumber, status, job, worker_id]);
    });

    // Wait for all inserts to complete
    const results = await Promise.all(insertPromises);
    
    // Calculate summary statistics
    const affectedRows = results.reduce((sum, [result]) => sum + result.affectedRows, 0);
    
    res.send({
        status: 0,
        message: '工人添加成功',
        totalAffectedRows: affectedRows,
        count: workers.length
    });
} catch (err) {
    console.error('错误信息:', err);
    res.status(500).send({
        status: 1,
        message: '添加工人时发生错误',
        error: err.message
    });
}
};


//删除工人接口
exports.deleteWorker = async (req, res) => { 
  try {
    const { id } = req.body;
    if(!id){
      return res.status(400).send({
        status: 1,
        message: '缺少必要参数id'
      });
    }
    //构建sql
    const deleteSql = `
    DELETE FROM workerlist
    WHERE id =?
    `;
    //执行sql
    const [result] = await db.execute(deleteSql, [id]);
    if (result.affectedRows === 1) {
      res.send({
        status: 0,
        message: '工人移除成功',
      });
    } else {
      res.send({
        status: 1,
        message: '未找到对应工人数据，删除失败',
      });
    }
  } catch (err) {
    console.error('错误信息:', err);
    res.status(500).send({
        status: 1,
        message: '删除工人时发生错误',
        error: err.message
    });
  }
};


//查询原材料总数
exports.getRawMaterialCount = async (req, res) => {
  try {
    //查询表格所有数据
    const [result] = await db.query('SELECT * FROM totalrawmaterials');
    if (!result || result.length === 0) {
      return res.status(404).send({
        status: 1,
        message: '未找到数据'
      });
    };
    res.send({
      status: 0,
      message: '查询成功',
      data: result
    });
    
  } catch (err) {
    console.error('错误信息:', err);
    res.status(500).send({
        status: 1,
        message: '查询原材料总数时发生错误',
        error: err.message
    })
  }
}

//修改原材料总数
exports.updateRawMaterialCount = async (req, res) => { 
  try {
    const rawArrayList = req.body;

    if (!Array.isArray(rawArrayList) || rawArrayList.length === 0) {
      return res.status(400).send({
        status: 1,
        message: '参数必须是非空数组',
      });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction(); // 开启事务

    try {
      for (const item of rawArrayList) {
        const { id, total } = item;
        if (!id || total === undefined) {
          throw new Error(`缺少必要参数 id 或 total，数据: ${JSON.stringify(item)}`);
        }

        const sql = `UPDATE totalrawmaterials SET total = ? WHERE id = ?`;
        await connection.execute(sql, [total, id]);
      }

      await connection.commit(); // 提交事务
      res.send({ status: 0, message: '更新成功' });
    } catch (batchErr) {
      await connection.rollback(); // 回滚事务
      throw batchErr;
    } finally {
      connection.release(); // 释放连接
    }
  } catch (err) {
    console.error('错误信息:', err);
    res.status(500).send({
      status: 1,
      message: '批量修改原材料总数时发生错误',
      error: err.message
    });
  }
}
