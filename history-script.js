document.addEventListener('DOMContentLoaded', () => {
    // ====================================================================
    // DEBUG 选项: true 为本地开发环境 (localhost), false 为生产环境
    const DEBUG_MODE = false; // <--- 修改这里来切换调试模式
    // ====================================================================

    const BACKEND_URL = DEBUG_MODE ? 'http://localhost:3000' : 'http://47.107.129.145/api';

    // 新增：客户选片页面的基础 URL
    // 请根据您的前端部署位置进行调整：
    const CLIENT_SELECTION_PAGE_BASE_URL = DEBUG_MODE ? 'http://localhost:8080/client-selection.html' : 'http://47.107.129.145/photo-app/client-selection.html';

    const sessionListSection = document.getElementById('sessionListSection');
    const sessionCardsGrid = document.getElementById('sessionCardsGrid');
    const sessionListStatus = document.getElementById('sessionListStatus');

    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const applyFilterBtn = document.getElementById('applyFilterBtn');

    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageInfo = document.getElementById('pageInfo');

    const sessionDetailSection = document.getElementById('sessionDetailSection');
    const detailCustomerName = document.getElementById('detailCustomerName');
    const detailSessionStatus = document.getElementById('detailSessionStatus');
    const detailPhotoCount = document.getElementById('detailPhotoCount');
    const detailCreatedAt = document.getElementById('detailCreatedAt');
    const detailPhotosContainer = document.getElementById('detailPhotos');
    const backToListBtn = document.getElementById('backToListBtn');

    const appendPhotoUpload = document.getElementById('appendPhotoUpload');
    const appendUploadBtn = document.getElementById('appendUploadBtn');
    const appendUploadStatus = document.getElementById('appendUploadStatus');

    const appendProgressBarContainer = document.getElementById('appendProgressBarContainer');
    const appendProgressBar = document.getElementById('appendProgressBar');
    const appendProgressText = document.getElementById('appendProgressText');

    const photoFilter = document.getElementById('photoFilter');

    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeButton = document.querySelector('.close-button');


    let currentPage = 1;
    const itemsPerPage = 10;
    let currentDetailSessionId = '';
    let currentPhotosData = [];


    // --- 辅助函数 ---
    function showSection(sectionId) {
        console.log(`尝试显示区域: ${sectionId}`);
        sessionListSection.style.display = 'none';
        sessionDetailSection.style.display = 'none';
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
            console.log(`区域 ${sectionId} 已显示。`);
        } else {
            console.error(`错误：未找到ID为 ${sectionId} 的区域！`);
        }
    }

    function formatDate(isoString) {
        if (!isoString) return 'N/A';
        const date = new Date(isoString);
        return date.toLocaleString();
    }

    function showAppendStatus(message, isError = false) {
        appendUploadStatus.textContent = message;
        appendUploadStatus.style.color = isError ? 'red' : 'green';
    }

    function truncateId(id, length = 8) {
        if (!id) return '';
        if (id.length <= length) return id;
        return id.substring(0, length) + '...';
    }

    function renderPhotos(photosToRender) {
        detailPhotosContainer.innerHTML = '';
        if (photosToRender.length > 0) {
            photosToRender.forEach(photo => {
                const photoItem = document.createElement('div');
                photoItem.className = `photo-item ${photo.selected ? 'selected' : ''}`;
                photoItem.innerHTML = `
                    <img src="${photo.url}" alt="Photo ${photo.id}" data-full-src="${photo.url}">
                    <div class="photo-id-display" title="${photo.id}">ID: ${truncateId(photo.id)}</div>
                    <span class="selected-indicator">✔</span>
                `;
                photoItem.querySelector('img').addEventListener('click', (e) => {
                    modalImage.src = e.target.dataset.fullSrc;
                    imageModal.style.display = 'block';
                });
                detailPhotosContainer.appendChild(photoItem);
            });
        } else {
            detailPhotosContainer.textContent = '该会话没有照片。';
        }
    }

    // --- 通用的复制文本到剪贴板函数 ---
    async function copyTextToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            alert('链接已复制到剪贴板！');
        } catch (err) {
            console.error('使用 navigator.clipboard.writeText 复制失败:', err);
            // Fallback: document.execCommand('copy')
            const textarea = document.createElement('textarea');
            textarea.value = text;
            // 使其不可见并移出屏幕
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

    // --- 加载会话列表 ---
    async function loadSessionList() {
        sessionListStatus.textContent = '加载中...';
        sessionCardsGrid.innerHTML = '';

        const status = statusFilter.value;
        const search = searchInput.value.trim();

        const queryParams = new URLSearchParams({
            page: currentPage,
            limit: itemsPerPage,
            status: status,
            search: search
        });

        try {
            const response = await fetch(`${BACKEND_URL}/sessions?${queryParams.toString()}`);
            const data = await response.json();

            if (data.code === 0 && data.sessions.length > 0) {
                data.sessions.forEach(session => {
                    const sessionCard = document.createElement('div');
                    sessionCard.className = 'session-card';

                    sessionCard.innerHTML = `
                        <div class="card-header">
                            <h3 class="card-title">客户: ${session.customerName || '未知客户'}</h3>
                            <span class="card-status status-${session.status}">${session.status}</span>
                        </div>
                        <div class="card-body">
                            <p class="card-detail-item"><strong>会话ID:</strong> <span title="${session.id}">${truncateId(session.id, 12)}</span></p>
                            <p class="card-detail-item"><strong>照片数量:</strong> ${session.photoCount}</p>
                            <p class="card-detail-item"><strong>创建时间:</strong> ${formatDate(session.createdAt)}</p>
                        </div>
                        <div class="card-actions">
                            <button class="view-detail-btn" data-session-id="${session.id}">查看详情</button>
                            <button class="delete-session-btn" data-session-id="${session.id}">删除</button>
                            <!-- 复制选片链接按钮 -->
                            <button class="copy-client-link-btn" data-session-id="${session.id}" data-session-status="${session.status}">复制选片链接</button>
                        </div>
                    `;

                    // 为按钮添加事件监听器
                    sessionCard.querySelector('.view-detail-btn').addEventListener('click', () => viewSessionDetail(session.id));
                    sessionCard.querySelector('.delete-session-btn').addEventListener('click', () => deleteSession(session.id));

                    const copyLinkBtn = sessionCard.querySelector('.copy-client-link-btn');
                    // 仅当会话状态为 'ready' 或 'submitted' 时才启用复制链接按钮
                    if (session.status === 'ready' || session.status === 'submitted') {
                         copyLinkBtn.addEventListener('click', () => copyClientLink(session.id));
                    } else {
                         copyLinkBtn.disabled = true;
                         copyLinkBtn.textContent = '链接未就绪';
                         copyLinkBtn.style.backgroundColor = '#ccc'; // 可选：置灰
                    }


                    sessionCardsGrid.appendChild(sessionCard);
                });
                sessionListStatus.textContent = '';
            } else {
                sessionListStatus.textContent = '没有找到符合条件的会话。';
            }

            const totalPages = Math.ceil(data.total / itemsPerPage);
            pageInfo.textContent = `第 ${currentPage} / ${totalPages || 1} 页 (共 ${data.total} 条)`;
            prevPageBtn.disabled = currentPage === 1;
            nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;

        } catch (error) {
            console.error('加载会话列表失败:', error);
            sessionListStatus.textContent = '加载会话列表失败，请检查网络或服务器。';
            prevPageBtn.disabled = true;
            nextPageBtn.disabled = true;
        }
    }

    // --- 查看会话详情 ---
    async function viewSessionDetail(sessionId) {
        console.log(`点击查看详情按钮，会话ID: ${sessionId}`);
        showSection('sessionDetailSection');
        currentDetailSessionId = sessionId;
        detailCustomerName.textContent = '加载中...';
        detailSessionStatus.textContent = '加载中...';
        detailPhotoCount.textContent = '加载中...';
        detailCreatedAt.textContent = '加载中...';
        detailPhotosContainer.innerHTML = '';
        detailPhotosContainer.textContent = '加载照片中...';
        appendPhotoUpload.value = '';
        showAppendStatus('');
        photoFilter.value = 'all';

        try {
            console.log(`开始请求会话详情和照片数据 for sessionId: ${sessionId}`);
            const sessionListResponse = await fetch(`${BACKEND_URL}/sessions?search=${sessionId}&limit=1`);
            const sessionListData = await sessionListResponse.json();
            const currentSession = sessionListData.sessions[0];

            if (currentSession) {
                detailCustomerName.textContent = currentSession.customerName || '未知客户';
                detailSessionStatus.textContent = currentSession.status;
                detailPhotoCount.textContent = currentSession.photoCount;
                detailCreatedAt.textContent = formatDate(currentSession.createdAt);
                console.log('会话基本信息加载成功。');
            } else {
                console.warn(`未找到会话 ${sessionId} 的基本信息。`);
            }

            const photosResponse = await fetch(`${BACKEND_URL}/photos?sessionId=${sessionId}`, {
                headers: {
                    'X-Client-Type': 'photographer'
                }
            });
            const photosData = await photosResponse.json();

            if (photosData.code === 0 && photosData.photos.length > 0) {
                currentPhotosData = photosData.photos;
                applyPhotoFilter();
                console.log('照片数据加载成功。');
            } else {
                currentPhotosData = [];
                detailPhotosContainer.textContent = '该会话没有照片。';
                console.warn('会话没有照片或获取照片失败。');
            }
        } catch (error) {
            console.error('加载会话详情失败:', error);
            detailPhotosContainer.textContent = '加载会话详情失败，请检查网络或服务器。';
        }
    }

    // --- 应用照片筛选器 ---
    function applyPhotoFilter() {
        const filterValue = photoFilter.value;
        let filtered = [];

        if (filterValue === 'all') {
            filtered = currentPhotosData;
        } else if (filterValue === 'selected') {
            filtered = currentPhotosData.filter(photo => photo.selected);
        } else if (filterValue === 'unselected') {
            filtered = currentPhotosData.filter(photo => !photo.selected);
        }
        renderPhotos(filtered);
    }


    // --- 追加上传照片逻辑 ---
    appendUploadBtn.addEventListener('click', async () => {
        const files = appendPhotoUpload.files;
        if (files.length === 0) {
            showAppendStatus('请选择照片！', true);
            return;
        }
        if (!currentDetailSessionId) {
            showAppendStatus('会话ID缺失，无法追加上传。', true);
            return;
        }

        appendUploadBtn.disabled = true;
        showAppendStatus('追加上传中...');

        appendProgressBarContainer.style.display = 'block';
        appendProgressBar.style.width = '0%';
        appendProgressText.textContent = '0%';

        let totalAppendFilesSize = 0;
        Array.from(files).forEach(file => totalAppendFilesSize += file.size);

        const appendUploadedBytesMap = new Map();
        Array.from(files).forEach((_, index) => appendUploadedBytesMap.set(index, 0));

        const uploadPromises = Array.from(files).map((file, index) => {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                const formData = new FormData();
                formData.append('file', file);
                formData.append('sessionId', currentDetailSessionId);

                xhr.open('POST', `${BACKEND_URL}/upload`);

                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        appendUploadedBytesMap.set(index, e.loaded);

                        let currentTotalLoaded = 0;
                        appendUploadedBytesMap.forEach(loaded => currentTotalLoaded += loaded);

                        const percentComplete = (currentTotalLoaded / totalAppendFilesSize) * 100;
                        appendProgressBar.style.width = `${percentComplete.toFixed(2)}%`;
                        appendProgressText.textContent = `${percentComplete.toFixed(0)}%`;
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

                xhr.onerror = () => {
                    reject('网络错误或服务器无响应');
                };

                xhr.onabort = () => {
                    reject('上传已取消');
                };

                xhr.send(formData);
            });
        });

        try {
            const results = await Promise.all(uploadPromises);
            showAppendStatus('所有照片追加上传成功！');
            await viewSessionDetail(currentDetailSessionId);
            appendPhotoUpload.value = '';
        } catch (error) {
            showAppendStatus(`部分或全部追加上传失败: ${error}`, true);
        } finally {
            appendUploadBtn.disabled = false;
            appendProgressBarContainer.style.display = 'none';
            appendProgressBar.style.width = '0%';
            appendProgressText.textContent = '0%';
        }
    });

    // --- 删除整个会话逻辑 ---
    async function deleteSession(sessionIdToDelete) {
        const confirmDelete = confirm(`您确定要删除会话 ${sessionIdToDelete} 及其所有照片吗？\n此操作不可逆！`);
        if (!confirmDelete) {
            return;
        }

        sessionListStatus.textContent = `删除会话 ${sessionIdToDelete} 中...`;

        try {
            const response = await fetch(`${BACKEND_URL}/session/${sessionIdToDelete}`, {
                method: 'DELETE'
            });
            const data = await response.json();

            if (data.code === 0) {
                alert('会话及其所有照片已成功删除！');
                sessionListStatus.textContent = '会话删除成功！';
                currentPage = 1;
                loadSessionList();
            } else {
                sessionListStatus.textContent = `删除失败: ${data.message}`;
            }
        } catch (error) {
            sessionListStatus.textContent = '网络错误或服务器无响应';
        }
    }

    // --- 复制客户选片链接函数 ---
    function copyClientLink(sessionIdToCopy) {
        const clientLink = `${CLIENT_SELECTION_PAGE_BASE_URL}?sessionId=${sessionIdToCopy}`;
        copyTextToClipboard(clientLink); // 使用新的复制函数
    }

    // --- 事件监听器 ---
    applyFilterBtn.addEventListener('click', () => {
        currentPage = 1;
        loadSessionList();
    });

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadSessionList();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        currentPage++;
        loadSessionList();
    });

    backToListBtn.addEventListener('click', () => {
        showSection('sessionListSection');
        loadSessionList();
    });

    photoFilter.addEventListener('change', applyPhotoFilter);

    closeButton.addEventListener('click', () => {
        imageModal.style.display = 'none';
    });

    imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal) {
            imageModal.style.display = 'none';
        }
    });

    // 初始加载
    loadSessionList();
});