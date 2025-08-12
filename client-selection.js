document.addEventListener('DOMContentLoaded', () => {
    // ====================================================================
    // DEBUG 选项: true 为本地开发环境 (localhost), false 为生产环境
    const DEBUG_MODE = true; // <--- 修改这里来切换调试模式
    // ====================================================================

    const BACKEND_URL = DEBUG_MODE ? 'http://localhost:3000' : 'http://47.112.30.9/api';

    // 新增：客户选片页面的基础 URL
    // 请根据您的前端部署位置进行调整：
    const CLIENT_SELECTION_PAGE_BASE_URL = DEBUG_MODE ? 'http://localhost:8080/client-selection.html' : 'http://47.112.30.9/client-selection.html';


    const clientPhotoGrid = document.getElementById('clientPhotoGrid');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = errorMessage.querySelector('.error-text');
    const retryButton = document.getElementById('retryButton');
    const noPhotosMessage = document.getElementById('noPhotosMessage');
    const submittedMessage = document.getElementById('submittedMessage');

    const clientBottomBar = document.getElementById('clientBottomBar');
    const selectedCountSpan = document.getElementById('selectedCount');
    const submitSelectionBtn = document.getElementById('submitSelectionBtn');

    // 新增：筛选器元素
    const clientPhotoFilter = document.getElementById('clientPhotoFilter');

    // 大图预览模态框元素
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeButton = document.querySelector('.close-button');

    let sessionId = '';
    let photos = []; // 存储所有照片数据，包含 selected 状态

    // --- 辅助函数 ---
    function showMessage(element, message = '') {
        loadingMessage.style.display = 'none';
        errorMessage.style.display = 'none';
        noPhotosMessage.style.display = 'none';
        submittedMessage.style.display = 'none';
        clientPhotoGrid.style.display = 'none';
        clientBottomBar.style.display = 'none';
        clientPhotoFilter.style.display = 'none'; // 隐藏筛选器

        element.style.display = 'block';
        if (element === errorMessage) {
            errorText.textContent = message;
        }
        if (element === submittedMessage) {
             // 提交成功后隐藏操作栏和筛选器
             clientBottomBar.style.display = 'none';
             clientPhotoFilter.style.display = 'none';
        }
    }

    function hideAllMessages() {
        loadingMessage.style.display = 'none';
        errorMessage.style.display = 'none';
        noPhotosMessage.style.display = 'none';
        submittedMessage.style.display = 'none';
    }

    function updateSelectedCount() {
        const currentSelectedCount = photos.filter(p => p.selected).length;
        selectedCountSpan.textContent = `已选: ${currentSelectedCount} 张`;
        submitSelectionBtn.disabled = currentSelectedCount === 0;
    }

    function renderPhotos() {
        clientPhotoGrid.innerHTML = '';
        hideAllMessages();

        const filterValue = clientPhotoFilter.value;
        let photosToRender = photos;

        if (filterValue === 'selected') {
            photosToRender = photos.filter(p => p.selected);
        } else if (filterValue === 'unselected') {
            photosToRender = photos.filter(p => !p.selected);
        }

        if (photosToRender.length === 0) {
            // 如果筛选后没有照片，显示提示信息
            if (filterValue === 'selected') {
                clientPhotoGrid.textContent = '没有已选照片。';
            } else if (filterValue === 'unselected') {
                clientPhotoGrid.textContent = '所有照片都已选择。';
            } else {
                showMessage(noPhotosMessage); // 初始没有照片
            }
            clientPhotoGrid.style.display = 'block'; // 确保容器可见以显示文本
            clientBottomBar.style.display = 'flex'; // 底部栏仍然显示
            clientPhotoFilter.style.display = 'flex'; // 筛选器仍然显示
            return;
        }

        clientPhotoGrid.style.display = 'grid'; // 使用 grid 布局
        clientBottomBar.style.display = 'flex'; // 显示底部操作栏
        clientPhotoFilter.style.display = 'flex'; // 显示筛选器

        photosToRender.forEach(photo => {
            const photoItem = document.createElement('div');
            photoItem.className = `client-photo-item ${photo.selected ? 'selected' : ''}`;
            // photoItem.dataset.photoId = photo.id; // 存储照片ID，但不再直接点击photoItem来选择

            photoItem.innerHTML = `
                <div class="client-photo-wrapper">
                    <img src="${photo.url}" alt="Photo ${photo.id}" class="client-photo-image">
                    <div class="client-selected-overlay"></div>
                    <div class="client-selected-indicator">✔</div>
                </div>
                <button class="client-select-btn" data-photo-id="${photo.id}">
                    ${photo.selected ? '取消选择' : '选择'}
                </button>
            `;

            // 点击图片预览大图 (阻止事件冒泡，避免触发toggleSelection)
            photoItem.querySelector('.client-photo-image').addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡到父级，防止误触选择
                previewImage(photo.url, photos.map(p => p.url));
            });

            // 将 toggleSelection 绑定到新按钮上
            photoItem.querySelector('.client-select-btn').addEventListener('click', (e) => {
                const clickedPhotoId = e.currentTarget.dataset.photoId;
                toggleSelection(clickedPhotoId);
            });

            clientPhotoGrid.appendChild(photoItem);
        });
        updateSelectedCount();
    }

    // --- 主要逻辑 ---

    // 获取 URL 中的 sessionId
    const urlParams = new URLSearchParams(window.location.search);
    sessionId = urlParams.get('sessionId');

    if (!sessionId) {
        showMessage(errorMessage, '缺少选片会话ID，请联系摄影师获取正确的链接。');
        retryButton.style.display = 'none'; // 缺少ID不需要重试
    } else {
        fetchPhotos();
    }

    // 获取照片列表
    async function fetchPhotos() {
        showMessage(loadingMessage);
        try {
            const response = await fetch(`${BACKEND_URL}/photos?sessionId=${sessionId}`, {
                headers: {
                    'X-Client-Type': 'client' // 标识为客户请求
                }
            });
            const data = await response.json();

            if (data.code === 0) {
                photos = data.photos.map(p => ({
                    id: p.id,
                    url: p.url,
                    selected: p.selected // 初始状态可能从后端获取
                }));
                renderPhotos(); // 渲染所有照片
            } else {
                showMessage(errorMessage, data.message || '获取照片失败，请稍后再试。');
                retryButton.style.display = 'block';
            }
        } catch (error) {
            console.error('获取照片失败:', error);
            showMessage(errorMessage, '网络请求失败，请检查网络连接。');
            retryButton.style.display = 'block';
        }
    }

    // 切换照片选中状态
    function toggleSelection(photoId) {
        const photoIndex = photos.findIndex(p => p.id === photoId);
        if (photoIndex === -1) return;

        photos[photoIndex].selected = !photos[photoIndex].selected; // 切换选中状态

        // 重新渲染以更新UI，包括按钮文本和背景框
        renderPhotos();
    }

    // 提交选片结果
    submitSelectionBtn.addEventListener('click', async () => {
        const selectedPhotoIds = photos.filter(p => p.selected).map(p => p.id); // 获取所有已选照片的ID

        if (selectedPhotoIds.length === 0) {
            alert('请至少选择一张照片！');
            return;
        }

        if (!confirm(`确定要提交已选的 ${selectedPhotoIds.length} 张照片吗？提交后将无法修改。`)) {
            return;
        }

        submitSelectionBtn.disabled = true;
        submitSelectionBtn.textContent = '提交中...';

        try {
            const response = await fetch(`${BACKEND_URL}/submitSelection`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: sessionId,
                    selectedPhotoIds: selectedPhotoIds
                })
            });
            const data = await response.json();

            if (data.code === 0) {
                showMessage(submittedMessage);
                // 提交成功后，禁用所有照片的点击事件，防止再次修改
                document.querySelectorAll('.client-select-btn').forEach(btn => {
                    btn.disabled = true;
                    btn.textContent = '已提交';
                    btn.style.backgroundColor = '#6c757d'; // 灰色
                });
                clientPhotoFilter.disabled = true; // 禁用筛选器
            } else {
                alert(`提交失败: ${data.message}`);
                submitSelectionBtn.disabled = false;
                submitSelectionBtn.textContent = '提交选片';
            }
        } catch (error) {
            console.error('提交选片请求失败:', error);
            alert('网络错误，提交失败。');
            submitSelectionBtn.disabled = false;
            submitSelectionBtn.textContent = '提交选片';
        }
    });

    // 重试按钮事件
    retryButton.addEventListener('click', fetchPhotos);

    // 预览图片
    function previewImage(currentUrl, allUrls) {
        modalImage.src = currentUrl;
        imageModal.style.display = 'block';
    }

    // 监听模态框关闭按钮
    closeButton.addEventListener('click', () => {
        imageModal.style.display = 'none';
    });

    // 点击模态框外部关闭
    imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal) {
            imageModal.style.display = 'none';
        }
    });

    // 监听筛选器变化
    clientPhotoFilter.addEventListener('change', renderPhotos);
});