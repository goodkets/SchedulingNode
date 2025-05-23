const schedulingAlgorithm = require("./schedulingAlgorithm");

// 封装一个函数来处理每个设备类型的列表
function processDeviceList(list, deviceName, offlineDevices) {
    const filteredList = list.filter(item => item.device === deviceName);
    const dataList = filteredList.filter(item => item.process == '无'); // 过滤出已完成的项
    const processList = filteredList.filter(item => item.process !== '无'); // 过滤出进行中的项
    const resultList = [];
    let startTime = new Date();
    let endTime = new Date();
    endTime.setDate(endTime.getDate() + 4);

    // 检查设备是否离线
    const isDeviceOffline = offlineDevices.includes(deviceName);

    // 处理进行中的订单
    for (let i = 0; i < processList.length; i++) {
        startTime.setDate(startTime.getDate() + i * 2);
        endTime.setDate(endTime.getDate() + (i + 1) * 2);
        let status = i === 0 ? 0 : -1;
        if (isDeviceOffline) {
            status = -1; // 如果设备离线，设置为未开始状态
        }
        resultList.push({
            name: processList[i].name,
            orderNo: processList[i].orderNo,
            start_time: startTime.toISOString().split('T')[0],
            end_time: endTime.toISOString().split('T')[0],
            status,
            process: processList[i].process,
            device: processList[i].device,
            // 这里添加了对 process_id 是否存在的检查
            process_id: processList[i].process_id ? processList[i].process_id : null 
        });
    }

    // 处理已完成的订单
    let completedDate = new Date();
    for (let i = 0; i < dataList.length; i++) {
        const endDate = completedDate;
        const startDate = new Date(completedDate);
        startDate.setDate(startDate.getDate() - 4);
        
        resultList.push({
            ...dataList[i],
            start_time: startDate.toISOString().split('T')[0],
            end_time: endDate.toISOString().split('T')[0],
            status: 1,
            process: '无',
            orderNo: dataList[i].orderNo,
            device: dataList[i].device,
            process_id: dataList[i].process_id ? dataList[i].process_id : null
        });

        completedDate.setDate(completedDate.getDate() - 2);
    }

    return resultList;
}

function listChange(orders, devices) {
    const list = schedulingAlgorithm(orders, devices);

    // 找出所有关闭的设备
    const offlineDevices = devices
        .filter(device => !device.status || device.status === 'false')
        .map(device => device.name);

    // 根据设备类型分类并处理
    const relayList = processDeviceList(list, '继电器机床', offlineDevices);
    const capacitorList = processDeviceList(list, '电容机床', offlineDevices);
    const resistorList = processDeviceList(list, '电阻机床', offlineDevices);

    // 将三个数组合并
    return [...resistorList, ...capacitorList, ...relayList];
}

module.exports = listChange;