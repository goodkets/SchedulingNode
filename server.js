const express = require("express") 
const app = express() 
const ip = '127.0.0.1' 
const port = 8889 
const router = require('./routes/index') 
const cors = require('cors'); // 引入 cors 中间件

// 使用 cors 中间件
app.use(cors({
  origin: 'http://localhost:9527', // 允许的前端域名
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true // 允许携带凭证
}));

app.use(express.json()) 
app.use('/api', router) 
app.listen(port,ip, () => { 
    console.log(`Example app listening on http://${ip}:${port}`) 
})