document.addEventListener('DOMContentLoaded', () => {
    // ====================================================================
    // DEBUG 选项: true 为本地开发环境 (localhost), false 为生产环境
    const DEBUG_MODE = false; // <--- 修改这里来切换调试模式
    // ====================================================================

    const BACKEND_URL = DEBUG_MODE ? 'http://localhost:3000' : 'http://47.107.129.145/api';

    const sessionListSection = document.getElementById('sessionListSection');
    const sessionTableBody = document.getElementById('sessionTable').getElementsByTagName('tbody')[0];
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

    // 追加上传相关的元素
    const appendPhotoUpload = document.getElementById('appendPhotoUpload');
    const appendUploadBtn = document.getElementById('appendUploadBtn');
    const appendUploadStatus = document.getElementById('appendUploadStatus');

    // 追加上传进度条元素
    const appendProgressBarContainer = document.getElementById('appendProgressBarContainer');
    const appendProgressBar = document.getElementById('appendProgressBar');
    const appendProgressText = document.getElementById('appendProgressText');

    // 照片筛选器元素
    const photoFilter = document.getElementById('photoFilter');

    // 大图预览模态框元素
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeButton = document.querySelector('.close-button');


    let currentPage = 1;
    const itemsPerPage = 10;
    let currentDetailSessionId = ''; // 存储当前详情页面的会话ID
    let currentPhotosData = []; // 存储当前会话的所有照片数据，用于筛选


    // --- 辅助函数 ---
    function showSection(sectionId) {
        sessionListSection.style.display = 'none';
        sessionDetailSection.style.display = 'none';
        document.getElementById(sectionId).style.display = 'block';
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

    // --- 渲染照片列表 (根据筛选条件) ---
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
                // 为图片添加点击事件监听器
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

    // --- 加载会话列表 ---
    async function loadSessionList() {
        sessionListStatus.textContent = '加载中...';
        sessionTableBody.innerHTML = '';

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
                    const row = sessionTableBody.insertRow();
                    row.insertCell().textContent = truncateId(session.id); // 显示截断的会话ID
                    row.insertCell().textContent = session.customerName || '未知客户';
                    row.insertCell().textContent = session.photoCount;
                    row.insertCell().textContent = session.status;
                    row.insertCell().textContent = formatDate(session.createdAt);
                    const actionCell = row.insertCell();

                    // 查看详情按钮
                    const viewBtn = document.createElement('button');
                    viewBtn.textContent = '查看详情';
                    viewBtn.onclick = () => viewSessionDetail(session.id);
                    actionCell.appendChild(viewBtn);

                    // 删除按钮
                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = '删除';
                    deleteBtn.classList.add('delete-button-table'); // 添加样式类
                    deleteBtn.onclick = () => deleteSession(session.id); // 绑定删除事件
                    actionCell.appendChild(deleteBtn);
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
        photoFilter.value = 'all'; // 重置照片筛选器

        try {
            const sessionListResponse = await fetch(`${BACKEND_URL}/sessions?search=${sessionId}&limit=1`);
            const sessionListData = await sessionListResponse.json();
            const currentSession = sessionListData.sessions[0];

            if (currentSession) {
                detailCustomerName.textContent = currentSession.customerName || '未知客户';
                detailSessionStatus.textContent = currentSession.status;
                detailPhotoCount.textContent = currentSession.photoCount;
                detailCreatedAt.textContent = formatDate(currentSession.createdAt);
            }

            const photosResponse = await fetch(`${BACKEND_URL}/photos?sessionId=${sessionId}`, {
                headers: {
                    'X-Client-Type': 'photographer'
                }
            });
            const photosData = await photosResponse.json();

            if (photosData.code === 0 && photosData.photos.length > 0) {
                currentPhotosData = photosData.photos; // 存储原始照片数据
                applyPhotoFilter(); // 初始渲染时应用筛选
            } else {
                currentPhotosData = [];
                detailPhotosContainer.textContent = '该会话没有照片。';
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

        // 显示并重置进度条
        appendProgressBarContainer.style.display = 'block';
        appendProgressBar.style.width = '0%';
        appendProgressText.textContent = '0%';

        // 计算所有文件的总大小，用于总体进度
        let totalAppendFilesSize = 0;
        Array.from(files).forEach(file => totalAppendFilesSize += file.size);

        // 使用 Map 存储每个文件已上传的字节数
        const appendUploadedBytesMap = new Map();
        Array.from(files).forEach((_, index) => appendUploadedBytesMap.set(index, 0));

        const uploadPromises = Array.from(files).map((file, index) => {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                const formData = new FormData();
                formData.append('file', file);
                formData.append('sessionId', currentDetailSessionId);

                xhr.open('POST', `${BACKEND_URL}/upload`);

                // 监听上传进度事件
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        appendUploadedBytesMap.set(index, e.loaded); // 更新当前文件的已上传字节数

                        let currentTotalLoaded = 0;
                        appendUploadedBytesMap.forEach(loaded => currentTotalLoaded += loaded); // 累加所有文件的已上传字节数

                        const percentComplete = (currentTotalLoaded / totalAppendFilesSize) * 100;
                        appendProgressBar.style.width = `${percentComplete.toFixed(2)}%`;
                        appendProgressText.textContent = `${percentComplete.toFixed(0)}%`;
                    }
                });

                // 监听加载完成事件
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

                // 监听错误事件
                xhr.onerror = () => {
                    reject('网络错误或服务器无响应');
                };

                // 监听取消事件 (可选)
                xhr.onabort = () => {
                    reject('上传已取消');
                };

                xhr.send(formData);
            });
        });

        try {
            const results = await Promise.all(uploadPromises);
            showAppendStatus('所有照片追加上传成功！');
            // 重新加载详情页以更新照片列表和数量
            await viewSessionDetail(currentDetailSessionId);
            appendPhotoUpload.value = ''; // 清空文件选择
        } catch (error) {
            showAppendStatus(`部分或全部追加上传失败: ${error}`, true);
        } finally {
            appendUploadBtn.disabled = false;
            // 隐藏并重置进度条
            appendProgressBarContainer.style.display = 'none';
            appendProgressBar.style.width = '0%';
            appendProgressText.textContent = '0%';
        }
    });

    // --- 删除整个会话逻辑 (现在由表格中的按钮触发) ---
    async function deleteSession(sessionIdToDelete) {
        const confirmDelete = confirm(`您确定要删除会话 ${sessionIdToDelete} 及其所有照片吗？\n此操作不可逆！`);
        if (!confirmDelete) {
            return;
        }

        // 禁用所有删除按钮，防止重复点击
        document.querySelectorAll('.delete-button-table').forEach(btn => btn.disabled = true);
        sessionListStatus.textContent = `删除会话 ${sessionIdToDelete} 中...`;

        try {
            const response = await fetch(`${BACKEND_URL}/session/${sessionIdToDelete}`, {
                method: 'DELETE'
            });
            const data = await response.json();

            if (data.code === 0) {
                alert('会话及其所有照片已成功删除！');
                sessionListStatus.textContent = '会话删除成功！';
                // 删除成功后，重新加载会话列表
                currentPage = 1; // 重置分页
                loadSessionList();
            } else {
                sessionListStatus.textContent = `删除失败: ${data.message}`;
            }
        } catch (error) {
            sessionListStatus.textContent = '网络错误或服务器无响应';
        } finally {
            // 重新启用所有删除按钮（在 loadSessionList 重新渲染后也会自动启用）
            document.querySelectorAll('.delete-button-table').forEach(btn => btn.disabled = false);
        }
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

    // 监听照片筛选器变化
    photoFilter.addEventListener('change', applyPhotoFilter);

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


    // 初始加载
    loadSessionList();
});