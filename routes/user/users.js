
// 导入数据库模块
const db = require("../../db/index");
//  导入加密
const bcrypt = require("bcryptjs");
// 用这个包来生成 Token 字符串
const jwt = require("jsonwebtoken");
// 导入配置文件
const config = require("../../config");
// 注册
exports.regUser = async (req, res) => {
  try {
    // 检测用户账号密码是否为空
    const userinfo = req.body;
    if (!userinfo.username || !userinfo.password) {
      return res.send({ status: 1, message: "用户或者密码不能为空" });
    }

    // 检测用户名是否被占用
    const sqlStr = `select * from user where username=?`;
    const [results] = await db.execute(sqlStr, [userinfo.username]);
    if (results.length > 0) {
      return res.send({
        status: 1,
        message: "用户名被占用，请更换其他用户名！",
      });
    }

    // 用户名可用，继续后续流程...
    //关闭加密
    // userinfo.password = bcrypt.hashSync(userinfo.password, 10);

    // 插入新用户
    // 调整占位符数量为 2 个，与指定的列数量一致
    const sqlUser = "insert into user (username, password) values (?, ?)";
    const [insertResults] = await db.execute(sqlUser, [
      userinfo.username,
      userinfo.password
    ]);
    if (insertResults.affectedRows !== 1) {
      return res.send({ status: 1, message: "注册用户失败，请稍后再试！" });
    }

    // 查询新用户信息
    const sql = `select * from user where username=?`;
    const [userResults] = await db.execute(sql, [userinfo.username]);
    if (userResults.length !== 1) {
      return res.send({
        status: 1,
        message: '用户注册失败！'
      });
    }

    const userWithPassword = userResults[0];
    const { password, ...userWithoutPassword } = userWithPassword;
    const user = { ...userWithoutPassword, user_pic: "" };

    // 生成 Token 字符串
    const tokenStr = jwt.sign(user, config.jwtSecretKey, {
      expiresIn: "168h", // token 有效期为 7天
    });

    res.send({
      status: 0,
      message: "成功加入！",
      // 为了方便客户端使用 Token，在服务器端直接拼接上 Bearer 的前缀
      token: "Bearer " + tokenStr,
      data: user
    });
  } catch (err) {
    console.error(err);
    res.send({ status: 1, message: err.message });
  }
};

// 登录的处理函数
exports.login = async (req, res) => {
  try {
    const userinfo = req.body;
    const sql = `select * from user where username=?`;
    const [results] = await db.execute(sql, [userinfo.username]);
    if (results.length !== 1) {
      return res.send({
        status: 1,
        message: '用户不存在'
      });
    }

    // 判断用户输入的登录密码是否和数据库中的密码一致
    // const compareResult = bcrypt.compareSync(
    //   userinfo.password,
    //   results[0].password
    // );
    const compareResult = userinfo.password === results[0].password;
    if (!compareResult) {
      return res.send({
        status: 1,
        message: '用户名或者密码错误'
      });
    }

    const userWithPassword = results[0];
    const { password, ...userWithoutPassword } = userWithPassword;
    const user = { ...userWithoutPassword };

    // 生成 Token 字符串
    const tokenStr = jwt.sign(user, config.jwtSecretKey, {
      expiresIn: "168h", // token 有效期为 7天
    });

    res.send({
      status: 0,
      message: "登录成功！",
      // 为了方便客户端使用 Token，在服务器端直接拼接上 Bearer 的前缀
      token: "Bearer " + tokenStr,
      data: user
    });
  } catch (err) {
    console.error(err);
    res.send({ status: 1, message: err.message });
  }
};
