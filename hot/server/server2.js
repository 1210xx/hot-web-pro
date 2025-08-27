require('dotenv').config();
const express = require('express');
const cors = require('cors'); // 引入cors模块
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const app = express();

console.log('JWT Secret:', process.env.JWT_SECRET); // 测试输出
// CORS配置
const corsOptions = {
  origin: '127.0.0.1:8080',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// 应用中间件
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // 处理所有OPTIONS预检请求
app.use(express.json());

// 模拟数据库
const users = [];

// 认证中间件
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未提供授权令牌' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = users.find(u => u.id === decoded.userId);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '令牌已过期' });
    }
    res.status(403).json({ message: '无效令牌' });
  }
};

// 注册端点
app.post('/api/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').notEmpty().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password } = req.body;
  
  if (users.some(u => u.email === email)) {
    return res.status(409).json({ message: '邮箱已被注册' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now(),
      name,
      email,
      password: hashedPassword,
      createdAt: new Date()
    };
    
    users.push(newUser);
    res.status(201).json({ user: createSafeUser(newUser) });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

// 登录端点
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  
  if (!user) return res.status(401).json({ message: '无效凭证' });
  
  try {
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: '无效凭证' });

    const accessToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // 存储刷新令牌（实际应用中应持久化存储）
    user.refreshToken = refreshToken;

    res.json({
      accessToken,
      refreshToken,
      user: createSafeUser(user)
    });
  } catch (error) {
    res.status(500).json({ message: '登录失败' });
  }
});

// 获取用户端点
app.get('/api/users', authenticate, (req, res) => {
  const safeUsers = users.map(createSafeUser);
  res.json(safeUsers);
});

// 刷新令牌端点
app.post('/api/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(401).json({ message: '缺少刷新令牌' });
  }
  
  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const user = users.find(u => u.id === decoded.userId);
    
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: '无效刷新令牌' });
    }
    
    // 颁发新的访问令牌
    const newAccessToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(403).json({ message: '无效令牌' });
  }
});

// 辅助函数
function createSafeUser(user) {
  const { password, refreshToken, ...safeData } = user;
  return safeData;
}

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`CORS配置: 允许源 ${corsOptions.origin}`);
});