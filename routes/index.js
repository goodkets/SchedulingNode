var express = require('express');
var router = express.Router();
var user = require('./user/users')
var orderList = require('./orderList/data') 
var scheduling = require('./scheduling/index')
const resourceRouter = require('./resourceList/index');
const dashboard = require('./dashboard/index')
router.post('/regUser', user.regUser)//注册用户
router.post('/login',user.login)//登录
router.post('/orderList', orderList.getPurchaseData)//查询订单
router.post('/addPurchaseData', orderList.addPurchaseData)//新增订单
router.post('/editPurchaseData', orderList.editPurchaseData)//修改订单
router.post('/deletePurchaseData', orderList.deletePurchaseData)//删除订单
router.post('/getSchedulingData', scheduling.getSchedulingData)//查询排产
router.post('/getResourceData', resourceRouter.getResourceData)//设备管理数据
router.post('/updateResourceStatus', resourceRouter.updateResourceStatus)//修改设备状态
router.post('/updateRowStatus', resourceRouter.updateRowStatus)//修改人员状态
router.post('/updateResourceAndWorkerStatus', resourceRouter.updateResourceAndWorkerStatus)//修改设备状态并同步更新员工状态
router.post('/updateWorkerNum', resourceRouter.updateWorkerNum)//修改材料数量
router.post('/addWorker', resourceRouter.addWorker)//添加工人
router.post('/deleteWorker', resourceRouter.deleteWorker)//删除工人
router.post('/getRawMaterialCount', resourceRouter.getRawMaterialCount)//原材料总数查询
router.post('/updateRawMaterialCount', resourceRouter.updateRawMaterialCount)//修改原材料数量
router.post("/orderProgress", dashboard.orderProgress)//订单进度

module.exports = router;

