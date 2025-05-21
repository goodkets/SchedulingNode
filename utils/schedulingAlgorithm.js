// 调度算法实现
function schedulingAlgorithm(orders, devices) {
    // 参数设置
    const POP_SIZE = 50; // 种群大小
    const GENERATIONS = 100; // 迭代次数
    const MUTATION_RATE = 0.01; // 变异率
    const DUE_DATE_WEIGHT = 0.5; // 交付时间权重，可根据实际情况调整

    // 定义工序列表及对应的持续时间
    const PROCESS_LIST = [
        { id: 1, name: '切割', duration: 8 },
        { id: 2, name: '焊接', duration: 12 },
        { id: 3, name: '检测', duration: 6 },
        { id: 4, name: '组装', duration: 10 }
    ];

    // 获取可用设备
    function getAvailableDevices() {
        return devices.filter(device => device.status == 'true');
    }

    // 初始化种群
    function initializePopulation(orders, devices) {
        const availableDevices = getAvailableDevices();
        const population = [];
        for (let i = 0; i < POP_SIZE; i++) {
            const individual = [];
            orders.forEach(order => {
                if (availableDevices.length === 0) {
                    return;
                }
                const device = availableDevices[Math.floor(Math.random() * availableDevices.length)];
                const process = PROCESS_LIST[Math.floor(Math.random() * PROCESS_LIST.length)];
                const startTime = Math.floor(Math.random() * 100); // 随机开始时间
                individual.push({
                    orderId: order.id,
                    processId: process.id,
                    deviceId: device.id,
                    startTime
                });
            });
            population.push(individual);
        }
        return population;
    }

    // 适应度函数：计算总生产时间，时间越短适应度越高，同时考虑交付时间
    function fitnessFunction(individual) {
        const deviceSchedules = {};
        devices.forEach(device => {
            deviceSchedules[device.id] = [];
        });

        let totalDueDatePenalty = 0;

        individual.forEach(schedule => {
            const deviceId = schedule.deviceId;
            const order = orders.find(order => order.id === schedule.orderId);
            const device = devices.find(d => d.id === deviceId);
            if (!order || !device) {
                return;
            }
            const process = PROCESS_LIST.find(p => p.id === schedule.processId);
            const processDuration = process.duration;
            const endTime = schedule.startTime + processDuration;
            deviceSchedules[deviceId].push({ startTime: schedule.startTime, endTime });

            // 计算交付时间惩罚
            const dueDate = new Date(order.due_data);
            const endDate = new Date(new Date().getTime() + endTime * 24 * 60 * 60 * 1000);
            const daysLeft = Math.ceil((dueDate - endDate) / (1000 * 60 * 60 * 24));
            if (daysLeft < 0) {
                totalDueDatePenalty += Math.abs(daysLeft);
            }
        });

        let maxEndTime = 0;
        Object.values(deviceSchedules).forEach(schedules => {
            schedules.sort((a, b) => a.endTime - b.endTime);
            const lastSchedule = schedules[schedules.length - 1];
            if (lastSchedule && lastSchedule.endTime > maxEndTime) {
                maxEndTime = lastSchedule.endTime;
            }
        });

        // 综合考虑总生产时间和交付时间惩罚
        const totalFitness = maxEndTime + DUE_DATE_WEIGHT * totalDueDatePenalty;
        return 1 / (totalFitness + 1); // 适应度值
    }

    // 选择操作：轮盘赌选择
    function selection(population) {
        const fitnessValues = population.map(individual => fitnessFunction(individual));
        const totalFitness = fitnessValues.reduce((sum, fitness) => sum + fitness, 0);
        const probabilities = fitnessValues.map(fitness => fitness / totalFitness);

        const selectedPopulation = [];
        for (let i = 0; i < POP_SIZE; i++) {
            let r = Math.random();
            let cumulativeProbability = 0;
            for (let j = 0; j < POP_SIZE; j++) {
                cumulativeProbability += probabilities[j];
                if (r <= cumulativeProbability) {
                    selectedPopulation.push(population[j]);
                    break;
                }
            }
        }
        return selectedPopulation;
    }

    // 交叉操作：单点交叉
    function crossover(parent1, parent2) {
        const crossoverPoint = Math.floor(Math.random() * parent1.length);
        const child1 = parent1.slice(0, crossoverPoint).concat(parent2.slice(crossoverPoint));
        const child2 = parent2.slice(0, crossoverPoint).concat(parent1.slice(crossoverPoint));
        return [child1, child2];
    }

    // 变异操作：随机改变一个工序的设备或开始时间
    function mutation(individual) {
        const availableDevices = getAvailableDevices();
        if (availableDevices.length === 0) {
            return individual;
        }
        individual.forEach(schedule => {
            if (Math.random() < MUTATION_RATE) {
                if (Math.random() < 0.5) {
                    schedule.deviceId = availableDevices[Math.floor(Math.random() * availableDevices.length)].id;
                } else {
                    schedule.startTime = Math.floor(Math.random() * 100);
                }
            }
        });
        return individual;
    }

    // 主循环
    let population = initializePopulation(orders, devices); // 修正调用参数
    for (let generation = 0; generation < GENERATIONS; generation++) {
        const selectedPopulation = selection(population);
        const newPopulation = [];
        for (let i = 0; i < POP_SIZE; i += 2) {
            const parent1 = selectedPopulation[i];
            const parent2 = selectedPopulation[i + 1];
            const [child1, child2] = crossover(parent1, parent2);
            newPopulation.push(mutation(child1));
            newPopulation.push(mutation(child2));
        }
        population = newPopulation;
    }

    // 选择最优个体
    const bestIndividual = population.reduce((best, current) => {
        return fitnessFunction(current) > fitnessFunction(best) ? current : best;
    });

    // 时间格式化函数
    function formatDate(timestamp) {
        const baseDate = new Date(); // 从当前日期开始计算
        const newDate = new Date(baseDate.getTime() + timestamp * 24 * 60 * 60 * 1000);
        const year = newDate.getFullYear();
        const month = String(newDate.getMonth() + 1).padStart(2, '0');
        const day = String(newDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    return bestIndividual.map(schedule => {
        const order = orders.find(o => o.id === schedule.orderId);
        const device = devices.find(d => d.id === schedule.deviceId);
        const process = PROCESS_LIST.find(p => p.id === schedule.processId);
        const startTime = formatDate(schedule.startTime);
        const endTime = formatDate(schedule.startTime + process.duration);
        
        // 根据订单优先级设置 status
        let status;
        if (order.priority === '1') {
            status = 1;
        } else if (order.priority === '0') {
            status = 0;
        } else {
            status = -1;
        }

        return {
            name: `${order.name}`,
            start_time: startTime,
            end_time: endTime,
            status: status,
            process: process.name,
            device: device.name
        };
    });
}

module.exports = schedulingAlgorithm;