var express = require('express');
var router = express.Router();
var user = require('./user/users') 
router.post('/regUser', user.regUser)//注册用户
router.post('/login',user.login)//登录

module.exports = router;

