/**
 * GoShaPica Application
 * VERSION: 3.0 (Final Polish)
 * A professional, production-ready implementation featuring a modular architecture,
 * mock API, robust error handling, and comprehensive edge-case management.
 */
(function () {
    'use strict';

    // --- 1. STATE MANAGEMENT ---
    const state = { /* ... No changes ... */ };

    // --- 2. MOCK API (Simulating a Secure Backend) ---
    const api = {
        /**
         * Simulates a login request.
         * @param {string} password The password to check.
         * @returns {Promise<string>} Resolves with a mock auth token.
         */
        login(password) { /* ... No changes ... */ },

        /**
         * Simulates fetching frames, now with robust localStorage handling.
         * @returns {Promise<Array<object>>} Resolves with the list of frames.
         */
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
                        if (!framesData) {
                            localStorage.setItem('goshapica_frames', JSON.stringify(frames));
                        }
                        resolve(frames);
                    } catch (e) {
                        console.error("LocalStorage access failed. Using default frames.", e);
                        // Fallback to defaults if localStorage is blocked or corrupted
                        resolve([
                            { id: 'classic-wood', name: 'Classic Wood', url: 'https://i.imgur.com/8x1F5s1.png', isActive: true },
                            { id: 'modern-black', name: 'Modern Black', url: 'https://i.imgur.com/uQ9YQhN.png', isActive: false },
                            { id: 'ornate-gold', name: 'Ornate Gold', url: 'https://i.imgur.com/y1vR3S9.png', isActive: false },
                        ]);
                    }
                }, 300);
            });
        },
        
        /**
         * Simulates adding a collection of new frames.
         * @param {string} collectionName - The name for the new collection.
         * @param {Array<string>} frameDataUrls - Array of base64 data URLs for the new frames.
         * @returns {Promise<Array<object>>} Resolves with the array of newly created frame objects.
         */
        addFrames(collectionName, frameDataUrls) { /* ... No changes ... */ },

        /**
         * Simulates activating a specific frame, which deactivates all others.
         * @param {string} frameIdToActivate - The ID of the frame to make active.
         * @returns {Promise<void>}
         */
        activateFrame(frameIdToActivate) { /* ... No changes ... */ },

        /**
         * Simulates deleting a frame from the database.
         * @param {string} frameId - The ID of the frame to delete.
         * @returns {Promise<{wasActive: boolean}>} Resolves with an object indicating if the deleted frame was the active one.
         */
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
        /* ... All UI functions remain the same as the previous polished version ... */
        /* They are already robust and well-structured. */
    };

    // --- 5. CORE APPLICATION LOGIC ---
    const core = {
        /**
         * Initializes the application, attaches listeners, and loads initial data.
         */
        async init() {
            this.attachEventListeners();
            try {
                state.frames = await api.getFrames();
                ui.renderFrames();
            } catch (error) {
                console.error(error);
                ui.renderStatus(getEl('frameStatus'), 'Could not load frames.', 'error');
            }
        },

        /**
         * Handles user file selection (click or drag-drop).
         * @param {File} file - The image file selected by the user.
         */
        handleFileUpload(file) { /* ... No changes ... */ },

        /**
         * Draws the user's photo and the selected frame onto the canvas.
         */
        async drawCanvas() { /* ... No changes ... */ },

        /**
         * Resets the application to its initial state.
         */
        resetApp() { /* ... No changes ... */ },

        /**
         * Core logic to handle activating a frame and updating all UI.
         * @param {string} frameId - The ID of the frame to activate.
         */
        async handleActivateFrame(frameId) { /* ... No changes ... */ },
        
        /**
         * Core logic to handle deleting a frame and managing edge cases.
         * @param {string} frameId - The ID of the frame to delete.
         */
        async handleDeleteFrame(frameId) {
            try {
                const { wasActive } = await api.deleteFrame(frameId);
                state.frames = await api.getFrames();
                
                // EDGE CASE: If the deleted frame was the active one,
                // and there are still frames left, activate the first one.
                if (wasActive && state.frames.length > 0) {
                    await this.handleActivateFrame(state.frames[0].id);
                    ui.renderStatus(getEl('adminStatus'), 'Deleted frame and activated a new one.', 'success');
                } else {
                    ui.renderFrames();
                    ui.renderAdminFrames();
                    ui.renderStatus(getEl('adminStatus'), 'Frame deleted successfully.', 'success');
                }
            } catch (error) {
                ui.renderStatus(getEl('adminStatus'), error.message, 'error');
            }
        },

        /**
         * Attaches all permanent event listeners for the application.
         */
        attachEventListeners() {
            /* ... All user workflow listeners are correct from the previous version ... */

            // MODIFIED: Admin listener now calls the new core deletion logic
            getEl('frameManagementGrid')?.addEventListener('click', async e => {
                const card = e.target.closest('.admin-frame-card');
                if (!card) return;
                
                const frameId = card.dataset.frameId;
                const frameName = card.querySelector('.admin-frame-card__name')?.textContent || 'this frame';

                // Handle Activate Button
                if (e.target.closest('.admin-frame-card__activate-btn')) {
                    await this.handleActivateFrame(frameId);
                }

                // Handle Delete Button
                if (e.target.closest('.admin-frame-card__delete-btn')) {
                    if (confirm(`Are you sure you want to delete "${frameName}"?`)) {
                        card.classList.add('is-deleting');
                        // Use a short delay to allow the CSS animation to be seen
                        setTimeout(() => this.handleDeleteFrame(frameId), 300);
                    }
                }
            });

             /* ... All other listeners are correct ... */
        }
    };

    // --- 6. INITIALIZATION ---
    core.init();
})();
