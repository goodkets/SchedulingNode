var express = require('express');
var router = express.Router();
var user = require('./user/users')
var orderList = require('./orderList/data') 
var scheduling = require('./scheduling/index')
router.post('/regUser', user.regUser)//注册用户
router.post('/login',user.login)//登录
router.post('/orderList', orderList.getPurchaseData)//查询订单
router.post('/addPurchaseData', orderList.addPurchaseData)//新增订单
router.post('/editPurchaseData', orderList.editPurchaseData)//修改订单
router.post('/deletePurchaseData', orderList.deletePurchaseData)//删除订单
router.post('/getSchedulingData', scheduling.getSchedulingData)//查询排产



module.exports = router;

