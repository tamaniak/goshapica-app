/**
 * GoShaPica Application
 * VERSION: 3.0 (Final Polish)
 * A professional, production-ready implementation featuring a modular architecture,
 * mock API, robust error handling, and comprehensive edge-case management.
 */
(function () {
    'use strict';

    // --- 1. STATE MANAGEMENT ---
    const state = { uploadedFile: null, selectedFrameId: null, frames: [], isAuthenticated: false, authToken: null };

    // --- 2. MOCK API (Simulating a Secure Backend) ---
    const api = {
        login(password) {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    if (password === 'goshapica2024') {
                        state.isAuthenticated = true;
                        state.authToken = `mock_token_${Date.now()}`;
                        resolve(state.authToken);
                    } else { reject(new Error('Incorrect password.')); }
                }, 500);
            });
        },
        getFrames() {
            return new Promise((resolve) => {
                setTimeout(() => {
                    try {
                        const framesData = localStorage.getItem('goshapica_frames');
                        const frames = JSON.parse(framesData) || [
                            { id: 'classic-wood', name: 'Classic Wood', url: 'https://i.imgur.com/8x1F5s1.png', isActive: true },
                            { id: 'modern-black', name: 'Modern Black', url: 'https://i.imgur.com/uQ9YQhN.png', isActive: false },
                            { id: 'ornate-gold', name: 'Ornate Gold', url: 'https://i.imgur.com/y1vR3S9.png', isActive: false },
                        ];
                        if (!framesData) localStorage.setItem('goshapica_frames', JSON.stringify(frames));
                        resolve(frames);
                    } catch (e) {
                        console.error("LocalStorage access failed. Using default frames.", e);
                        resolve([ { id: 'classic-wood', name: 'Classic Wood', url: 'https://i.imgur.com/8x1F5s1.png', isActive: true } ]);
                    }
                }, 300);
            });
        },
        addFrames(collectionName, frameDataUrls) {
            return new Promise((resolve, reject) => {
                if (!state.isAuthenticated) return reject(new Error('Not authorized.'));
                setTimeout(() => {
                    const frames = JSON.parse(localStorage.getItem('goshapica_frames'));
                    const newFrames = frameDataUrls.map((url, i) => ({ id: `custom_${Date.now()}_${i}`, name: `${collectionName} ${i + 1}`, url, isActive: false }));
                    localStorage.setItem('goshapica_frames', JSON.stringify([...frames, ...newFrames]));
                    resolve(newFrames);
                }, 1000);
            });
        },
        activateFrame(frameIdToActivate) {
            return new Promise((resolve, reject) => {
                 if (!state.isAuthenticated) return reject(new Error('Not authorized.'));
                 setTimeout(() => {
                    let frames = JSON.parse(localStorage.getItem('goshapica_frames'));
                    frames.forEach(frame => { frame.isActive = (frame.id === frameIdToActivate); });
                    localStorage.setItem('goshapica_frames', JSON.stringify(frames));
                    resolve();
                 }, 400);
            });
        },
        deleteFrame(frameId) {
            return new Promise((resolve, reject) => {
                if (!state.isAuthenticated) return reject(new Error('Not authorized.'));
                setTimeout(() => {
                    let frames = JSON.parse(localStorage.getItem('goshapica_frames'));
                    const frameToDelete = frames.find(f => f.id === frameId);
                    if (!frameToDelete) return reject(new Error('Frame not found.'));
                    const wasActive = frameToDelete.isActive;
                    frames = frames.filter(f => f.id !== frameId);
                    localStorage.setItem('goshapica_frames', JSON.stringify(frames));
                    resolve({ wasActive });
                }, 500);
            });
        }
    };
    
    // --- 3. DOM CACHING ---
    const dom = new Map(Array.from(document.querySelectorAll('[id]')).map(el => [el.id, el]));
    const getEl = (id) => dom.get(id);

    // --- 4. UI LOGIC & RENDERING ---
    const ui = {
        showToast(message, isError = false) { const toast = getEl('toast'); toast.textContent = message; toast.className = `toast show ${isError ? 'toast--error' : ''}`; setTimeout(() => toast.classList.remove('show'), 4000); },
        renderStatus(container, message, type = 'success') { if(container) container.innerHTML = `<div class="status status--${type}">${message}</div>`; },
        toggleModal(modalId, show) { const modal = getEl(modalId); if(modal) { if (show) { modal.classList.add('show'); modal.querySelector('input, button')?.focus(); } else { modal.classList.remove('show'); } } },
        renderFrames() {
            const grid = getEl('frameGrid');
            if(!grid) return;
            const activeFrames = state.frames.filter(frame => frame.isActive);
            grid.innerHTML = activeFrames.map(frame => `<div class="frame-card" data-frame-id="${frame.id}" tabindex="0" role="radio"><div class="frame-preview" style="background-image: url('${frame.url}')"></div><div class="frame-name">${frame.name}</div></div>`).join('');
        },
        renderAdminFrames() {
            const grid = getEl('frameManagementGrid'); const template = getEl('adminFrameCardTemplate');
            if(!grid || !template) return;
            grid.innerHTML = '';
            state.frames.forEach(frame => {
                const cardNode = template.content.cloneNode(true);
                const cardElement = cardNode.querySelector('.admin-frame-card');
                const statusDot = cardNode.querySelector('.admin-frame-card__status');
                const activateBtn = cardNode.querySelector('.admin-frame-card__activate-btn');
                cardElement.dataset.frameId = frame.id;
                cardElement.classList.toggle('is-active', frame.isActive);
                statusDot.classList.toggle('is-active', frame.isActive);
                statusDot.title = frame.isActive ? 'Active' : 'Inactive';
                cardNode.querySelector('.admin-frame-card__img').src = frame.url;
                cardNode.querySelector('.admin-frame-card__name').textContent = frame.name;
                if (activateBtn) activateBtn.disabled = frame.isActive;
                grid.appendChild(cardNode);
            });
        },
        updateDynamicUI() {
            document.querySelectorAll('.frame-card').forEach(card => card.classList.toggle('selected', card.dataset.frameId === state.selectedFrameId));
            const canProcess = state.uploadedFile && state.selectedFrameId;
            getEl('downloadBtn').disabled = !canProcess;
            getEl('previewSection').style.display = canProcess ? 'block' : 'none';
            if (canProcess) core.drawCanvas();
        },
        setButtonLoading(btn, textSpan, spinner, isLoading, text = 'Save') { if(textSpan) textSpan.textContent = isLoading ? 'Saving...' : `${text}`; if(spinner) spinner.classList.toggle('u-hidden', !isLoading); if(btn) btn.disabled = isLoading; }
    };

    // --- 5. CORE APPLICATION LOGIC ---
    const core = {
        async init() {
            this.attachEventListeners();
            try {
                state.frames = await api.getFrames();
                ui.renderFrames();
            } catch (error) { ui.renderStatus(getEl('frameStatus'), 'Could not load frames.', 'error'); }
        },
        handleFileUpload(file) {
            if (!file || !file.type.startsWith('image/')) return ui.showToast('Please select a valid image file.', true);
            if (file.size > 10 * 1024 * 1024) return ui.showToast('File size must be under 10MB.', true);
            state.uploadedFile = file;
            const reader = new FileReader();
            reader.onload = e => { getEl('uploadedImage').src = e.target.result; getEl('uploadedImage').style.display = 'block'; ui.showToast('Image uploaded successfully!'); ui.updateDynamicUI(); };
            reader.readAsDataURL(file);
        },
        async drawCanvas() {
            const canvas = getEl('canvas'), overlay = getEl('processingOverlay');
            if (!canvas || !overlay) return;
            overlay.style.display = 'flex';
            try {
                const userImgPromise = new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = getEl('uploadedImage').src; });
                const frameData = state.frames.find(f => f.id === state.selectedFrameId);
                if (!frameData) throw new Error("Frame data not found.");
                const frameImgPromise = new Promise((resolve, reject) => { const img = new Image(); img.crossOrigin = "Anonymous"; img.onload = () => resolve(img); img.onerror = reject; img.src = frameData.url; });
                const [userImg, frameImg] = await Promise.all([userImgPromise, frameImgPromise]);
                const ctx = canvas.getContext('2d');
                canvas.width = frameImg.naturalWidth; canvas.height = frameImg.naturalHeight;
                ctx.drawImage(userImg, 0, 0, canvas.width, canvas.height);
                ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
            } catch (error) { console.error("Canvas Error:", error); ui.showToast('Error applying frame.', true); } 
            finally { overlay.style.display = 'none'; }
        },
        resetApp() { state.uploadedFile = null; state.selectedFrameId = null; getEl('uploadedImage').style.display = 'none'; getEl('fileInput').value = ''; ui.updateDynamicUI(); },
        async handleActivateFrame(frameId) {
            try {
                await api.activateFrame(frameId);
                state.frames = await api.getFrames();
                ui.renderFrames(); ui.renderAdminFrames();
                ui.renderStatus(getEl('adminStatus'), 'Frame activated.', 'success');
            } catch (error) { ui.renderStatus(getEl('adminStatus'), error.message, 'error'); }
        },
        async handleDeleteFrame(frameId) {
            try {
                const { wasActive } = await api.deleteFrame(frameId);
                state.frames = await api.getFrames();
                if (wasActive && state.frames.length > 0) {
                    await this.handleActivateFrame(state.frames[0].id);
                    ui.renderStatus(getEl('adminStatus'), 'Deleted frame & activated a new one.', 'success');
                } else {
                    ui.renderFrames(); ui.renderAdminFrames();
                    ui.renderStatus(getEl('adminStatus'), 'Frame deleted.', 'success');
                }
            } catch (error) { ui.renderStatus(getEl('adminStatus'), error.message, 'error'); }
        },
        attachEventListeners() {
            const uploadZone = getEl('uploadZone');
            if (uploadZone) {
                uploadZone.addEventListener('click', () => getEl('fileInput').click());
                ['dragenter', 'dragover'].forEach(eName => uploadZone.addEventListener(eName, e => {e.preventDefault(); e.stopPropagation(); uploadZone.classList.add('dragover');}));
                ['dragleave', 'drop'].forEach(eName => uploadZone.addEventListener(eName, e => {e.preventDefault(); e.stopPropagation(); uploadZone.classList.remove('dragover');}));
                uploadZone.addEventListener('drop', e => { if (e.dataTransfer.files[0]) this.handleFileUpload(e.dataTransfer.files[0]); });
            }
            getEl('fileInput')?.addEventListener('change', e => { if (e.target.files[0]) this.handleFileUpload(e.target.files[0]); });
            getEl('frameGrid')?.addEventListener('click', e => { const card = e.target.closest('.frame-card'); if (card) { state.selectedFrameId = card.dataset.frameId; ui.updateDynamicUI(); } });
            getEl('downloadBtn')?.addEventListener('click', () => getEl('canvas').toBlob(blob => { const link = document.createElement('a'); link.download = `GoShaPica_${Date.now()}.png`; link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href); }, 'image/png'));
            getEl('resetBtn')?.addEventListener('click', () => this.resetApp());
            getEl('adminAccessBtn')?.addEventListener('click', () => ui.toggleModal('adminModal', true));
            getEl('adminCancelBtn')?.addEventListener('click', () => ui.toggleModal('adminModal', false));
            getEl('adminCloseBtn')?.addEventListener('click', () => ui.toggleModal('adminPanel', false));
            getEl('adminLoginForm')?.addEventListener('submit', async e => { e.preventDefault(); try { await api.login(getEl('adminPasswordInput').value); ui.toggleModal('adminModal', false); ui.toggleModal('adminPanel', true); ui.renderAdminFrames(); } catch (error) { ui.showToast(error.message, true); } finally { getEl('adminPasswordInput').value = ''; } });
            getEl('addFrameForm')?.addEventListener('submit', async e => {
                e.preventDefault();
                const btn = getEl('saveFrameBtn'), text = getEl('saveFrameBtnText'), spinner = getEl('saveFrameSpinner');
                const name = getEl('collectionNameInput').value, files = Array.from(document.querySelectorAll('input[name="frameFiles"]')).map(i => i.files[0]);
                if (files.some(f => !f)) return ui.showToast('Please select all 3 files.', true);
                ui.setButtonLoading(btn, text, spinner, true, 'Save Collection');
                try {
                    const urls = await Promise.all(files.map(file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); })));
                    const newFrames = await api.addFrames(name, urls);
                    await this.handleActivateFrame(newFrames[0].id);
                    e.target.reset();
                } catch (error) { ui.renderStatus(getEl('adminStatus'), error.message, 'error'); } 
                finally { ui.setButtonLoading(btn, text, spinner, false, 'Save Collection'); }
            });
            getEl('frameManagementGrid')?.addEventListener('click', async e => {
                const card = e.target.closest('.admin-frame-card');
                if (!card) return;
                const frameId = card.dataset.frameId, name = card.querySelector('.admin-frame-card__name')?.textContent || 'this';
                if (e.target.closest('.admin-frame-card__activate-btn')) { await this.handleActivateFrame(frameId); }
                if (e.target.closest('.admin-frame-card__delete-btn')) { if (confirm(`Delete "${name}" frame?`)) { card.classList.add('is-deleting'); setTimeout(() => this.handleDeleteFrame(frameId), 300); }}
            });
        }
    };

    // --- 6. INITIALIZATION ---
    core.init();
})();
