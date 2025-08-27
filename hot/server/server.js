const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json());

// 内存存储用户数据（实际应用应使用数据库）
const users = [];

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
    
    res.status(201).json({ message: '注册成功', user: newUser });
});

// 登录端点
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    // 查找用户
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
        return res.status(401).json({ message: '邮箱或密码错误' });
    }
    
    // 创建JWT令牌
    const token = jwt.sign({ userId: user.id }, 'your_secret_key', { expiresIn: '1h' });
    
    res.json({ message: '登录成功', token, user });
});

// 获取用户端点（需要认证）
app.get('/api/users', (req, res) => {
    try {
        // 验证JWT令牌
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, 'your_secret_key');
        
        // 返回用户列表（实际应用中应过滤敏感信息）
        res.json({ users: users.map(u => ({ 
            id: u.id, 
            name: u.name, 
            email: u.email, 
            active: true 
        })) });
    } catch (error) {
        res.status(401).json({ message: '未授权访问' });
    }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});