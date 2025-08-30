const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors'); // 引入cors包

const app = express();

// 配置CORS中间件（处理预检请求）
app.use(cors({
  origin: '*', // 允许所有域（生产环境应指定具体域名）
  methods: ['GET', 'POST', 'OPTIONS'], // 允许的HTTP方法
  allowedHeaders: ['Content-Type', 'Authorization'] // 允许的请求头
}));

app.use(bodyParser.json());


const {Pool} = require('pg');

const pool = new Pool({
    user: 'hotg',
    host:'localhost',
    database:'adhddb',
    password:'hotG124155',
    port:5432,
})

// pool.connect().then(
//     client=>{console.log('连接成功');
//     client.release();
// }).catch(err=>{console.log('连接失败',err)});



// 注册端点
app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    
    // 验证输入
    if (!name || !email || !password) {
        return res.status(400).json({ message: '所有字段都是必填项' });
    }
    
    // 检查邮箱是否已存在
    if (users.some(user => user.email === email)) {
        return res.status(400).json({ message: '邮箱已被使用' });
    }
    
    // 创建新用户
    const newUser = { id: Date.now(), name, email, password };
    users.push(newUser);

    //use postgresql
    const newUser1 = {name, email, password};
    //函数表达式，将异步函数赋值给变量insertUser
    const insertUser = async () => {
        const client = await pool.connect();
        try {
            console.log('插入用户:', newUser1);
            const insertQuery = 'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *';
            const values = [newUser1.name, newUser1.email, newUser1.password];
            const res = await client.query(insertQuery, values);
            console.log('用户插入成功:', res.rows[0]);
        } catch (err) {
            console.error('插入用户时出错:', err);
        } finally {
            client.release();
        }
    };
    //
    insertUser();
    res.status(201).json({ message: '注册成功', user: newUser });
});

// 登录端点
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    //通过db匹配用户登陆
    const findUser = async () => {
        const client = await pool.connect();    
        try {
            const findQuery = 'SELECT * FROM users WHERE email = $1 AND password_hash = $2';
            const values = [email, password];
            const res = await client.query(findQuery, values);
            if (res.rows.length > 0) {
                console.log('用户登录成功:', res.rows[0]);
                return res.rows[0];
            } else {
                console.log('用户登录失败: 邮箱或密码错误');
                return null;
            }
        } catch (err) {
            console.error('查询用户时出错:', err);
            return null;
        }
        finally {
            client.release();
        }
    }

    findUser().then(dbUser => {
        if (dbUser) {
            // 创建JWT令牌
            const token = jwt.sign({ userId: dbUser.id  }, 'your_secret_key', { expiresIn: '1h' });
            res.json({ message: '登录成功', token, user: dbUser });
        } else {
            res.status(401).json({ message: '邮箱或密码错误' });
        }
    }); 

});

// 获取用户端点（需要认证）
app.get('/api/users', (req, res) => {

    const getUsersFromDB = async () => {
        const client = await pool.connect();
        try {
            const res = await client.query('SELECT id, username AS name, email FROM users');
            return res.rows;
        } catch (err) {
            console.error('查询用户时出错:', err);
            return [];
        }
        finally {
            client.release();
        }
    }


    try{
         // 验证JWT令牌
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, 'your_secret_key');

        getUsersFromDB().then(dbUsers => {
            res.json({ users: dbUsers.map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                active: true
            })) });
        });
    }catch(error){
        res.status(401).json({ message: '未授权访问' });
    }

});




// 获取用户端点（需要认证）
app.get('/health', (req, res) => {
    try {
        res.status(201).json({ message: '链接成功' });
    } catch (error) {
        res.status(401).json({ message: '访问受限' });
    }
});
// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});