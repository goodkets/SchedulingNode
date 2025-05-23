// 调度算法实现
function schedulingAlgorithm(orders, devices) {
    // 过滤出未完成的订单
    const activeOrders = orders.filter(order => order.status !== '1');
    // 过滤出已完成的订单
    const completedOrders = orders.filter(order => order.status === '1');
    // 参数设置
    const POP_SIZE = 50; // 种群大小
    const GENERATIONS = 100; // 迭代次数
    const MUTATION_RATE = 0.01; // 变异率
    const DUE_DATE_WEIGHT = 0.5; // 交付时间权重

    // 定义工序列表及对应的持续时间
    const PROCESS_LIST = [
        { id: 1, name: '切割', duration: 8 },
        { id: 2, name: '焊接', duration: 12 },
        { id: 3, name: '检测', duration: 6 },
        { id: 4, name: '组装', duration: 10 }
    ];

    // 获取匹配的设备，根据订单名称匹配机床，并且考虑机床类型
    function getMatchingDevices(orderName, orderType) {
        // 首先根据订单名称匹配机床
        const nameMatchDevices = devices.filter(device => 
            device.name.includes(orderName)
        );
        
        // 如果找到了匹配名称的设备，返回这些设备
        if (nameMatchDevices.length > 0) {
            return nameMatchDevices;
        }
        
        // 如果没有找到匹配名称的设备，则根据类型匹配
        return devices.filter(device => 
            device.type === orderType
        );
    }

    // 初始化种群，为每个订单分配匹配类型的设备
    function initializePopulation(orders, devices) {
        const population = [];
        for (let i = 0; i < POP_SIZE; i++) {
            const individual = [];
            activeOrders.forEach(order => { // 使用过滤后的订单
                const matchingDevices = getMatchingDevices(order.name, order.type);
                if (matchingDevices.length === 0) return;
                
                const device = matchingDevices[Math.floor(Math.random() * matchingDevices.length)];
                const process = PROCESS_LIST[Math.floor(Math.random() * PROCESS_LIST.length)];
                const startTime = Math.floor(Math.random() * 100);
                individual.push({
                    orderId: order.id,
                    orderNo: order.order_no, // 确保正确获取 orderNo
                    processId: process.id,
                    deviceId: device.id,
                    startTime
                });
            });
            population.push(individual);
        }
        return population;
    }

    // 适应度函数
    function fitnessFunction(individual) {
        const deviceSchedules = {};
        devices.forEach(device => deviceSchedules[device.id] = []);

        let totalDueDatePenalty = 0;
        let conflictPenalty = 0;

        individual.forEach(schedule => {
            const deviceId = schedule.deviceId;
            const order = orders.find(o => o.id === schedule.orderId);
            const process = PROCESS_LIST.find(p => p.id === schedule.processId);
            
            if (!order || !process) return;

            const endTime = schedule.startTime + process.duration;
            deviceSchedules[deviceId].push({ 
                startTime: schedule.startTime, 
                endTime,
                orderId: schedule.orderId
            });

            // 交付时间惩罚
            const dueDate = new Date(order.due_data);
            const endDate = new Date(new Date().getTime() + endTime * 24 * 60 * 60 * 1000);
            const daysLeft = Math.ceil((dueDate - endDate) / (1000 * 60 * 60 * 24));
            if (daysLeft < 0) totalDueDatePenalty += Math.abs(daysLeft);
        });

        // 设备冲突检测
        Object.values(deviceSchedules).forEach(schedules => {
            schedules.sort((a, b) => a.startTime - b.startTime);
            for (let i = 1; i < schedules.length; i++) {
                if (schedules[i].startTime < schedules[i-1].endTime) {
                    conflictPenalty += (schedules[i-1].endTime - schedules[i].startTime);
                }
            }
        });

        let maxEndTime = 0;
        Object.values(deviceSchedules).forEach(schedules => {
            const last = schedules[schedules.length - 1];
            if (last && last.endTime > maxEndTime) maxEndTime = last.endTime;
        });

        const totalFitness = maxEndTime + DUE_DATE_WEIGHT * totalDueDatePenalty + conflictPenalty;
        return 1 / (totalFitness + 1);
    }

    // 选择、交叉、变异操作保持不变
    function selection(population) {
        const fitnessValues = population.map(fitnessFunction);
        const totalFitness = fitnessValues.reduce((sum, f) => sum + f, 0);
        const probabilities = fitnessValues.map(f => f / totalFitness);

        return Array(POP_SIZE).fill().map(() => {
            const r = Math.random();
            let cp = 0;
            for (let i = 0; i < POP_SIZE; i++) {
                cp += probabilities[i];
                if (r <= cp) return population[i];
            }
            return population[0];
        });
    }

    function crossover(p1, p2) {
        const point = Math.floor(Math.random() * p1.length);
        return [
            [...p1.slice(0, point), ...p2.slice(point)],
            [...p2.slice(0, point), ...p1.slice(point)]
        ];
    }

    function mutation(individual) {
        return individual.map(schedule => {
            if (Math.random() < MUTATION_RATE) {
                const order = orders.find(o => o.id === schedule.orderId);
                const matchingDevices = getMatchingDevices(order.name, order.type);
                if (matchingDevices.length > 0 && Math.random() < 0.5) {
                    return {
                        ...schedule,
                        deviceId: matchingDevices[Math.floor(Math.random() * matchingDevices.length)].id
                    };
                } else {
                    return {
                        ...schedule,
                        startTime: Math.floor(Math.random() * 100)
                    };
                }
            }
            return schedule;
        });
    }

    // 主算法循环
    let population = initializePopulation(activeOrders, devices); // 使用过滤后的订单
    for (let gen = 0; gen < GENERATIONS; gen++) {
        const selected = selection(population);
        const newPop = [];
        for (let i = 0; i < POP_SIZE; i += 2) {
            const [c1, c2] = crossover(selected[i], selected[i+1]);
            newPop.push(mutation(c1), mutation(c2));
        }
        population = newPop;
    }

    // 选择最优解
    const best = population.reduce((b, c) => fitnessFunction(c) > fitnessFunction(b) ? c : b);

    // 格式化日期
    function formatDate(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }

    // 创建一个映射，记录每个设备处理的订单
    const deviceOrderMap = new Map();
    
    // 首先处理所有订单，确保所有订单都在排产中
    const result = [];
    
    // 先处理未完成订单，分配设备和工序
    best.forEach(schedule => {
        const order = activeOrders.find(o => o.id === schedule.orderId); // 使用过滤后的订单
        const device = devices.find(d => d.id === schedule.deviceId);
        const process = PROCESS_LIST.find(p => p.id === schedule.processId);
        
        if (!order || !device || !process) return;
        
        // 动态检查设备状态
        const isDeviceActive = device.status === 'true';
        
        // 检查设备是否已经分配了订单
        if (!deviceOrderMap.has(device.id)) {
            deviceOrderMap.set(device.id, {
                orderId: order.id,
                status: isDeviceActive ? 0 : 1 // 如果设备可用，状态为0（进行中），否则为1（等待）
            });
        }
        
        result.push({
            orderId: order.id, // 添加 orderId 字段
            orderNo: schedule.orderNo, // 添加 orderNo 字段
            name: order.name,
            start_time: formatDate(schedule.startTime),
            end_time: formatDate(schedule.startTime + process.duration),
            status: isDeviceActive ? 0 : 1, // 根据设备状态设置订单状态
            process: process.name,
            device: device.name
        });
    });

    // 处理已完成订单，参考 best 的写法添加到结果中
    completedOrders.forEach(order => {
        // 根据订单 type 从设备列表中提取匹配的设备
        const matchingDevice = devices.find(device => device.type === order.type);
        const deviceName = matchingDevice ? matchingDevice.name : '';
        const isDeviceActive = matchingDevice ? matchingDevice.status === 'true' : false;

        // 假设已完成订单有 startTime 字段，如果没有可以根据实际情况调整
        const startTime = order.startTime !== undefined ? order.startTime : 0; 
        const process = PROCESS_LIST[Math.floor(Math.random() * PROCESS_LIST.length)]; // 随机选择一个工序，可根据实际情况调整

        result.push({
            orderId: order.id, // 添加 orderId 字段
            orderNo: order.order_no, // 添加 orderNo 字段
            name: order.name,
            start_time: formatDate(startTime),
            end_time: formatDate(startTime + process.duration),
            status: isDeviceActive ? 0 : 1,
            process: '无',
            device: deviceName
        });
    });
    
    // 然后更新状态，确保每个设备只处理一个订单为进行中状态
    result.forEach(item => {
        const device = devices.find(d => d.name === item.device);
        if (device) {
            const isDeviceActive = device.status === 'true';
            const deviceOrder = deviceOrderMap.get(device.id);
            if (deviceOrder && deviceOrder.orderId === orders.find(o => o.name === item.name)?.id && isDeviceActive) {
                item.status = 0; // 设置为进行中状态
            } else {
                item.status = 1; // 设置为等待状态
            }
        }
    });
    
    return result;
}

module.exports = schedulingAlgorithm;
