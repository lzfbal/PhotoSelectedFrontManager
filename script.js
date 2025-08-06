document.addEventListener('DOMContentLoaded', () => {
    // ====================================================================
    // DEBUG 选项: true 为本地开发环境 (localhost), false 为生产环境
    const DEBUG_MODE = false; // <--- 修改这里来切换调试模式
    // ====================================================================

    const BACKEND_URL = DEBUG_MODE ? 'http://localhost:3000' : 'http://47.107.129.145/api';

    const customerNameInput = document.getElementById('customerNameInput');
    const photoUpload = document.getElementById('photoUpload');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadStatus = document.getElementById('uploadStatus');
    const uploadedPhotosContainer = document.getElementById('uploadedPhotos');
    const generateQrCodeBtn = document.getElementById('generateQrCodeBtn');
    const qrCodeImage = document.getElementById('qrCodeImage');
    const finishSessionBtn = document.getElementById('finishSessionBtn');

    // 进度条元素
    const progressBarContainer = document.getElementById('progressBarContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    let currentSessionId = '';
    let uploadedPhotoList = [];

    // --- 辅助函数 ---
    function showStatus(message, isError = false) {
        uploadStatus.textContent = message;
        uploadStatus.style.color = isError ? 'red' : 'green';
    }

    function updateButtonStates() {
        const hasPhotos = uploadedPhotoList.length > 0;
        finishSessionBtn.disabled = !hasPhotos;
        generateQrCodeBtn.disabled = !hasPhotos;
    }

    function truncateId(id, length = 8) {
        if (!id) return '';
        if (id.length <= length) return id;
        return id.substring(0, length) + '...';
    }

    function renderUploadedPhotos() {
        uploadedPhotosContainer.innerHTML = '';
        uploadedPhotoList.forEach(photo => {
            const photoItem = document.createElement('div');
            photoItem.className = 'photo-item';
            photoItem.innerHTML = `
                <img src="${photo.url}" alt="Photo ${photo.id}">
                <div class="photo-id-display" title="${photo.id}">ID: ${truncateId(photo.id)}</div>
                <button class="delete-photo-btn" data-photo-id="${photo.id}">X</button>
            `;
            uploadedPhotosContainer.appendChild(photoItem);
        });
        updateButtonStates();
    }

    // --- 客户端生成 UUID 的辅助函数 ---
    function generateUuidClientSide() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // --- 上传照片逻辑 ---
    uploadBtn.addEventListener('click', async () => {
        const files = photoUpload.files;
        if (files.length === 0) {
            showStatus('请选择照片！', true);
            return;
        }

        uploadBtn.disabled = true;
        showStatus('上传中...');

        // 显示并重置进度条
        progressBarContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = '0%';

        let newSessionId = currentSessionId || generateUuidClientSide();
        const customerName = customerNameInput.value.trim();

        // 计算所有文件的总大小，用于总体进度
        let totalFilesSize = 0;
        Array.from(files).forEach(file => totalFilesSize += file.size);

        // 使用 Map 存储每个文件已上传的字节数，键为文件在 files 数组中的索引
        const uploadedBytesMap = new Map();
        Array.from(files).forEach((_, index) => uploadedBytesMap.set(index, 0));

        const uploadPromises = Array.from(files).map((file, index) => {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                const formData = new FormData();
                formData.append('file', file);
                formData.append('sessionId', newSessionId);
                formData.append('customerName', customerName);

                xhr.open('POST', `${BACKEND_URL}/upload`);

                // 监听上传进度事件
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        uploadedBytesMap.set(index, e.loaded); // 更新当前文件的已上传字节数

                        let currentTotalLoaded = 0;
                        uploadedBytesMap.forEach(loaded => currentTotalLoaded += loaded); // 累加所有文件的已上传字节数

                        const percentComplete = (currentTotalLoaded / totalFilesSize) * 100;
                        progressBar.style.width = `${percentComplete.toFixed(2)}%`;
                        progressText.textContent = `${percentComplete.toFixed(0)}%`;
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
            currentSessionId = newSessionId;
            showStatus('所有照片上传成功！');
            uploadedPhotoList = results.map(r => ({ id: r.photoId, url: r.photoUrl }));
            renderUploadedPhotos();
            photoUpload.value = ''; // 清空文件选择
        } catch (error) {
            showStatus(`部分或全部上传失败: ${error}`, true);
        } finally {
            uploadBtn.disabled = false;
            // 隐藏并重置进度条
            progressBarContainer.style.display = 'none';
            progressBar.style.width = '0%';
            progressText.textContent = '0%';
        }
    });

    // --- 删除照片逻辑 ---
    uploadedPhotosContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-photo-btn')) {
            const photoIdToDelete = e.target.dataset.photoId;
            if (!photoIdToDelete || !currentSessionId) {
                showStatus('照片ID或会话ID缺失，无法删除。', true);
                return;
            }

            if (!confirm('确定要删除这张照片吗？')) {
                return;
            }

            showStatus('删除中...');
            try {
                const response = await fetch(`${BACKEND_URL}/photo/${currentSessionId}/${photoIdToDelete}`, {
                    method: 'DELETE'
                });
                const data = await response.json();
                if (data.code === 0) {
                    showStatus('照片删除成功！');
                    uploadedPhotoList = uploadedPhotoList.filter(photo => photo.id !== photoIdToDelete);
                    renderUploadedPhotos();
                } else {
                    showStatus(`删除失败: ${data.message}`, true);
                }
            } catch (error) {
                showStatus('网络错误或服务器无响应', true);
            }
        }
    });

    // --- 生成二维码 ---
    generateQrCodeBtn.addEventListener('click', async () => {
        if (!currentSessionId) {
            showStatus('请先上传照片以生成会话ID！', true);
            return;
        }
        showStatus('生成二维码中...');
        try {
            const response = await fetch(`${BACKEND_URL}/generateQRCode`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    page: 'pages/selection/selection' // 小程序选片页面路径
                })
            });
            const data = await response.json();
            if (data.code === 0) {
                qrCodeImage.src = data.qrCodeUrl;
                qrCodeImage.style.display = 'block';
                showStatus('二维码生成成功！');
            } else {
                showStatus(`二维码生成失败: ${data.message}`, true);
                qrCodeImage.style.display = 'none';
            }
        } catch (error) {
            showStatus('网络错误或服务器无响应', true);
            qrCodeImage.style.display = 'none';
        }
    });

    // --- 完成会话 ---
    finishSessionBtn.addEventListener('click', async () => {
        if (!currentSessionId || uploadedPhotoList.length === 0) {
            showStatus('没有会话或照片，无法完成。', true);
            return;
        }
        if (!confirm('确定要完成本次会话吗？完成意味着客户可以开始选片了。')) {
            return;
        }
        showStatus('完成会话中...');
        try {
            const response = await fetch(`${BACKEND_URL}/finishSession`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sessionId: currentSessionId })
            });
            const data = await response.json();
            if (data.code === 0) {
                showStatus('会话已完成！');
                // 可以清空当前会话数据，准备开始新的会话
                currentSessionId = '';
                uploadedPhotoList = [];
                renderUploadedPhotos();
                customerNameInput.value = '';
                qrCodeImage.style.display = 'none';
            } else {
                showStatus(`完成会话失败: ${data.message}`, true);
            }
        } catch (error) {
            showStatus('网络错误或服务器无响应', true);
        }
    });

    // 初始状态更新
    updateButtonStates();
});