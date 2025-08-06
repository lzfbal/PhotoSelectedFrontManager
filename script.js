document.addEventListener('DOMContentLoaded', () => {
    // 将 BACKEND_URL 修改为您的服务器公网 IP 地址和 Nginx 代理的 API 路径
    // const BACKEND_URL = 'http://localhost:3000';
    const BACKEND_URL = 'http://47.107.129.145/api'; // <--- 修改这里

    const customerNameInput = document.getElementById('customerNameInput');
    const photoUpload = document.getElementById('photoUpload');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadStatus = document.getElementById('uploadStatus');
    const uploadedPhotosContainer = document.getElementById('uploadedPhotos');
    const sessionIdDisplay = document.getElementById('sessionIdDisplay');
    const copySessionIdBtn = document.getElementById('copySessionIdBtn');
    const generateQrCodeBtn = document.getElementById('generateQrCodeBtn');
    const qrCodeImage = document.getElementById('qrCodeImage');
    const finishSessionBtn = document.getElementById('finishSessionBtn');

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

    function updateSessionIdDisplay() {
        sessionIdDisplay.textContent = currentSessionId || '无';
        updateButtonStates();
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

    // --- 新增：客户端生成 UUID 的辅助函数 ---
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

        let newSessionId = currentSessionId || generateUuidClientSide();
        const customerName = customerNameInput.value.trim();

        const uploadPromises = Array.from(files).map(file => {
            return new Promise(async (resolve, reject) => {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('sessionId', newSessionId);
                formData.append('customerName', customerName);

                try {
                    const response = await fetch(`${BACKEND_URL}/upload`, {
                        method: 'POST',
                        body: formData
                    });
                    const data = await response.json();
                    if (data.code === 0) {
                        resolve(data);
                    } else {
                        reject(data.message || '上传失败');
                    }
                } catch (error) {
                    reject('网络错误或服务器无响应');
                }
            });
        });

        try {
            const results = await Promise.all(uploadPromises);
            currentSessionId = newSessionId;
            updateSessionIdDisplay();
            showStatus('所有照片上传成功！');
            uploadedPhotoList = results.map(r => ({ id: r.photoId, url: r.photoUrl }));
            renderUploadedPhotos();
            photoUpload.value = ''; // 清空文件选择
        } catch (error) {
            showStatus(`部分或全部上传失败: ${error}`, true);
        } finally {
            uploadBtn.disabled = false;
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

    // --- 复制会话ID ---
    copySessionIdBtn.addEventListener('click', () => {
        if (currentSessionId) {
            navigator.clipboard.writeText(currentSessionId).then(() => {
                alert('会话ID已复制到剪贴板！');
            }).catch(err => {
                console.error('复制失败:', err);
                alert('复制失败，请手动复制。');
            });
        } else {
            alert('没有可复制的会话ID。');
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
                updateSessionIdDisplay();
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
    updateSessionIdDisplay();
});