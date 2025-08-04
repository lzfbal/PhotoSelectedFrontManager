document.addEventListener('DOMContentLoaded', () => {
    const BACKEND_URL = 'http://localhost:3000'; // 替换为您的后端服务器地址

    const customerNameInput = document.getElementById('customerNameInput'); // 新增
    const photoUpload = document.getElementById('photoUpload');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadStatus = document.getElementById('uploadStatus');
    const uploadedPhotosContainer = document.getElementById('uploadedPhotos');
    const sessionIdDisplay = document.getElementById('sessionIdDisplay');
    const copySessionIdBtn = document.getElementById('copySessionIdBtn');
    const generateQrCodeBtn = document.getElementById('generateQrCodeBtn');
    const qrCodeImage = document.getElementById('qrCodeImage');
    const finishSessionBtn = document.getElementById('finishSessionBtn');

    let currentSessionId = ''; // 存储当前会话ID
    let uploadedPhotoList = []; // 存储已上传照片的信息

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
        updateButtonStates(); // 更新按钮状态
    }

    // --- 截断 ID 的辅助函数 (与 history-script.js 相同) ---
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


    // --- 事件监听器 ---

    // 上传照片
    uploadBtn.addEventListener('click', async () => {
        const files = photoUpload.files;
        if (files.length === 0) {
            showStatus('请选择照片！', true);
            return;
        }

        uploadBtn.disabled = true;
        showStatus('上传中...');

        // --- 核心改动：在批量上传前确定本次会话ID ---
        // 如果当前没有会话ID（表示是新会话），则立即生成一个
        if (!currentSessionId) {
            currentSessionId = generateUuidClientSide(); // 生成新的会话ID
            updateSessionIdDisplay(); // 更新显示
        }
        // 确定本次批量上传要使用的会话ID
        const batchSessionId = currentSessionId;
        // --- 核心改动结束 ---

        const uploadPromises = Array.from(files).map(file => {
            return new Promise(async (resolve, reject) => {
                const formData = new FormData();
                formData.append('file', file);
                // 始终发送本次批量上传确定的会话ID
                formData.append('sessionId', batchSessionId);

                // 添加客户姓名 (仅在本次上传是新会话的第一张照片时，或者需要更新客户姓名时发送)
                // 后端会处理客户姓名是否需要更新
                if (customerNameInput.value.trim()) {
                    formData.append('customerName', customerNameInput.value.trim());
                }

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
            showStatus('所有照片上传成功！');
            results.forEach(result => {
                // 此时 currentSessionId 已经确定，直接添加照片到列表
                uploadedPhotoList.push({ id: result.photoId, url: result.photoUrl });
            });
            renderUploadedPhotos();
            customerNameInput.value = ''; // 上传成功后清空客户姓名输入框
        } catch (error) {
            showStatus(`部分或全部上传失败: ${error}`, true);
            // 如果所有上传都失败了，并且这是新会话的第一批照片，可以考虑清空 currentSessionId
            // 但这会增加逻辑复杂性，对于演示项目可以暂时不处理此边缘情况
        } finally {
            uploadBtn.disabled = false;
        }
    });

    // 监听已上传照片容器的点击事件，使用事件委托处理删除按钮
    uploadedPhotosContainer.addEventListener('click', async (event) => {
        if (event.target.classList.contains('delete-photo-btn')) {
            const photoIdToDelete = event.target.dataset.photoId;
            if (confirm(`确定要删除照片 ID: ${photoIdToDelete} 吗？`)) {
                await deletePhoto(photoIdToDelete);
            }
        }
    });

    // 删除照片函数
    async function deletePhoto(photoId) {
        if (!currentSessionId) {
            showStatus('没有当前会话ID，无法删除照片。', true);
            return;
        }
        showStatus('删除中...');
        try {
            const response = await fetch(`${BACKEND_URL}/photo/${currentSessionId}/${photoId}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (data.code === 0) {
                showStatus('照片删除成功！');
                uploadedPhotoList = uploadedPhotoList.filter(p => p.id !== photoId);
                renderUploadedPhotos(); // 重新渲染列表
            } else {
                showStatus(`删除失败: ${data.message}`, true);
            }
        } catch (error) {
            showStatus('网络错误或服务器无响应', true);
        }
    }

    // 复制选片码
    copySessionIdBtn.addEventListener('click', () => {
        if (currentSessionId) {
            navigator.clipboard.writeText(currentSessionId)
                .then(() => {
                    alert('选片码已复制到剪贴板！');
                })
                .catch(err => {
                    console.error('复制失败:', err);
                    alert('复制失败，请手动复制: ' + currentSessionId);
                });
        } else {
            alert('当前没有选片码可复制。');
        }
    });

    // 生成二维码
    generateQrCodeBtn.addEventListener('click', async () => {
        if (!currentSessionId || uploadedPhotoList.length === 0) {
            alert('请先上传照片并获取选片码！');
            return;
        }

        generateQrCodeBtn.disabled = true;
        qrCodeImage.style.display = 'none';
        showStatus('生成二维码中...');

        try {
            const response = await fetch(`${BACKEND_URL}/generateQRCode`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    page: 'pages/customer/customer' // 小程序客户选片页面的路径
                })
            });
            const data = await response.json();
            if (data.code === 0) {
                qrCodeImage.src = data.qrCodeUrl;
                qrCodeImage.style.display = 'block';
                showStatus('二维码生成成功！');
            } else {
                showStatus(`生成二维码失败: ${data.message}`, true);
            }
        } catch (error) {
            showStatus('网络错误或服务器无响应', true);
        } finally {
            generateQrCodeBtn.disabled = false;
        }
    });

    // 完成会话
    finishSessionBtn.addEventListener('click', async () => {
        if (!currentSessionId) {
            alert('没有进行中的选片会话。');
            return;
        }
        if (uploadedPhotoList.length === 0) {
            alert('会话中没有照片，无法完成。');
            return;
        }

        finishSessionBtn.disabled = true;
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
                showStatus('会话已完成，客户可以选片了！');
                // 清空当前状态，准备开始新的会话
                currentSessionId = '';
                uploadedPhotoList = [];
                qrCodeImage.style.display = 'none';
                qrCodeImage.src = '';
                updateSessionIdDisplay();
                renderUploadedPhotos();
            } else {
                showStatus(`完成会话失败: ${data.message}`, true);
            }
        } catch (error) {
            showStatus('网络错误或服务器无响应', true);
        } finally {
            finishSessionBtn.disabled = false;
        }
    });

    // 初始化显示
    updateSessionIdDisplay();
});