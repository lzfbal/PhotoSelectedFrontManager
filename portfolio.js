document.addEventListener('DOMContentLoaded', () => {
    const appConfig = window.appConfig;
    const BACKEND_URL = appConfig.BACKEND_URL;

    const portfolioGrid = document.getElementById('portfolioGrid');
    const portfolioLoadingMessage = document.getElementById('portfolioLoadingMessage');
    const portfolioErrorMessage = document.getElementById('portfolioErrorMessage');
    const portfolioErrorText = portfolioErrorMessage.querySelector('.error-text');
    const portfolioRetryButton = document.getElementById('portfolioRetryButton');
    const noPortfolioItemsMessage = document.getElementById('noPortfolioItemsMessage');
    // 更改这里：从 select 元素改为 div 容器
    const portfolioCategoryTags = document.getElementById('portfolioCategoryTags'); 

    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeButton = document.querySelector('.close-button');

    let allPortfolioItems = [];

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
                <img class="portfolio-card-image" src="${item.url}" alt="${item.title || '作品'}">
                <div class="portfolio-card-info">
                    <h4 class="portfolio-card-title">${item.title || '作品'}</h4>
                    <p class="portfolio-card-category">${item.category}</p>
                    <p class="portfolio-card-description">${item.description || ''}</p>
                </div>
            `;
            itemDiv.querySelector('.portfolio-card-image').addEventListener('click', () => {
                previewImage(item.url, itemsToRender.map(i => i.url));
            });
            portfolioGrid.appendChild(itemDiv);
        });
    }

    // --- 填充分类标签 ---
    function populateCategoryFilter(items) {
        const categories = new Set(items.map(item => item.category).filter(cat => cat));
        portfolioCategoryTags.innerHTML = ''; // 清空之前的标签

        // 添加“所有分类”标签
        const allButton = document.createElement('button');
        allButton.className = 'category-tag-button active'; // 默认选中“所有分类”
        allButton.dataset.category = 'all';
        allButton.textContent = '所有分类';
        portfolioCategoryTags.appendChild(allButton);

        categories.forEach(category => {
            const tagButton = document.createElement('button');
            tagButton.className = 'category-tag-button';
            tagButton.dataset.category = category;
            tagButton.textContent = category;
            portfolioCategoryTags.appendChild(tagButton);
        });
    }

    async function loadPortfolio() {
        showPortfolioMessage(portfolioLoadingMessage);
        try {
            // 首次加载不带分类参数，获取所有作品
            const response = await fetch(`${BACKEND_URL}/portfolio`);
            const data = await response.json();

            if (data.code === 0) {
                allPortfolioItems = data.portfolioItems; // 存储所有作品
                populateCategoryFilter(allPortfolioItems); // 填充分类标签
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

    function previewImage(currentUrl, allUrls) {
        modalImage.src = currentUrl;
        imageModal.style.display = 'block';
    }

    // --- 事件监听器 ---
    portfolioRetryButton.addEventListener('click', () => loadPortfolio()); // 重试时重新加载所有作品

    // 监听分类标签的点击事件
    portfolioCategoryTags.addEventListener('click', (e) => {
        if (e.target.classList.contains('category-tag-button')) {
            // 移除所有标签的 active 状态
            document.querySelectorAll('.category-tag-button').forEach(btn => {
                btn.classList.remove('active');
            });
            // 给被点击的标签添加 active 状态
            e.target.classList.add('active');

            const selectedCategory = e.target.dataset.category;
            let filtered = [];
            if (selectedCategory === 'all') {
                filtered = allPortfolioItems;
            } else {
                filtered = allPortfolioItems.filter(item => item.category === selectedCategory);
            }
            renderPortfolioItems(filtered); // 渲染筛选后的作品
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

    loadPortfolio();
});