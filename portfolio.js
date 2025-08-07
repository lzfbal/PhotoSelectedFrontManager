document.addEventListener('DOMContentLoaded', () => {
    // ====================================================================
    // DEBUG 选项: true 为本地开发环境 (localhost), false 为生产环境
    const DEBUG_MODE = false; // <--- 修改这里来切换调试模式
    // ====================================================================

    const BACKEND_URL = DEBUG_MODE ? 'http://localhost:3000' : 'http://cutemonster.com.cn/api';

    const portfolioGrid = document.getElementById('portfolioGrid');
    const portfolioLoadingMessage = document.getElementById('portfolioLoadingMessage');
    const portfolioErrorMessage = document.getElementById('portfolioErrorMessage');
    const portfolioErrorText = portfolioErrorMessage.querySelector('.error-text');
    const portfolioRetryButton = document.getElementById('portfolioRetryButton');
    const noPortfolioItemsMessage = document.getElementById('noPortfolioItemsMessage');
    const portfolioCategoryFilter = document.getElementById('portfolioCategoryFilter');

    // 大图预览模态框元素
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeButton = document.querySelector('.close-button');

    let allPortfolioItems = []; // 存储所有作品数据

    // --- 辅助函数 ---
    function showPortfolioMessage(element, message = '') {
        portfolioLoadingMessage.style.display = 'none';
        portfolioErrorMessage.style.display = 'none';
        noPortfolioItemsMessage.style.display = 'none';
        portfolioGrid.style.display = 'none';
        
        element.style.display = 'block';
        if (element === portfolioErrorMessage) {
            portfolioErrorText.textContent = message;
        }
    }

    function hideAllPortfolioMessages() {
        portfolioLoadingMessage.style.display = 'none';
        portfolioErrorMessage.style.display = 'none';
        noPortfolioItemsMessage.style.display = 'none';
    }

    function renderPortfolioItems(itemsToRender) {
        portfolioGrid.innerHTML = '';
        hideAllPortfolioMessages();

        if (itemsToRender.length === 0) {
            showPortfolioMessage(noPortfolioItemsMessage);
            return;
        }

        portfolioGrid.style.display = 'grid';

        itemsToRender.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'portfolio-item-card';
            itemDiv.innerHTML = `
                <img src="${item.url}" alt="${item.title || '作品'}" class="portfolio-card-image">
                <div class="portfolio-card-info">
                    <h4 class="portfolio-card-title">${item.title || '作品'}</h4>
                    <p class="portfolio-card-category">${item.category}</p>
                    <p class="portfolio-card-description">${item.description}</p>
                </div>
            `;
            // 点击图片预览大图
            itemDiv.querySelector('.portfolio-card-image').addEventListener('click', () => {
                previewImage(item.url, itemsToRender.map(i => i.url));
            });
            portfolioGrid.appendChild(itemDiv);
        });
    }

    // --- 填充分类筛选器 ---
    function populateCategoryFilter(items) {
        const categories = new Set(items.map(item => item.category));
        portfolioCategoryFilter.innerHTML = '<option value="all">所有分类</option>'; // 总是保留“所有分类”选项
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            portfolioCategoryFilter.appendChild(option);
        });
    }

    // --- 加载作品集 ---
    async function loadPortfolio(category = 'all') {
        showPortfolioMessage(portfolioLoadingMessage);
        try {
            const queryParams = new URLSearchParams();
            if (category !== 'all') {
                queryParams.append('category', category);
            }
            
            const response = await fetch(`${BACKEND_URL}/portfolio?${queryParams.toString()}`);
            const data = await response.json();

            if (data.code === 0) {
                allPortfolioItems = data.portfolioItems; // 存储所有作品
                populateCategoryFilter(allPortfolioItems); // 更新分类筛选器
                renderPortfolioItems(allPortfolioItems); // 默认渲染所有作品
            } else {
                showPortfolioMessage(portfolioErrorMessage, data.message || '获取作品集失败，请稍后再试。');
                portfolioRetryButton.style.display = 'block';
            }
        } catch (error) {
            console.error('获取作品集网络错误:', error);
            showPortfolioMessage(portfolioErrorMessage, '网络请求失败，请检查网络连接。');
            portfolioRetryButton.style.display = 'block';
        }
    }

    // --- 预览图片 ---
    function previewImage(currentUrl, allUrls) {
        modalImage.src = currentUrl;
        imageModal.style.display = 'block';
    }

    // --- 事件监听器 ---
    portfolioRetryButton.addEventListener('click', () => loadPortfolio(portfolioCategoryFilter.value));

    portfolioCategoryFilter.addEventListener('change', (e) => {
        const selectedCategory = e.target.value;
        // 重新渲染，但只筛选当前已加载的所有作品，避免重新发起网络请求
        if (selectedCategory === 'all') {
            renderPortfolioItems(allPortfolioItems);
        } else {
            const filtered = allPortfolioItems.filter(item => item.category === selectedCategory);
            renderPortfolioItems(filtered);
        }
    });

    closeButton.addEventListener('click', () => {
        imageModal.style.display = 'none';
    });

    imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal) {
            imageModal.style.display = 'none';
        }
    });

    // 初始加载作品集
    loadPortfolio();
});