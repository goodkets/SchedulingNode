// 导入 mysql2 模块
const mysql = require('mysql2/promise');

// 创建数据库连接池
const db = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: 'www..com',
  database: 'schedulingfront',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 向外共享 db 数据库连接对象
module.exports = db;
