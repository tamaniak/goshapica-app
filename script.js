/**
 * GoShaPica Application
 * This script is structured to professional standards with a modular architecture
 * and a mock API to simulate a secure, asynchronous backend.
 */
(function () {
    'use strict';

    // --- 1. STATE MANAGEMENT ---
    const state = {
        uploadedFile: null,
        selectedFrameId: null,
        frames: [],
        isAuthenticated: false,
        authToken: null,
        isProcessing: false,
    };

    // --- 2. MOCK API (Simulating a Secure Backend) ---
    const api = {
        /**
         * Simulates a login request. In a real app, this would be an HTTPS call.
         * @param {string} password The password to check.
         * @returns {Promise<string>} A promise that resolves with a mock auth token.
         */
        login(password) {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    if (password === 'goshapica2024') {
                        const token = `mock_token_${Date.now()}`;
                        state.isAuthenticated = true;
                        state.authToken = token;
                        resolve(token);
                    } else {
                        reject(new Error('Incorrect password.'));
                    }
                }, 500);
            });
        },
        /**
         * Simulates fetching frames from a database.
         * @returns {Promise<Array>} A promise that resolves with the list of frames.
         */
        getFrames() {
            return new Promise((resolve) => {
                setTimeout(() => {
                    const frames = JSON.parse(localStorage.getItem('goshapica_frames')) || [
                        { id: 'classic-wood', name: 'Classic Wood', url: 'https://i.imgur.com/8x1F5s1.png' },
                        { id: 'modern-black', name: 'Modern Black', url: 'https://i.imgur.com/uQ9YQhN.png' },
                        { id: 'ornate-gold', name: 'Ornate Gold', url: 'https://i.imgur.com/y1vR3S9.png' },
                    ];
                    localStorage.setItem('goshapica_frames', JSON.stringify(frames));
                    resolve(frames);
                }, 300);
            });
        },
        /**
         * Simulates adding a new frame to the database.
         * @param {string} name - The name of the new frame.
         * @param {string} base64Url - The base64 data URL of the frame image.
         * @returns {Promise<Object>} A promise that resolves with the new frame object.
         */
        addFrame(name, base64Url) {
            // NOTE: Authentication check would happen on a real server.
            return new Promise((resolve, reject) => {
                if (!state.isAuthenticated) return reject(new Error('Not authorized.'));
                setTimeout(() => {
                    const newFrame = { id: `custom_${Date.now()}`, name, url: base64Url };
                    const frames = JSON.parse(localStorage.getItem('goshapica_frames'));
                    frames.push(newFrame);
                    localStorage.setItem('goshapica_frames', JSON.stringify(frames));
                    resolve(newFrame);
                }, 1000);
            });
        },
        /**
         * Simulates deleting a frame from the database.
         * @param {string} frameId The ID of the frame to delete.
         * @returns {Promise<void>}
         */
        deleteFrame(frameId) {
             // NOTE: Authentication check would happen on a real server.
            return new Promise((resolve, reject) => {
                if (!state.isAuthenticated) return reject(new Error('Not authorized.'));
                setTimeout(() => {
                    let frames = JSON.parse(localStorage.getItem('goshapica_frames'));
                    frames = frames.filter(f => f.id !== frameId);
                    localStorage.setItem('goshapica_frames', JSON.stringify(frames));
                    resolve();
                }, 500);
            });
        }
    };
    
    // --- 3. DOM CACHING ---
    const dom = new Map(
        Array.from(document.querySelectorAll('[id]')).map(el => [el.id, el])
    );
    const getEl = (id) => dom.get(id);

    // --- 4. UI LOGIC & RENDERING ---
    const ui = {
        showToast(message, isError = false) {
            const toast = getEl('toast');
            toast.textContent = message;
            toast.className = `toast show ${isError ? 'toast--error' : ''}`;
            setTimeout(() => toast.classList.remove('show'), 4000);
        },
        renderStatus(container, message, type = 'success') {
            container.innerHTML = `<div class="status status--${type}">${message}</div>`;
        },
        clearStatus(container) {
            container.innerHTML = '';
        },
        toggleModal(modalId, show) {
            const modal = getEl(modalId);
            if (show) {
                modal.classList.add('show');
                const firstInput = modal.querySelector('input, button');
                if (firstInput) firstInput.focus();
            } else {
                modal.classList.remove('show');
            }
        },
        renderFrames() {
            const grid = getEl('frameGrid');
            grid.innerHTML = state.frames.map(frame => `
                <div class="frame-card" data-frame-id="${frame.id}" tabindex="0" role="radio" aria-checked="false">
                    <div class="frame-preview" style="background-image: url('${frame.url}')"></div>
                    <div class="frame-name">${frame.name}</div>
                </div>
            `).join('');
        },
        renderAdminFrames() {
            const grid = getEl('frameManagementGrid');
            const template = getEl('adminFrameCardTemplate');
            grid.innerHTML = '';
            state.frames.forEach(frame => {
                const card = template.content.cloneNode(true);
                card.querySelector('.admin-frame-card').dataset.frameId = frame.id;
                card.querySelector('.admin-frame-card__img').src = frame.url;
                card.querySelector('.admin-frame-card__img').alt = frame.name;
                card.querySelector('.admin-frame-card__name').textContent = frame.name;
                card.querySelector('.admin-frame-card__delete-btn').setAttribute('aria-label', `Delete ${frame.name}`);
                grid.appendChild(card);
            });
        },
        updateDynamicUI() {
            // Update selected frame visual
            document.querySelectorAll('.frame-card').forEach(card => {
                const isSelected = card.dataset.frameId === state.selectedFrameId;
                card.classList.toggle('selected', isSelected);
                card.setAttribute('aria-checked', isSelected);
            });

            const canProcess = state.uploadedFile && state.selectedFrameId;
            getEl('downloadBtn').disabled = !canProcess;
            getEl('previewSection').style.display = canProcess ? 'block' : 'none';

            if (canProcess) core.drawCanvas();
        },
        setButtonLoading(btn, textSpan, spinner, isLoading) {
            textSpan.textContent = isLoading ? 'Saving...' : 'Save Frame';
            spinner.classList.toggle('u-hidden', !isLoading);
            btn.disabled = isLoading;
        }
    };

    // --- 5. CORE APPLICATION LOGIC ---
    const core = {
        async init() {
            try {
                state.frames = await api.getFrames();
                ui.renderFrames();
                this.attachEventListeners();
            } catch (error) {
                ui.renderStatus(getEl('frameStatus'), 'Could not load frames.', 'error');
            }
        },
        handleFileUpload(file) {
            if (!file || !file.type.startsWith('image/')) return ui.showToast('Please select a valid image file.', true);
            if (file.size > 10 * 1024 * 1024) return ui.showToast('File size must be under 10MB.', true);
            
            state.uploadedFile = file;
            const reader = new FileReader();
            reader.onload = e => {
                getEl('uploadedImage').src = e.target.result;
                getEl('uploadedImage').style.display = 'block';
                ui.showToast('Image uploaded successfully!');
                ui.updateDynamicUI();
            };
            reader.readAsDataURL(file);
        },
        async drawCanvas() {
            if (!state.uploadedFile || !state.selectedFrameId) return;

            getEl('processingOverlay').style.display = 'flex';
            const userImg = new Image();
            userImg.src = getEl('uploadedImage').src;
            await new Promise(r => userImg.onload = r);
            
            const frameData = state.frames.find(f => f.id === state.selectedFrameId);
            const frameImg = new Image();
            frameImg.crossOrigin = "Anonymous";
            frameImg.src = frameData.url;
            await new Promise(r => frameImg.onload = r);
            
            const canvas = getEl('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = frameImg.naturalWidth;
            canvas.height = frameImg.naturalHeight;
            ctx.drawImage(userImg, 0, 0, canvas.width, canvas.height);
            ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
            getEl('processingOverlay').style.display = 'none';
        },
        resetApp() {
            state.uploadedFile = null;
            state.selectedFrameId = null;
            getEl('uploadedImage').style.display = 'none';
            getEl('fileInput').value = '';
            getEl('previewSection').style.display = 'none';
            ui.updateDynamicUI();
            ui.showToast('Ready for a new photo!');
        },
        attachEventListeners() {
            // User flow events
            const uploadZone = getEl('uploadZone');
            uploadZone.addEventListener('click', () => getEl('fileInput').click());
            getEl('fileInput').addEventListener('change', e => this.handleFileUpload(e.target.files[0]));
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eName => {
                uploadZone.addEventListener(eName, e => { e.preventDefault(); e.stopPropagation(); });
            });
            uploadZone.addEventListener('dragover', () => uploadZone.classList.add('dragover'));
            uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
            uploadZone.addEventListener('drop', e => {
                uploadZone.classList.remove('dragover');
                this.handleFileUpload(e.dataTransfer.files[0]);
            });
            getEl('frameGrid').addEventListener('click', e => {
                const card = e.target.closest('.frame-card');
                if (card) {
                    state.selectedFrameId = card.dataset.frameId;
                    ui.updateDynamicUI();
                }
            });
            getEl('downloadBtn').addEventListener('click', () => {
                const link = document.createElement('a');
                link.download = `GoShaPica_${Date.now()}.png`;
                link.href = getEl('canvas').toDataURL('image/png');
                link.click();
            });
            getEl('resetBtn').addEventListener('click', this.resetApp);
            
            // Admin flow events
            getEl('adminAccessBtn').addEventListener('click', () => ui.toggleModal('adminModal', true));
            getEl('adminCancelBtn').addEventListener('click', () => ui.toggleModal('adminModal', false));
            getEl('adminCloseBtn').addEventListener('click', () => ui.toggleModal('adminPanel', false));
            getEl('adminLoginForm').addEventListener('submit', async e => {
                e.preventDefault();
                const password = getEl('adminPasswordInput').value;
                try {
                    await api.login(password);
                    ui.toggleModal('adminModal', false);
                    ui.toggleModal('adminPanel', true);
                    ui.renderAdminFrames();
                } catch (error) {
                    ui.showToast(error.message, true);
                } finally {
                    getEl('adminPasswordInput').value = '';
                }
            });
            getEl('addFrameForm').addEventListener('submit', async e => {
                e.preventDefault();
                const btn = getEl('saveFrameBtn');
                const text = getEl('saveFrameBtnText');
                const spinner = getEl('saveFrameSpinner');
                const nameInput = getEl('frameNameInput');
                const fileInput = getEl('frameFileInput');
                
                ui.setButtonLoading(btn, text, spinner, true);
                const file = fileInput.files[0];
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = async () => {
                    try {
                        await api.addFrame(nameInput.value, reader.result);
                        state.frames = await api.getFrames();
                        ui.renderFrames();
                        ui.renderAdminFrames();
                        e.target.reset();
                        ui.renderStatus(getEl('adminStatus'), 'Frame saved successfully!', 'success');
                    } catch (error) {
                        ui.renderStatus(getEl('adminStatus'), error.message, 'error');
                    } finally {
                        ui.setButtonLoading(btn, text, spinner, false);
                    }
                };
            });
            getEl('frameManagementGrid').addEventListener('click', async e => {
                const deleteBtn = e.target.closest('.admin-frame-card__delete-btn');
                if (deleteBtn) {
                    const card = deleteBtn.closest('.admin-frame-card');
                    const frameId = card.dataset.frameId;
                    if (confirm(`Are you sure you want to delete the "${card.querySelector('.admin-frame-card__name').textContent}" frame?`)) {
                        card.classList.add('is-deleting');
                        try {
                            await api.deleteFrame(frameId);
                            // Give animation time to play
                            setTimeout(async () => {
                                state.frames = await api.getFrames();
                                ui.renderFrames();
                                ui.renderAdminFrames();
                                ui.renderStatus(getEl('adminStatus'), 'Frame deleted.', 'success');
                            }, 300);
                        } catch (error) {
                             ui.renderStatus(getEl('adminStatus'), error.message, 'error');
                             card.classList.remove('is-deleting');
                        }
                    }
                }
            });
        }
    };

    // --- 6. INITIALIZATION ---
    document.addEventListener('DOMContentLoaded', () => core.init());

})();
