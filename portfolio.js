document.addEventListener('DOMContentLoaded', () => {
    const appConfig = window.appConfig;
    const BACKEND_URL = appConfig.BACKEND_URL;

    const portfolioGrid = document.getElementById('portfolioGrid');
    const portfolioLoadingMessage = document.getElementById('portfolioLoadingMessage');
    const portfolioErrorMessage = document.getElementById('portfolioErrorMessage');
    const portfolioErrorText = portfolioErrorMessage.querySelector('.error-text');
    const portfolioRetryButton = document.getElementById('portfolioRetryButton');
    const noPortfolioItemsMessage = document.getElementById('noPortfolioItemsMessage');
    const portfolioCategoryTags = document.getElementById('portfolioCategoryTags'); 

    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeButton = document.querySelector('.close-button');

    let allPortfolioItems = [];

    // Helper to control main messages and hide grid
    function showPortfolioMessage(element, message = '') {
        portfolioLoadingMessage.style.display = 'none';
        portfolioErrorMessage.style.display = 'none';
        noPortfolioItemsMessage.style.display = 'none';
        
        // 隐藏作品网格并移除可见状态，确保在显示消息时网格是不可见的
        portfolioGrid.classList.remove('visible'); 
        portfolioGrid.style.display = 'none'; 

        element.style.display = 'block';
        if (element === portfolioErrorMessage) {
            portfolioErrorText.textContent = message;
        }
    }

    // Helper to hide all messages, but *not* the grid's display property
    function hideAllPortfolioMessages() {
        portfolioLoadingMessage.style.display = 'none';
        portfolioErrorMessage.style.display = 'none';
        noPortfolioItemsMessage.style.display = 'none';
    }

    // This function only populates the grid content
    function renderPortfolioItems(itemsToRender) {
        portfolioGrid.innerHTML = ''; // Clear existing items
        
        if (itemsToRender.length === 0) {
            // 如果没有作品可渲染，显示“没有作品”消息，并保持网格隐藏
            showPortfolioMessage(noPortfolioItemsMessage);
            return;
        }

        // Populate grid with new items
        itemsToRender.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'portfolio-item-card';
            // === 关键修正：将 &lt; 和 > 替换回 &lt; 和 > ===
            itemDiv.innerHTML = `
                <img class="portfolio-card-image" src="${item.url}" alt="${item.title || '作品'}">
                <div class="portfolio-card-info">
                    <h4 class="portfolio-card-title">${item.title || '作品'}</h4>
                    <p class="portfolio-card-category">${item.category}</p>
                    <p class="portfolio-card-description">${item.description || ''}</p>
                </div>
            `;
            // ===============================================
            itemDiv.querySelector('.portfolio-card-image').addEventListener('click', () => {
                previewImage(item.url, itemsToRender.map(i => i.url));
            });
            portfolioGrid.appendChild(itemDiv);
        });
    }

    function populateCategoryFilter(items) {
        const categories = new Set(items.map(item => item.category).filter(cat => cat));
        portfolioCategoryTags.innerHTML = '';

        const allButton = document.createElement('button');
        allButton.className = 'category-tag-button active';
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

    // Initial load and subsequent loads after category change
    async function loadPortfolio(category = 'all', isInitialLoad = true) {
        if (isInitialLoad) {
            showPortfolioMessage(portfolioLoadingMessage); // Show loading message only on initial load
        } else {
            // 对于分类切换，我们通过 CSS 类来控制淡出效果
            // 此时不立即设置 display: none，让 CSS transition 生效
            portfolioGrid.classList.remove('visible'); 
            hideAllPortfolioMessages(); // 隐藏其他消息
        }

        try {
            // 总是获取所有作品，然后在前端进行筛选，以支持快速的标签切换
            const response = await fetch(`${BACKEND_URL}/portfolio`); 
            const data = await response.json();

            if (data.code === 0) {
                allPortfolioItems = data.portfolioItems; // Store all items
                populateCategoryFilter(allPortfolioItems); // Update category tags

                let itemsToDisplay = allPortfolioItems;
                if (category !== 'all') { // Apply filter if not initial load or 'all' selected
                    itemsToDisplay = allPortfolioItems.filter(item => item.category === category);
                }

                // 在设置 display: grid 和添加 'visible' 类之前，先渲染内容
                renderPortfolioItems(itemsToDisplay); 
                
                // 确保网格显示为 grid 布局，并触发淡入效果
                portfolioGrid.style.display = 'grid'; 
                portfolioGrid.classList.add('visible'); 
                hideAllPortfolioMessages(); // 隐藏加载/错误消息
            } else {
                showPortfolioMessage(portfolioErrorMessage, data.message || '获取作品集失败，请稍后再试。');
            }
        } catch (error) {
            console.error('获取作品集网络错误:', error);
            showPortfolioMessage(portfolioErrorMessage, '网络请求失败，请检查网络连接。');
        }
    }

    function previewImage(currentUrl, allUrls) {
        modalImage.src = currentUrl;
        imageModal.style.display = 'block';
    }

    portfolioRetryButton.addEventListener('click', () => loadPortfolio('all', true)); // Retry always loads all

    portfolioCategoryTags.addEventListener('click', (e) => {
        if (e.target.classList.contains('category-tag-button')) {
            document.querySelectorAll('.category-tag-button').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');

            const selectedCategory = e.target.dataset.category;
            
            // 触发淡出效果
            portfolioGrid.classList.remove('visible'); 

            // 等待淡出动画完成 (0.3s)，然后更新内容并触发淡入
            setTimeout(() => {
                let filtered = [];
                if (selectedCategory === 'all') {
                    filtered = allPortfolioItems;
                } else {
                    filtered = allPortfolioItems.filter(item => item.category === selectedCategory);
                }
                renderPortfolioItems(filtered); // 更新内容
                
                portfolioGrid.style.display = 'grid'; // 确保网格布局
                portfolioGrid.classList.add('visible'); // 触发淡入
                hideAllPortfolioMessages(); // 隐藏任何可能的“没有作品”消息
            }, 300); // 匹配 CSS transition 的持续时间
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
    loadPortfolio('all', true);
});