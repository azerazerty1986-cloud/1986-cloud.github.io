// ============================================================
// 📦 main.js - نظام الجلب والتوزيع مثل GitHub (النسخة المُصلحة v4.1)
// ============================================================
// التصحيحات الرئيسية:
// • إصلاح SyntaxError في console.log
// • إصلاح Storage.init() - Promise دائماً
// • إصلاح fetchAll - offset=0 لجلب كل الرسائل
// • إصلاح uploadFile - FormData جديد في كل محاولة
// • إصلاح autoSync - arrow function للحفاظ على this
// • إصلاح init sequence - async/await صحيح
// • إضافة diagnostics ورسائل خطأ مفصلة
// • إصلاح التحقق من channel_post vs message
// ============================================================

(function(global) {
    'use strict';

    console.log('🔄 نظام الجلب والتوزيع (GitHub-like v4.1) جاهز!');

    // ============================================================
    // 🔧 0. الأدوات المساعدة (Utilities)
    // ============================================================
    const Utils = {
        uid: () => `${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`,
        deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
        sleep: (ms) => new Promise(r => setTimeout(r, ms)),
        formatDate: (iso) => {
            const d = new Date(iso);
            return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
        },
        formatSize: (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },
        compress: (str) => {
            try { if (global.LZString) return global.LZString.compressToUTF16(str); } catch(e) {}
            return str;
        },
        decompress: (str) => {
            try { if (global.LZString) return global.LZString.decompressFromUTF16(str); } catch(e) {}
            return str;
        },
        encrypt: (text, key = 'gitlike_default_key') => {
            if (!text) return '';
            let result = '';
            for (let i = 0; i < text.length; i++) {
                result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            try { return btoa(result); } catch(e) { return result; }
        },
        decrypt: (encoded, key = 'gitlike_default_key') => {
            if (!encoded) return '';
            let text;
            try { text = atob(encoded); } catch(e) { text = encoded; }
            let result = '';
            for (let i = 0; i < text.length; i++) {
                result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return result;
        },
        hash: async (content) => {
            if (global.crypto && global.crypto.subtle) {
                try {
                    const encoder = new TextEncoder();
                    const data = encoder.encode(content);
                    const hashBuffer = await global.crypto.subtle.digest('SHA-256', data);
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                } catch(e) {}
            }
            let hash = 5381;
            for (let i = 0; i < content.length; i++) {
                hash = ((hash << 5) + hash) + content.charCodeAt(i);
            }
            return 'fb_' + Math.abs(hash).toString(16);
        },
        validatePath: (path) => {
            if (typeof path !== 'string' || path.length === 0) return false;
            if (path.includes('..')) return false;
            if (/[<>:"|?*\\]/.test(path)) return false;
            return true;
        },
        validateContent: (content) => typeof content === 'string'
    };

    // ============================================================
    // 📡 0.1 نظام الأحداث (EventEmitter)
    // ============================================================
    const Events = {
        listeners: {},
        on: function(event, callback) {
            if (!this.listeners[event]) this.listeners[event] = [];
            this.listeners[event].push(callback);
            return () => this.off(event, callback);
        },
        off: function(event, callback) {
            if (!this.listeners[event]) return;
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        },
        emit: function(event, data) {
            if (!this.listeners[event]) return;
            this.listeners[event].forEach(cb => {
                try { cb(data); } catch(e) { console.error('❌ خطأ في معالج الحدث:', e); }
            });
        },
        once: function(event, callback) {
            const wrapper = (data) => { this.off(event, wrapper); callback(data); };
            this.on(event, wrapper);
        }
    };

    // ============================================================
    // 💾 0.2 نظام التخزين المتقدم (Storage Manager) - مُصلح
    // ============================================================
    const Storage = {
        mode: 'localStorage',
        db: null,
        dbName: 'GitLikeDB',
        storeName: 'repo',
        version: 1,
        ready: false,

        init: async function() {
            return new Promise(async (resolve) => {
                if (!global.indexedDB) {
                    console.log('ℹ️ IndexedDB غير متوفر، استخدام localStorage');
                    this.ready = true;
                    resolve();
                    return;
                }
                try {
                    await this.initIndexedDB();
                    this.mode = 'indexedDB';
                    this.ready = true;
                    console.log('✅ IndexedDB متصل');
                } catch(e) {
                    console.warn('⚠️ IndexedDB فشل:', e.message, '- الرجوع إلى localStorage');
                    this.mode = 'localStorage';
                    this.ready = true;
                }
                resolve();
            });
        },

        initIndexedDB: function() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.version);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => { this.db = request.result; resolve(); };
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        db.createObjectStore(this.storeName, { keyPath: 'key' });
                    }
                };
            });
        },

        set: async function(key, value) {
            if (!this.ready) await this.init();
            const data = JSON.stringify(value);
            const compressed = Utils.compress(data);

            if (this.mode === 'indexedDB' && this.db) {
                return new Promise((resolve, reject) => {
                    const tx = this.db.transaction([this.storeName], 'readwrite');
                    const store = tx.objectStore(this.storeName);
                    const request = store.put({ key, value: compressed });
                    request.onsuccess = () => resolve(true);
                    request.onerror = () => reject(request.error);
                });
            } else {
                try {
                    localStorage.setItem(key, compressed);
                    return true;
                } catch(e) {
                    if (e.name === 'QuotaExceededError') {
                        this.cleanup();
                        try {
                            localStorage.setItem(key, compressed);
                            return true;
                        } catch(e2) {
                            throw new Error('مساحة التخزين ممتلئة');
                        }
                    }
                    throw e;
                }
            }
        },

        get: async function(key) {
            if (!this.ready) await this.init();
            let compressed;

            if (this.mode === 'indexedDB' && this.db) {
                compressed = await new Promise((resolve, reject) => {
                    const tx = this.db.transaction([this.storeName], 'readonly');
                    const store = tx.objectStore(this.storeName);
                    const request = store.get(key);
                    request.onsuccess = () => resolve(request.result ? request.result.value : null);
                    request.onerror = () => reject(request.error);
                });
            } else {
                compressed = localStorage.getItem(key);
            }

            if (!compressed) return null;
            try {
                const data = Utils.decompress(compressed);
                return JSON.parse(data);
            } catch(e) {
                try { return JSON.parse(compressed); } catch(e2) { return null; }
            }
        },

        remove: async function(key) {
            if (!this.ready) await this.init();
            if (this.mode === 'indexedDB' && this.db) {
                return new Promise((resolve, reject) => {
                    const tx = this.db.transaction([this.storeName], 'readwrite');
                    const store = tx.objectStore(this.storeName);
                    const request = store.delete(key);
                    request.onsuccess = () => resolve(true);
                    request.onerror = () => reject(request.error);
                });
            } else {
                localStorage.removeItem(key);
                return true;
            }
        },

        cleanup: function() {
            const keys = Object.keys(localStorage);
            const oldBackups = keys.filter(k => k.startsWith('gitlike_backup_'));
            oldBackups.sort().reverse();
            for (let i = 3; i < oldBackups.length; i++) {
                localStorage.removeItem(oldBackups[i]);
            }
        },

        backup: async function(key) {
            const data = await this.get(key);
            if (data) await this.set(`gitlike_backup_${Date.now()}`, data);
        }
    };

    // ============================================================
    // 📁 1. المستودع المحلي (Local Repository)
    // ============================================================
    const Repo = {
        files: {},
        history: [],
        branches: { main: { files: {}, head: null } },
        currentBranch: 'main',
        stashes: [],
        tags: {},

        init: async function() {
            await this.load();
        },

        save: async function() {
            try {
                await Storage.set('gitlike_repo', {
                    files: this.files,
                    history: this.history,
                    branches: this.branches,
                    currentBranch: this.currentBranch,
                    stashes: this.stashes,
                    tags: this.tags,
                    savedAt: new Date().toISOString()
                });
                Events.emit('repo:saved', { stats: this.getStats() });
            } catch(e) {
                console.error('❌ فشل حفظ المستودع:', e);
                Events.emit('repo:error', { action: 'save', error: e.message });
            }
        },

        load: async function() {
            try {
                const data = await Storage.get('gitlike_repo');
                if (data) {
                    this.files = data.files || {};
                    this.history = data.history || [];
                    this.branches = data.branches || { main: { files: {}, head: null } };
                    this.currentBranch = data.currentBranch || 'main';
                    this.stashes = data.stashes || [];
                    this.tags = data.tags || {};
                    Events.emit('repo:loaded', { stats: this.getStats() });
                    return true;
                }
            } catch(e) {
                console.error('❌ فشل تحميل المستودع:', e);
                Events.emit('repo:error', { action: 'load', error: e.message });
            }
            return false;
        },

        getFile: function(path) {
            if (!Utils.validatePath(path)) return null;
            return this.files[path] || null;
        },

        getFiles: function() { return Object.keys(this.files); },

        addFile: async function(path, content, msg = 'إضافة ملف') {
            if (!Utils.validatePath(path)) return { success: false, error: 'مسار غير صالح' };
            if (!Utils.validateContent(content)) return { success: false, error: 'محتوى غير صالح' };

            const hash = await Utils.hash(content);
            const oldContent = this.files[path];
            const oldHash = oldContent ? await Utils.hash(oldContent) : null;

            this.files[path] = content;

            const commit = {
                id: Utils.uid(),
                action: oldContent ? 'update' : 'add',
                path,
                message: msg,
                hash,
                oldHash,
                timestamp: new Date().toISOString(),
                branch: this.currentBranch,
                size: content.length
            };

            this.history.push(commit);
            this.branches[this.currentBranch].head = commit.id;
            await this.save();
            Events.emit('file:added', { path, commit });
            return { success: true, path, commitId: commit.id };
        },

        updateFile: async function(path, content, msg = 'تحديث ملف') {
            if (!Utils.validatePath(path)) return { success: false, error: 'مسار غير صالح' };
            if (!this.files[path]) return { success: false, error: 'الملف غير موجود' };
            if (!Utils.validateContent(content)) return { success: false, error: 'محتوى غير صالح' };

            const hash = await Utils.hash(content);
            const oldHash = await Utils.hash(this.files[path]);
            this.files[path] = content;

            const commit = {
                id: Utils.uid(), action: 'update', path, message: msg,
                hash, oldHash, timestamp: new Date().toISOString(),
                branch: this.currentBranch, size: content.length
            };

            this.history.push(commit);
            this.branches[this.currentBranch].head = commit.id;
            await this.save();
            Events.emit('file:updated', { path, commit });
            return { success: true, path, commitId: commit.id };
        },

        deleteFile: async function(path, msg = 'حذف ملف') {
            if (!Utils.validatePath(path)) return { success: false, error: 'مسار غير صالح' };
            if (!this.files[path]) return { success: false, error: 'الملف غير موجود' };

            const oldHash = await Utils.hash(this.files[path]);
            delete this.files[path];

            const commit = {
                id: Utils.uid(), action: 'delete', path, message: msg,
                hash: null, oldHash, timestamp: new Date().toISOString(),
                branch: this.currentBranch
            };

            this.history.push(commit);
            this.branches[this.currentBranch].head = commit.id;
            await this.save();
            Events.emit('file:deleted', { path, commit });
            return { success: true, path, commitId: commit.id };
        },

        getHistory: function(limit = 20, path = null, branch = null) {
            let history = this.history;
            if (path) history = history.filter(h => h.path === path);
            if (branch) history = history.filter(h => h.branch === branch);
            return history.slice(-limit).reverse();
        },

        getFileHistory: function(path) {
            return this.history.filter(h => h.path === path).reverse();
        },

        getStats: function() {
            let size = 0, lines = 0;
            for (const content of Object.values(this.files)) {
                size += content.length;
                lines += content.split('\n').length;
            }
            return {
                files: Object.keys(this.files).length,
                size: size,
                formattedSize: Utils.formatSize(size),
                lines: lines,
                commits: this.history.length,
                branch: this.currentBranch,
                branches: Object.keys(this.branches).length,
                stashes: this.stashes.length,
                tags: Object.keys(this.tags).length
            };
        },

        branch: async function(name, from = null) {
            if (!name || typeof name !== 'string') return { success: false, error: 'اسم الفرع غير صالح' };
            if (this.branches[name]) return { success: false, error: 'الفرع موجود بالفعل' };

            const sourceBranch = from || this.currentBranch;
            if (!this.branches[sourceBranch]) return { success: false, error: 'الفرع المصدر غير موجود' };

            this.branches[name] = {
                files: Utils.deepClone(this.branches[sourceBranch].files || this.files),
                head: this.branches[sourceBranch].head,
                createdFrom: sourceBranch,
                createdAt: new Date().toISOString()
            };
            await this.save();
            Events.emit('branch:created', { name, from: sourceBranch });
            return { success: true, name };
        },

        checkout: async function(name) {
            if (!this.branches[name]) return { success: false, error: 'الفرع غير موجود' };
            this.branches[this.currentBranch].files = Utils.deepClone(this.files);
            this.files = Utils.deepClone(this.branches[name].files);
            this.currentBranch = name;
            await this.save();
            Events.emit('branch:checkedout', { name });
            return { success: true, name };
        },

        merge: async function(sourceBranch, targetBranch = null, strategy = 'ours') {
            const target = targetBranch || this.currentBranch;
            if (!this.branches[sourceBranch]) return { success: false, error: 'الفرع المصدر غير موجود' };
            if (!this.branches[target]) return { success: false, error: 'الفرع الهدف غير موجود' };

            const conflicts = [], merged = [];
            const sourceFiles = this.branches[sourceBranch].files;
            const targetFiles = this.branches[target].files;

            for (const [path, content] of Object.entries(sourceFiles)) {
                if (targetFiles[path] && targetFiles[path] !== content) {
                    if (strategy === 'ours') {
                        conflicts.push({ path, type: 'conflict', resolution: 'ours' });
                    } else if (strategy === 'theirs') {
                        targetFiles[path] = content;
                        conflicts.push({ path, type: 'conflict', resolution: 'theirs' });
                    } else {
                        conflicts.push({ path, type: 'conflict', resolution: 'pending' });
                    }
                } else {
                    targetFiles[path] = content;
                    merged.push(path);
                }
            }

            if (target === this.currentBranch) this.files = Utils.deepClone(targetFiles);
            await this.save();
            Events.emit('branch:merged', { source: sourceBranch, target, conflicts, merged });
            return { success: true, conflicts, merged, hasConflicts: conflicts.length > 0 };
        },

        stash: async function(msg = 'تخزين مؤقت') {
            const stash = {
                id: Utils.uid(), message: msg,
                files: Utils.deepClone(this.files),
                branch: this.currentBranch,
                timestamp: new Date().toISOString()
            };
            this.stashes.push(stash);
            await this.save();
            Events.emit('repo:stashed', stash);
            return { success: true, stashId: stash.id };
        },

        unstash: async function(stashId) {
            const index = this.stashes.findIndex(s => s.id === stashId);
            if (index === -1) return { success: false, error: 'المخبأة غير موجودة' };
            const stash = this.stashes[index];
            this.files = Utils.deepClone(stash.files);
            this.currentBranch = stash.branch;
            this.stashes.splice(index, 1);
            await this.save();
            Events.emit('repo:unstashed', stash);
            return { success: true };
        },

        tag: async function(name, commitId = null, msg = '') {
            const targetCommit = commitId || (this.history.length > 0 ? this.history[this.history.length - 1].id : null);
            if (!targetCommit) return { success: false, error: 'لا يوجد التزام للوسم' };
            this.tags[name] = { commitId: targetCommit, message: msg, createdAt: new Date().toISOString() };
            await this.save();
            Events.emit('repo:tagged', { name, commitId: targetCommit });
            return { success: true };
        },

        reset: async function(hard = false) {
            if (hard) {
                this.files = {}; this.history = [];
                this.branches = { main: { files: {}, head: null } };
                this.currentBranch = 'main'; this.stashes = []; this.tags = {};
            } else {
                this.files = Utils.deepClone(this.branches[this.currentBranch].files || {});
            }
            await this.save();
            Events.emit('repo:reset', { hard });
            return { success: true };
        },

        export: function() {
            return {
                files: this.files, history: this.history,
                branches: this.branches, currentBranch: this.currentBranch,
                stashes: this.stashes, tags: this.tags,
                exportedAt: new Date().toISOString(), version: '4.1'
            };
        },

        import: async function(data) {
            try {
                const parsed = typeof data === 'string' ? JSON.parse(data) : data;
                await Storage.backup('gitlike_repo');
                this.files = parsed.files || {};
                this.history = parsed.history || [];
                this.branches = parsed.branches || { main: { files: {}, head: null } };
                this.currentBranch = parsed.currentBranch || 'main';
                this.stashes = parsed.stashes || [];
                this.tags = parsed.tags || {};
                await this.save();
                Events.emit('repo:imported', { stats: this.getStats() });
                return { success: true };
            } catch(e) {
                Events.emit('repo:error', { action: 'import', error: e.message });
                return { success: false, error: e.message };
            }
        },

        diff: function(path, commitId1, commitId2 = null) {
            const commits = this.getFileHistory(path);
            if (commits.length < 2) return { success: false, error: 'لا يوجد تاريخ كافٍ' };
            return { success: true, path, note: 'Diff كامل يتطلب تفعيل التخزين الكامل' };
        }
    };

    // ============================================================
    // 📡 2. نظام المزامنة مع القناة - مُصلح بالكامل
    // ============================================================
    const Channel = {
        botToken: '',
        chatId: '',
        lastUpdateId: 0,
        queue: [],
        isProcessing: false,
        rateLimitDelay: 1000,
        maxRetries: 3,
        autoSyncInterval: null,

        init: function() {
            const encryptedToken = localStorage.getItem('telegram_bot_token_enc');
            const encryptedChatId = localStorage.getItem('telegram_chat_id_enc');

            if (encryptedToken) {
                this.botToken = Utils.decrypt(encryptedToken);
            } else {
                this.botToken = localStorage.getItem('telegram_bot_token') || '';
            }

            if (encryptedChatId) {
                this.chatId = Utils.decrypt(encryptedChatId);
            } else {
                this.chatId = localStorage.getItem('telegram_chat_id') || '';
            }

            this.lastUpdateId = parseInt(localStorage.getItem('telegram_last_update_id') || '0');
        },

        hasConfig: function() {
            return this.botToken.length > 10 && this.chatId.length > 0;
        },

        saveConfig: function(token, chatId) {
            this.botToken = token;
            this.chatId = chatId;
            localStorage.setItem('telegram_bot_token_enc', Utils.encrypt(token));
            localStorage.setItem('telegram_chat_id_enc', Utils.encrypt(chatId));
            localStorage.removeItem('telegram_bot_token');
            localStorage.removeItem('telegram_chat_id');
            Events.emit('channel:configUpdated', { hasConfig: this.hasConfig() });
        },

        // مُصلح: إعادة المحاولة مع إنشاء FormData جديد
        fetchWithRetry: async function(url, options = {}, retries = 0) {
            try {
                const resp = await fetch(url, options);
                if (!resp.ok && retries < this.maxRetries) {
                    const delay = Math.pow(2, retries) * 1000;
                    console.log(`⏳ إعادة المحاولة ${retries + 1}/${this.maxRetries} بعد ${delay}ms`);
                    await Utils.sleep(delay);
                    return this.fetchWithRetry(url, options, retries + 1);
                }
                return resp;
            } catch(e) {
                if (retries < this.maxRetries) {
                    const delay = Math.pow(2, retries) * 1000;
                    await Utils.sleep(delay);
                    return this.fetchWithRetry(url, options, retries + 1);
                }
                throw e;
            }
        },

        // مُصلح: uploadFile مع طابور صحيح
        uploadFile: async function(path, content, priority = false) {
            if (!this.hasConfig()) return { success: false, error: 'إعدادات التلجرام غير مكتملة' };
            if (!Utils.validatePath(path)) return { success: false, error: 'مسار غير صالح' };

            return new Promise((resolve) => {
                const task = {
                    id: Utils.uid(), type: 'upload', path, content,
                    resolve, retries: 0, timestamp: Date.now()
                };
                if (priority) this.queue.unshift(task);
                else this.queue.push(task);
                this.processQueue();
            });
        },

        processQueue: async function() {
            if (this.isProcessing || this.queue.length === 0) return;
            this.isProcessing = true;

            while (this.queue.length > 0) {
                const task = this.queue[0];
                try {
                    if (task.type === 'upload') {
                        const result = await this._doUpload(task.path, task.content);
                        task.resolve(result);
                    }
                    this.queue.shift();
                    await Utils.sleep(this.rateLimitDelay);
                } catch(e) {
                    console.error('❌ خطأ في معالجة المهمة:', e);
                    task.retries++;
                    if (task.retries >= this.maxRetries) {
                        task.resolve({ success: false, error: e.message, path: task.path });
                        this.queue.shift();
                    } else {
                        await Utils.sleep(Math.pow(2, task.retries) * 1000);
                    }
                }
            }

            this.isProcessing = false;
            Events.emit('channel:queueEmpty', {});
        },

        _doUpload: async function(path, content) {
            const name = `tile_${path.replace(/\//g, '_')}`;
            const blob = new Blob([content], { type: 'text/plain' });
            const file = new File([blob], name);
            const form = new FormData();
            form.append('chat_id', this.chatId);
            form.append('document', file);

            const resp = await this.fetchWithRetry(
                `https://api.telegram.org/bot${this.botToken}/sendDocument`,
                { method: 'POST', body: form }
            );

            const data = await resp.json();
            if (data.ok) {
                Events.emit('channel:uploaded', { path, name });
                return { success: true, messageId: data.result.message_id };
            }
            return { success: false, error: data.description };
        },

        // مُصلح: fetchAll مع offset=0 لجلب كل الرسائل
        fetchAll: async function(options = {}) {
            if (!this.hasConfig()) return { success: false, error: 'إعدادات التلجرام غير مكتملة' };

            const limit = options.limit || 100;
            // ✅ مُصلح: استخدام offset=0 لجلب كل الرسائل من البداية
            // أو استخدام offset محدد إذا أراد المستخدم الاستمرار
            const offset = options.offset !== undefined ? options.offset : 0;
            const filterPrefix = options.filterPrefix || 'tile_';

            try {
                console.log(`🔍 جلب الرسائل من Telegram (offset=${offset}, limit=${limit})...`);

                const resp = await this.fetchWithRetry(
                    `https://api.telegram.org/bot${this.botToken}/getUpdates?limit=${limit}&offset=${offset}`
                );
                const data = await resp.json();

                if (!data.ok) {
                    console.error('❌ Telegram API error:', data.description);
                    return { success: false, error: data.description };
                }

                console.log(`📨 تم استلام ${data.result.length} تحديث من Telegram`);

                const files = [];
                let maxUpdateId = this.lastUpdateId;

                for (const update of data.result) {
                    if (update.update_id > maxUpdateId) maxUpdateId = update.update_id;

                    // ✅ مُصلح: التحقق من channel_post أولاً ثم message
                    const msg = update.channel_post || update.message || update.edited_channel_post || update.edited_message;

                    if (!msg) {
                        console.log(`⚠️ تحديث ${update.update_id} لا يحتوي على رسالة`);
                        continue;
                    }

                    if (!msg.document) {
                        console.log(`⚠️ رسالة ${msg.message_id} لا تحتوي على مستند`);
                        continue;
                    }

                    const name = msg.document.file_name || '';
                    console.log(`📄 ملف موجود: ${name}`);

                    if (filterPrefix && !name.startsWith(filterPrefix)) {
                        console.log(`⏭️ تخطي ${name} (لا يبدأ بـ ${filterPrefix})`);
                        continue;
                    }

                    try {
                        const fileResp = await this.fetchWithRetry(
                            `https://api.telegram.org/bot${this.botToken}/getFile?file_id=${msg.document.file_id}`
                        );
                        const fileData = await fileResp.json();

                        if (!fileData.ok) {
                            console.warn(`⚠️ فشل الحصول على معلومات الملف ${name}:`, fileData.description);
                            continue;
                        }

                        const url = `https://api.telegram.org/file/bot${this.botToken}/${fileData.result.file_path}`;
                        console.log(`⬇️ جلب محتوى الملف من: ${url}`);

                        const contentResp = await this.fetchWithRetry(url);
                        const content = await contentResp.text();

                        files.push({
                            name: name,
                            content: content,
                            file_id: msg.document.file_id,
                            message_id: msg.message_id,
                            timestamp: msg.date ? msg.date * 1000 : Date.now(),
                            update_id: update.update_id
                        });

                        console.log(`✅ تم جلب ${name} (${content.length} حرف)`);
                    } catch(fileError) {
                        console.error(`❌ خطأ في جلب ملف ${name}:`, fileError.message);
                    }
                }

                // ✅ مُصلح: تحديث lastUpdateId فقط إذا وجدنا رسائل جديدة
                if (maxUpdateId > this.lastUpdateId) {
                    this.lastUpdateId = maxUpdateId;
                    localStorage.setItem('telegram_last_update_id', maxUpdateId.toString());
                    console.log(`📝 تحديث lastUpdateId إلى: ${maxUpdateId}`);
                }

                Events.emit('channel:fetched', { count: files.length, totalUpdates: data.result.length });
                return { success: true, files, hasMore: data.result.length === limit, totalUpdates: data.result.length };

            } catch(e) {
                console.error('❌ فشل جلب الملفات:', e);
                return { success: false, error: e.message };
            }
        },

        // مُصلح: syncAll مع جلب كل الصفحات ومعالجة أفضل للأخطاء
        syncAll: async function(options = {}) {
            if (!this.hasConfig()) {
                const err = '⚠️ لا توجد إعدادات تلجرام. استخدم: TileServer.channel.saveConfig(token, chatId)';
                console.error(err);
                return { success: false, error: err };
            }

            Events.emit('sync:started', {});
            console.log('🚀 بدء المزامنة الكاملة...');

            try {
                let allFiles = [];
                let hasMore = true;
                let page = 0;
                const maxPages = options.maxPages || 10;
                let currentOffset = 0;

                // ✅ مُصلح: جلب كل الصفحات حتى نفاد النتائج
                while (hasMore && page < maxPages) {
                    console.log(`📄 جلب الصفحة ${page + 1} (offset=${currentOffset})...`);
                    const result = await this.fetchAll({ limit: 100, offset: currentOffset });

                    if (!result.success) {
                        console.error('❌ فشل جلب الصفحة:', result.error);
                        return result;
                    }

                    allFiles = allFiles.concat(result.files);
                    hasMore = result.hasMore;

                    if (result.totalUpdates > 0) {
                        currentOffset = result.files.length > 0 
                            ? result.files[result.files.length - 1].update_id + 1 
                            : currentOffset + 100;
                    } else {
                        hasMore = false;
                    }

                    page++;

                    if (hasMore) {
                        console.log(`⏳ انتظار قبل الصفحة التالية...`);
                        await Utils.sleep(500);
                    }
                }

                console.log(`📦 إجمالي الملفات المُجلَبة: ${allFiles.length}`);

                if (allFiles.length === 0) {
                    const msg = '⚠️ لم يتم العثور على ملفات tile_ في القناة. تأكد من:';
                    console.warn(msg);
                    console.warn('   1. أن البوت عضو في القناة');
                    console.warn('   2. أن هناك ملفات مرفوعة بتنسيق tile_');
                    console.warn('   3. أن القناة ليست خاصة (Private) أو أن البوت لديه صلاحيات');
                    return { success: true, synced: 0, skipped: 0, savedToRepo: 0, total: 0, warning: msg };
                }

                let count = 0;
                let skipped = 0;
                let savedToRepo = 0;
                let conflicts = 0;

                for (const file of allFiles) {
                    const match = file.name.match(/tile_(\d+)_(\d+)_(.+)/);

                    if (!match) {
                        const path = file.name.replace('tile_', '').replace(/_/g, '/');
                        const existing = Repo.getFile(path);

                        if (existing && existing !== file.content) {
                            if (options.conflictStrategy === 'remote') {
                                await Repo.updateFile(path, file.content, `مزامنة من القناة: ${file.name}`);
                            } else if (options.conflictStrategy === 'local') {
                                skipped++;
                                continue;
                            } else {
                                conflicts++;
                                Events.emit('sync:conflict', { path, remoteContent: file.content });
                                continue;
                            }
                        } else {
                            await Repo.addFile(path, file.content, `جلب من القناة: ${file.name}`);
                        }
                        savedToRepo++;
                        continue;
                    }

                    const row = parseInt(match[1]);
                    const col = parseInt(match[2]);
                    const tileId = `${row}_${col}`;
                    const fileName = match[3];

                    // ✅ مُصلح: التحقق من ServerManager بشكل آمن
                    const sm = global.ServerManager || (typeof window !== 'undefined' ? window.ServerManager : null);

                    if (!sm || !sm.tiles) {
                        const path = `${tileId}/${fileName}`;
                        await Repo.addFile(path, file.content, `جلب من القناة: ${file.name}`);
                        savedToRepo++;
                        console.log(`📁 حفظ في المستودع: ${path}`);
                        continue;
                    }

                    if (!sm.tiles[tileId]) {
                        sm.tiles[tileId] = {
                            id: tileId, row: row, col: col,
                            files: {}, created: Date.now()
                        };
                    }

                    const tile = sm.tiles[tileId];
                    const existingFiles = tile.files || {};

                    if (Object.keys(existingFiles).length > 0 && !options.force) {
                        console.log(`⚠️ المربع (${row},${col}) مملؤ بالفعل (${Object.keys(existingFiles).length} ملفات)`);
                        if (typeof global.showToast === 'function') {
                            global.showToast(`⚠️ المربع (${row},${col}) مملؤ بالفعل!`, 'warning');
                        }
                        skipped++;
                        continue;
                    }

                    tile.files[fileName] = file.content;
                    count++;
                    console.log(`✅ تم حفظ ${fileName} في المربع (${row},${col})`);

                    if (typeof global.showToast === 'function') {
                        global.showToast(`✅ تم حفظ ${fileName} في (${row},${col})`, 'success');
                    }

                    if (sm.renderGrid) {
                        sm.renderGrid();
                        sm.updateStats();
                    }
                }

                const message = `✅ تم مزامنة ${count} ملف إلى المربعات` +
                    (skipped > 0 ? ` (تخطي ${skipped} مربع مملؤ)` : '') +
                    (savedToRepo > 0 ? ` + ${savedToRepo} ملف في المستودع` : '') +
                    (conflicts > 0 ? ` (${conflicts} تعارض)` : '');

                console.log(message);

                if (typeof global.showToast === 'function') {
                    global.showToast(message, 'success');
                }

                const result = {
                    success: true, synced: count, skipped: skipped,
                    savedToRepo: savedToRepo, conflicts: conflicts, total: allFiles.length
                };

                Events.emit('sync:completed', result);
                return result;

            } catch(e) {
                console.error('❌ فشل المزامنة:', e);
                Events.emit('sync:error', { error: e.message });
                return { success: false, error: e.message };
            }
        },

        pushAll: async function(options = {}) {
            if (!this.hasConfig()) return { success: false, error: 'إعدادات التلجرام غير مكتملة' };

            Events.emit('push:started', {});
            const paths = Repo.getFiles();
            let uploaded = 0, failed = 0;

            for (const path of paths) {
                const content = Repo.getFile(path);
                const result = await this.uploadFile(path, content);
                if (result.success) {
                    uploaded++;
                    console.log(`📤 رفع ${path} إلى القناة`);
                } else {
                    failed++;
                    console.error(`❌ فشل رفع ${path}:`, result.error);
                }
            }

            const result = { success: true, uploaded, failed, total: paths.length };
            Events.emit('push:completed', result);
            console.log(`📤 تم رفع ${uploaded} ملف إلى القناة`);
            return result;
        },

        deleteMessage: async function(messageId) {
            if (!this.hasConfig()) return { success: false, error: 'إعدادات غير مكتملة' };
            try {
                const resp = await this.fetchWithRetry(
                    `https://api.telegram.org/bot${this.botToken}/deleteMessage`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: this.chatId, message_id: messageId })
                    }
                );
                const data = await resp.json();
                return data.ok ? { success: true } : { success: false, error: data.description };
            } catch(e) {
                return { success: false, error: e.message };
            }
        },

        // مُصلح: autoSync مع arrow function للحفاظ على this
        setAutoSync: function(enabled, intervalMs = 300000) {
            if (this.autoSyncInterval) {
                clearInterval(this.autoSyncInterval);
                this.autoSyncInterval = null;
            }

            if (enabled) {
                // ✅ مُصلح: استخدام arrow function للحفاظ على سياق this
                this.autoSyncInterval = setInterval(async () => {
                    console.log('🔄 مزامنة تلقائية مع القناة...');
                    try {
                        const result = await this.syncAll({ conflictStrategy: 'remote' });
                        if (result.success) {
                            console.log('✅ المزامنة التلقائية ناجحة:', result);
                        } else {
                            console.warn('⚠️ المزامنة التلقائية:', result.error);
                        }
                    } catch(e) {
                        console.error('❌ خطأ في المزامنة التلقائية:', e);
                    }
                }, intervalMs);
                console.log(`⏰ المزامنة التلقائية مفعلة كل ${intervalMs / 1000} ثانية`);
            } else {
                console.log('⏰ المزامنة التلقائية معطلة');
            }
        },

        // ✅ جديد: Diagnostics لفحص الاتصال
        diagnostics: async function() {
            const results = {
                hasConfig: this.hasConfig(),
                botTokenLength: this.botToken.length,
                chatId: this.chatId,
                tests: []
            };

            if (!this.hasConfig()) {
                results.tests.push({ name: 'Config', status: '❌', error: 'إعدادات غير مكتملة' });
                return results;
            }

            // اختبار getMe
            try {
                const resp = await fetch(`https://api.telegram.org/bot${this.botToken}/getMe`);
                const data = await resp.json();
                if (data.ok) {
                    results.tests.push({ name: 'getMe', status: '✅', bot: data.result.username });
                } else {
                    results.tests.push({ name: 'getMe', status: '❌', error: data.description });
                }
            } catch(e) {
                results.tests.push({ name: 'getMe', status: '❌', error: e.message });
            }

            // اختبار getUpdates
            try {
                const resp = await fetch(`https://api.telegram.org/bot${this.botToken}/getUpdates?limit=1`);
                const data = await resp.json();
                if (data.ok) {
                    results.tests.push({ name: 'getUpdates', status: '✅', count: data.result.length });
                } else {
                    results.tests.push({ name: 'getUpdates', status: '❌', error: data.description });
                }
            } catch(e) {
                results.tests.push({ name: 'getUpdates', status: '❌', error: e.message });
            }

            return results;
        }
    };

    // ============================================================
    // 🧩 3. الخادم الرئيسي (TileServer) - واجهة موحدة
    // ============================================================
    const TileServer = {
        info: function() {
            const stats = Repo.getStats();
            return {
                name: 'نظام الجلب والتوزيع (GitHub-like)',
                version: '4.1.0',
                status: 'نشط',
                files: stats.files,
                commits: stats.commits,
                branches: stats.branches,
                currentBranch: stats.branch,
                storage: Storage.mode,
                channel: Channel.hasConfig() ? '🟢 متصلة' : '🔴 غير متصلة',
                uptime: Math.floor((Date.now() - (global._startTime || Date.now())) / 1000) + ' ثانية'
            };
        },

        ping: function() {
            return { status: 'online', timestamp: Date.now() };
        },

        repo: {
            add: Repo.addFile.bind(Repo),
            update: Repo.updateFile.bind(Repo),
            delete: Repo.deleteFile.bind(Repo),
            get: Repo.getFile.bind(Repo),
            list: Repo.getFiles.bind(Repo),
            history: Repo.getHistory.bind(Repo),
            fileHistory: Repo.getFileHistory.bind(Repo),
            stats: Repo.getStats.bind(Repo),
            branch: Repo.branch.bind(Repo),
            checkout: Repo.checkout.bind(Repo),
            merge: Repo.merge.bind(Repo),
            stash: Repo.stash.bind(Repo),
            unstash: Repo.unstash.bind(Repo),
            tag: Repo.tag.bind(Repo),
            reset: Repo.reset.bind(Repo),
            export: Repo.export.bind(Repo),
            import: Repo.import.bind(Repo),
            diff: Repo.diff.bind(Repo),
            revert: Repo.revertFile.bind(Repo)
        },

        channel: {
            sync: Channel.syncAll.bind(Channel),
            push: Channel.pushAll.bind(Channel),
            upload: Channel.uploadFile.bind(Channel),
            fetch: Channel.fetchAll.bind(Channel),
            deleteMessage: Channel.deleteMessage.bind(Channel),
            setAutoSync: Channel.setAutoSync.bind(Channel),
            saveConfig: Channel.saveConfig.bind(Channel),
            hasConfig: Channel.hasConfig.bind(Channel),
            diagnostics: Channel.diagnostics.bind(Channel)
        },

        syncAll: Channel.syncAll.bind(Channel),
        pushAll: Channel.pushAll.bind(Channel),

        events: {
            on: Events.on.bind(Events),
            off: Events.off.bind(Events),
            emit: Events.emit.bind(Events),
            once: Events.once.bind(Events)
        },

        getData: function() {
            return {
                files: Repo.getFiles(),
                stats: Repo.getStats(),
                history: Repo.getHistory(10),
                branches: Object.keys(Repo.branches),
                currentBranch: Repo.currentBranch,
                tags: Object.keys(Repo.tags),
                stashes: Repo.stashes.length
            };
        },

        test: async function() {
            const tests = [];

            try {
                const testPath = '__test__' + Date.now();
                await Repo.addFile(testPath, 'test content', 'اختبار');
                const content = Repo.getFile(testPath);
                await Repo.deleteFile(testPath, 'حذف اختبار');
                tests.push({ name: 'Repo', status: content === 'test content' ? '✅' : '❌' });
            } catch(e) {
                tests.push({ name: 'Repo', status: '❌', error: e.message });
            }

            try {
                await Storage.set('__test__', { test: true });
                const data = await Storage.get('__test__');
                await Storage.remove('__test__');
                tests.push({ name: 'Storage', status: data && data.test ? '✅' : '❌' });
            } catch(e) {
                tests.push({ name: 'Storage', status: '❌', error: e.message });
            }

            try {
                const secret = 'test_secret';
                const encrypted = Utils.encrypt(secret);
                const decrypted = Utils.decrypt(encrypted);
                tests.push({ name: 'Crypto', status: decrypted === secret ? '✅' : '❌' });
            } catch(e) {
                tests.push({ name: 'Crypto', status: '❌', error: e.message });
            }

            try {
                const hash1 = await Utils.hash('test');
                const hash2 = await Utils.hash('test');
                tests.push({ name: 'Hash', status: hash1 === hash2 ? '✅' : '❌' });
            } catch(e) {
                tests.push({ name: 'Hash', status: '❌', error: e.message });
            }

            return {
                success: tests.every(t => t.status === '✅'),
                message: 'الخادم يعمل بشكل طبيعي',
                timestamp: new Date().toISOString(),
                tests,
                repo: Repo.getStats(),
                channel: Channel.hasConfig() ? 'متصل' : 'غير متصل'
            };
        },

        reload: async function() {
            await Repo.load();
            Channel.init();
            return { success: true };
        },

        reset: async function(hard = true) {
            await Repo.reset(hard);
            return { success: true };
        },

        backup: async function() {
            await Storage.backup('gitlike_repo');
            return { success: true, message: 'تم إنشاء نسخة احتياطية' };
        },

        clearCache: async function() {
            try {
                const keys = Object.keys(localStorage);
                for (const key of keys) {
                    if (key.startsWith('gitlike_backup_')) localStorage.removeItem(key);
                }
                return { success: true, message: 'تم مسح الذاكرة المؤقتة' };
            } catch(e) {
                return { success: false, error: e.message };
            }
        }
    };

    // ============================================================
    // 📌 التسجيل والتهيئة - مُصلحة
    // ============================================================

    global._startTime = Date.now();

    // ✅ مُصلح: تهيئة متسلسلة صحيحة
    async function initialize() {
        try {
            // 1. تهيئة التخزين
            await Storage.init();

            // 2. تحميل المستودع
            await Repo.init();

            // 3. تهيئة القناة
            Channel.init();

            // 4. تسجيل الخادم
            global.servers = global.servers || {};
            global.servers['5_3'] = TileServer;

            // 5. رسائل البداية
            const stats = Repo.getStats();
            console.log(`✅ نظام الجلب والتوزيع (5_3) v4.1 جاهز!`);
            console.log(`💾 وضع التخزين: ${Storage.mode}`);
            console.log(`📁 الملفات في المستودع: ${stats.files}`);
            console.log(`📝 الالتزامات: ${stats.commits}`);
            console.log(`🌿 الفروع: ${stats.branches} (الحالي: ${stats.branch})`);
            console.log(`🏷️ الوسوم: ${stats.tags}`);
            console.log(`📦 المخبأات: ${stats.stashes}`);
            console.log(`📡 القناة: ${Channel.hasConfig() ? '🟢 متصلة' : '🔴 غير متصلة'}`);

            if (!Channel.hasConfig()) {
                console.log('');
                console.log('⚠️ لتفعيل الاتصال بالقناة، نفذ:');
                console.log('  TileServer.channel.saveConfig("YOUR_BOT_TOKEN", "YOUR_CHAT_ID")');
            }

            console.log('');
            console.log('📌 الأوامر المتاحة:');
            console.log('  TileServer.syncAll()              - جلب الملفات من القناة');
            console.log('  TileServer.pushAll()              - رفع الملفات إلى القناة');
            console.log('  TileServer.channel.diagnostics()  - فحص الاتصال بالتلجرام');
            console.log('  TileServer.channel.saveConfig()   - حفظ إعدادات التلجرام');
            console.log('  TileServer.repo.list()            - قائمة الملفات');
            console.log('  TileServer.test()                 - اختبار شامل');
            console.log('  TileServer.info()                 - معلومات النظام');
            console.log('');

            Events.emit('server:ready', { server: '5_3', version: '4.1.0' });

        } catch(e) {
            console.error('❌ فشل تهيئة النظام:', e);
        }
    }

    // تشغيل التهيئة
    initialize();

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

