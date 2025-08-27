// DOM元素
        const registerBtn = document.getElementById('register-btn');
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const messageDiv = document.getElementById('message');
        const usersList = document.getElementById('users-list');
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');
        
        // 标签切换功能
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // 移除所有活动标签
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                // 添加活动状态到当前标签
                tab.classList.add('active');
                const tabId = tab.dataset.tab;
                document.getElementById(`${tabId}-tab`).classList.add('active');
            });
        });
        
        // 显示消息
        function showMessage(message, isSuccess = true) {
            messageDiv.textContent = message;
            messageDiv.className = `message ${isSuccess ? 'success' : 'error'}`;
            
            setTimeout(() => {
                messageDiv.style.opacity = '0';
                setTimeout(() => {
                    messageDiv.style.display = 'none';
                    messageDiv.style.opacity = '1';
                }, 300);
            }, 3000);
        }
        
        // 用户注册
        registerBtn.addEventListener('click', async () => {
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if (!name || !email || !password) {
                showMessage('所有字段都是必填项', false);
                return;
            }
            
            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showMessage('注册成功！请登录');
                    // 切换到登录标签
                    tabs[1].click();
                } else {
                    showMessage(data.message || '注册失败', false);
                }
            } catch (error) {
                showMessage('网络错误，请稍后再试', false);
                console.error('注册错误:', error);
            }
        });
        
        // 用户登录
        loginBtn.addEventListener('click', async () => {
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            if (!email || !password) {
                showMessage('邮箱和密码不能为空', false);
                return;
            }
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showMessage(`登录成功！欢迎回来，${data.user.name}`);
                    localStorage.setItem('token', data.token);
                    logoutBtn.style.display = 'block';
                    fetchUsers();
                } else {
                    showMessage(data.message || '登录失败', false);
                }
            } catch (error) {
                showMessage('网络错误，请稍后再试', false);
                console.error('登录错误:', error);
            }
        });
        
        // 退出登录
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            logoutBtn.style.display = 'none';
            usersList.innerHTML = '<p>请先登录以查看用户数据</p>';
            showMessage('您已成功退出登录');
        });
        
        // 获取用户数据
        async function fetchUsers() {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                
                const response = await fetch('/api/users', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    renderUsers(data.users);
                } else {
                    showMessage(data.message || '无法获取用户数据', false);
                }
            } catch (error) {
                console.error('获取用户错误:', error);
            }
        }
        
        // 渲染用户列表
        function renderUsers(users) {
            if (!users || users.length === 0) {
                usersList.innerHTML = '<p>没有用户数据</p>';
                return;
            }
            
            let html = '';
            users.forEach(user => {
                html += `
                <div class="user-item">
                    <div class="user-info">
                        <div class="user-name">${user.name}</div>
                        <div class="user-email">${user.email}</div>
                    </div>
                    <div class="status ${user.active ? 'active' : 'inactive'}">
                        ${user.active ? '活跃' : '未激活'}
                    </div>
                </div>
                `;
            });
            
            usersList.innerHTML = html;
        }
        
        // 检查是否已登录
        window.addEventListener('load', () => {
            if (localStorage.getItem('token')) {
                logoutBtn.style.display = 'block';
                fetchUsers();
            }
        });
        
        // 模拟API响应 - 在实际应用中应由Node.js后端提供
        window.fetch = new Proxy(window.fetch, {
            apply: async function(target, thisArg, args) {
                const [url, options] = args;
                
                // 模拟响应延迟
                await new Promise(resolve => setTimeout(resolve, 800));
                
                // 用户注册API
                if (url === '/api/register') {
                    const body = JSON.parse(options.body);
                    
                    if (!body.name || !body.email || !body.password) {
                        return {
                            ok: false,
                            json: async () => ({ message: '所有字段都是必填项' })
                        };
                    }
                    
                    return {
                        ok: true,
                        json: async () => ({ 
                            message: '注册成功', 
                            user: { id: Date.now(), ...body } 
                        })
                    };
                }
                
                // 用户登录API
                if (url === '/api/login') {
                    const body = JSON.parse(options.body);
                    
                    if (body.email === 'admin@example.com' && body.password === 'password') {
                        return {
                            ok: true,
                            json: async () => ({
                                message: '登录成功',
                                token: 'fake-jwt-token',
                                user: { 
                                    id: 1, 
                                    name: '管理员', 
                                    email: 'admin@example.com' 
                                }
                            })
                        };
                    }
                    
                    return {
                        ok: false,
                        json: async () => ({ message: '邮箱或密码错误' })
                    };
                }
                
                // 获取用户API
                if (url === '/api/users') {
                    const token = options.headers?.Authorization?.split(' ')[1];
                    
                    if (token !== 'fake-jwt-token') {
                        return {
                            ok: false,
                            status: 401,
                            json: async () => ({ message: '未授权访问' })
                        };
                    }
                    
                    const mockUsers = [
                        { id: 1, name: '张三', email: 'zhangsan@example.com', active: true },
                        { id: 2, name: '李四', email: 'lisi@example.com', active: true },
                        { id: 3, name: '王五', email: 'wangwu@example.com', active: false },
                        { id: 4, name: '赵六', email: 'zhaoliu@example.com', active: true },
                        { id: 5, name: '钱七', email: 'qianqi@example.com', active: false }
                    ];
                    
                    return {
                        ok: true,
                        json: async () => ({ users: mockUsers })
                    };
                }
                
                // 默认返回
                return target.apply(thisArg, args);
            }
        });
    