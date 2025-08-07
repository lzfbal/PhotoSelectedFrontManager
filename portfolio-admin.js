document.addEventListener('DOMContentLoaded', () => {
    // ====================================================================
    // DEBUG 选项: true 为本地开发环境 (localhost), false 为生产环境
    const DEBUG_MODE = false; // <--- 修改这里来切换调试模式
    // ====================================================================

    const BACKEND_URL = DEBUG_MODE ? 'http://localhost:3000' : 'http://cutemonster.com.cn/api';

    const portfolioCategorySelect = document.getElementById('portfolioCategorySelect');
    const portfolioNewCategoryInput = document.getElementById('portfolioNewCategoryInput');
    const portfolioUpload = document.getElementById('portfolioUpload');
    const uploadPortfolioBtn = document.getElementById('uploadPortfolioBtn');
    const portfolioUploadStatus = document.getElementById('portfolioUploadStatus');
    const portfolioProgressBarContainer = document.getElementById('portfolioProgressBarContainer');
    const portfolioProgressBar = document.getElementById('portfolioProgressBar');
    const portfolioProgressText = document.getElementById('portfolioProgressText');

    const portfolioAdminCategoryFilter = document.getElementById('portfolioAdminCategoryFilter');
    const uploadedPortfolioItemsContainer = document.getElementById('uploadedPortfolioItems');

    let allPortfolioItems = []; // 存储所有作品数据

    // --- 辅助函数 ---
    function showPortfolioStatus(message, isError = false) {
        portfolioUploadStatus.textContent = message;
        portfolioUploadStatus.style.color = isError ? 'red' : 'green';
    }

    // --- 通用的复制文本到剪贴板函数 (从 script.js 复制过来) ---
    async function copyTextToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            alert('链接已复制到剪贴板！');
        } catch (err) {
            console.error('使用 navigator.clipboard.writeText 复制失败:', err);
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            textarea.style.top = '-9999px';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    alert('链接已复制到剪贴板！');
                } else {
                    alert('复制失败，请手动复制：\n' + text);
                }
            } catch (err2) {
                console.error('使用 document.execCommand 复制失败:', err2);
                alert('复制失败，请手动复制：\n' + text);
            } finally {
                document.body.removeChild(textarea);
            }
        }
    }

    // --- 渲染作品集项目 ---
    function renderPortfolioItems(itemsToRender) {
        uploadedPortfolioItemsContainer.innerHTML = '';
        if (itemsToRender.length === 0) {
            uploadedPortfolioItemsContainer.textContent = '没有作品。';
            return;
        }
        itemsToRender.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'photo-item portfolio-item'; // 复用 photo-item 样式
            itemDiv.innerHTML = `
                <img src="${item.url}" alt="${item.title || '作品'}">
                <div class="portfolio-info">
                    <p class="portfolio-title" title="${item.title || '作品'}">${item.title || '作品'}</p>
                    <p class="portfolio-category">${item.category}</p>
                </div>
                <button class="delete-photo-btn delete-portfolio-btn" data-item-id="${item.id}">X</button>
            `;
            uploadedPortfolioItemsContainer.appendChild(itemDiv);
        });
    }

    // --- 填充分类选择器和筛选器 ---
    function populateCategoryDropdowns(items) {
        const categories = new Set(items.map(item => item.category).filter(cat => cat)); // 过滤空字符串
        
        // 清空并填充上传部分的分类选择器
        portfolioCategorySelect.innerHTML = '<option value="">-- 请选择或添加新分类 --</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            portfolioCategorySelect.appendChild(option);
        });
        portfolioCategorySelect.innerHTML += '<option value="addNew">添加新分类...</option>';

        // 清空并填充管理部分的分类筛选器
        portfolioAdminCategoryFilter.innerHTML = '<option value="all">所有分类</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            portfolioAdminCategoryFilter.appendChild(option);
        });
    }

    // --- 加载作品集列表和分类 ---
    async function loadPortfolioItemsAndCategories() {
        showPortfolioStatus('加载作品中...');
        try {
            const response = await fetch(`${BACKEND_URL}/portfolio`);
            const data = await response.json();
            if (data.code === 0) {
                allPortfolioItems = data.portfolioItems;
                populateCategoryDropdowns(allPortfolioItems); // 填充两个下拉框
                applyPortfolioAdminFilter(); // 默认应用筛选（显示所有）
                showPortfolioStatus('作品加载完成。');
            } else {
                console.error('加载作品集失败:', data.message);
                showPortfolioStatus('加载作品集失败。', true);
            }
        } catch (error) {
            console.error('加载作品集网络错误:', error);
            showPortfolioStatus('加载作品集网络错误。', true);
        }
    }

    // --- 作品上传逻辑 ---
    uploadPortfolioBtn.addEventListener('click', async () => {
        const files = portfolioUpload.files;
        if (files.length === 0) {
            showPortfolioStatus('请选择作品文件！', true);
            return;
        }

        let category = portfolioCategorySelect.value;
        if (category === 'addNew') {
            category = portfolioNewCategoryInput.value.trim();
        }
        if (!category) {
            showPortfolioStatus('请选择或输入作品分类！', true);
            return;
        }

        uploadPortfolioBtn.disabled = true;
        showPortfolioStatus('作品上传中...');
        portfolioProgressBarContainer.style.display = 'block';
        portfolioProgressBar.style.width = '0%';
        portfolioProgressText.textContent = '0%';

        let totalFilesSize = 0;
        Array.from(files).forEach(file => totalFilesSize += file.size);
        const uploadedBytesMap = new Map();
        Array.from(files).forEach((_, index) => uploadedBytesMap.set(index, 0));

        const uploadPromises = Array.from(files).map((file, index) => {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                const formData = new FormData();
                formData.append('file', file);
                formData.append('category', category);

                xhr.open('POST', `${BACKEND_URL}/portfolio/upload`);

                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        uploadedBytesMap.set(index, e.loaded);
                        let currentTotalLoaded = 0;
                        uploadedBytesMap.forEach(loaded => currentTotalLoaded += loaded);
                        const percentComplete = (currentTotalLoaded / totalFilesSize) * 100;
                        portfolioProgressBar.style.width = `${percentComplete.toFixed(2)}%`;
                        portfolioProgressText.textContent = `${percentComplete.toFixed(0)}%`;
                    }
                });

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            if (data.code === 0) {
                                resolve(data);
                            } else {
                                reject(data.message || '上传失败');
                            }
                        } catch (e) {
                            reject('服务器响应解析失败');
                        }
                    } else {
                        reject(`HTTP错误: ${xhr.status} ${xhr.statusText}`);
                    }
                };
                xhr.onerror = () => { reject('网络错误或服务器无响应'); };
                xhr.onabort = () => { reject('上传已取消'); };
                xhr.send(formData);
            });
        });

        try {
            await Promise.all(uploadPromises);
            showPortfolioStatus('所有作品上传成功！');
            portfolioCategorySelect.value = '';
            portfolioNewCategoryInput.value = '';
            portfolioNewCategoryInput.style.display = 'none';
            portfolioUpload.value = '';
            await loadPortfolioItemsAndCategories(); // 重新加载作品列表和分类
        } catch (error) {
            showPortfolioStatus(`部分或全部作品上传失败: ${error}`, true);
        } finally {
            uploadPortfolioBtn.disabled = false;
            portfolioProgressBarContainer.style.display = 'none';
            portfolioProgressBar.style.width = '0%';
            portfolioProgressText.textContent = '0%';
        }
    });

    // --- 删除作品集项目 ---
    uploadedPortfolioItemsContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-portfolio-btn')) {
            const itemIdToDelete = e.target.dataset.itemId;
            if (!itemIdToDelete) {
                showPortfolioStatus('作品ID缺失，无法删除。', true);
                return;
            }

            if (!confirm('确定要删除这个作品吗？此操作不可逆。')) {
                return;
            }

            showPortfolioStatus('删除作品中...');
            try {
                const response = await fetch(`${BACKEND_URL}/portfolio/${itemIdToDelete}`, {
                    method: 'DELETE'
                });
                const data = await response.json();
                if (data.code === 0) {
                    showPortfolioStatus('作品删除成功！');
                    await loadPortfolioItemsAndCategories(); // 重新加载列表和分类
                } else {
                    showPortfolioStatus(`删除失败: ${data.message}`, true);
                }
            } catch (error) {
                showPortfolioStatus('网络错误或服务器无响应', true);
            }
        }
    });

    // --- 筛选器逻辑 ---
    function applyPortfolioAdminFilter() {
        const selectedCategory = portfolioAdminCategoryFilter.value;
        let filtered = allPortfolioItems;
        if (selectedCategory !== 'all') {
            filtered = allPortfolioItems.filter(item => item.category === selectedCategory);
        }
        renderPortfolioItems(filtered);
    }

    // --- 事件监听器 ---
    portfolioCategorySelect.addEventListener('change', () => {
        if (portfolioCategorySelect.value === 'addNew') {
            portfolioNewCategoryInput.style.display = 'block';
        } else {
            portfolioNewCategoryInput.style.display = 'none';
        }
    });

    portfolioAdminCategoryFilter.addEventListener('change', applyPortfolioAdminFilter);

    // 初始加载
    loadPortfolioItemsAndCategories();
});