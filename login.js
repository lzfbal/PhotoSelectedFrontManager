document.addEventListener('DOMContentLoaded', () => {
    // 从全局配置对象中获取配置
    const appConfig = window.appConfig;
    const BACKEND_URL = appConfig.BACKEND_URL;

    const loginBtn = document.getElementById('loginBtn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginStatus = document.getElementById('loginStatus');

    loginBtn.addEventListener('click', async () => {
        const username = usernameInput.value;
        const password = passwordInput.value;

        try {
            const response = await fetch(`${BACKEND_URL}/login`, { // 使用 BACKEND_URL
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok && data.code === 0) {
                // 登录成功，将用户名和密码存储到 localStorage (Base64 编码)
                const authString = btoa(`${username}:${password}`);
                localStorage.setItem('auth', authString);

                // 重定向到主页
                window.location.href = 'index.html';
            } else {
                // 登录失败，显示错误消息
                loginStatus.textContent = data.message || '登录失败，请稍后再试';
            }
        } catch (error) {
            console.error('登录请求失败:', error);
            loginStatus.textContent = '登录请求失败，请检查网络连接';
        }
    });
});