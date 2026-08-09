// ============================================================
// 📦 main.js - نظام الجلب والتوزيع (GitHub-like v4.7)
// ============================================================
// • وضع جلب يدوي (تجاوز CORS): لصق JSON من Telegram API
// • XMLHttpRequest كبديل لـ fetch
// • تسجيل مفصل لكل خطوة
// • كشف تلقائي للإعدادات المعكوسة
// ============================================================

(function(global) {
    'use strict';

    // ============================================================
    // 🔧 اكتشاف المربع
    // ============================================================
    let TILE_ID = '5_3';
    if (global.__currentTileId) TILE_ID = global.__currentTileId;
    else if (global.ServerManager && global.ServerManager.currentTile) TILE_ID = global.ServerManager.currentTile;
    else if (global.ServerManager && global.ServerManager.tiles) {
        for (const [id, tile] of Object.entries(global.ServerManager.tiles)) {
            if (tile && tile.files && tile.files['main.js']) { TILE_ID = id; break; }
        }
    }
    const [TILE_ROW, TILE_COL] = TILE_ID.split('_').map(Number);

    console.log(`🔄 [${TILE_ID}] نظام الجلب والتوزيع v4.7 يُحمّل...`);

    // ============================================================
    // 🔧 Utilities
    // ============================================================
    const Utils = {
        uid: () => `${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`,
        deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
        sleep: (ms) => new Promise(r => setTimeout(r, ms)),
        formatSize: (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    // 📡 EventEmitter
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
                try { cb(data); } catch(e) {}
            });
        }
    };

    // ============================================================
    // 💾 Storage
    // ============================================================
    const Storage = {
        get: function(key) {
            try {
                const raw = localStorage.getItem(key);
                if (!raw) return null;
                return JSON.parse(raw);
            } catch(e) { return null; }
        },
        set: function(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch(e) { return false; }
        }
    };

    // ============================================================
    // 📁 Repo
    // ============================================================
    const Repo = {
        files: {},
        history: [],
        branches: { main: { files: {}, head: null } },
        currentBranch: 'main',

        load: function() {
            const data = Storage.get('gitlike_repo_' + TILE_ID);
            if (data) {
                this.files = data.files || {};
                this.history = data.history || [];
                this.branches = data.branches || { main: { files: {}, head: null } };
                this.currentBranch = data.currentBranch || 'main';
            }
        },

        save: function() {
            Storage.set('gitlike_repo_' + TILE_ID, {
                files: this.files, history: this.history,
                branches: this.branches, currentBranch: this.currentBranch,
                savedAt: new Date().toISOString()
            });
        },

        getFile: function(path) {
            if (!Utils.validatePath(path)) return null;
            return this.files[path] || null;
        },

        getFiles: function() { return Object.keys(this.files); },

        addFile: async function(path, content, msg) {
            if (!Utils.validatePath(path) || !Utils.validateContent(content)) {
                return { success: false, error: 'مدخلات غير صالحة' };
            }
            const hash = await Utils.hash(content);
            const isUpdate = !!this.files[path];
            this.files[path] = content;
            this.history.push({
                id: Utils.uid(), action: isUpdate ? 'update' : 'add',
                path, message: msg || (isUpdate ? 'تحديث' : 'إضافة'),
                hash, timestamp: new Date().toISOString(),
                branch: this.currentBranch, size: content.length
            });
            this.branches[this.currentBranch].head = this.history[this.history.length - 1].id;
            this.save();
            return { success: true, path };
        },

        deleteFile: async function(path, msg) {
            if (!Utils.validatePath(path) || !this.files[path]) {
                return { success: false, error: 'الملف غير موجود' };
            }
            delete this.files[path];
            this.history.push({
                id: Utils.uid(), action: 'delete', path,
                message: msg || 'حذف ملف',
                timestamp: new Date().toISOString(),
                branch: this.currentBranch
            });
            this.save();
            return { success: true, path };
        },

        getHistory: function(limit) {
            return this.history.slice(-(limit || 20)).reverse();
        },

        getStats: function() {
            let size = 0;
            for (const c of Object.values(this.files)) size += c.length;
            return {
                files: Object.keys(this.files).length,
                size: size,
                formattedSize: Utils.formatSize(size),
                commits: this.history.length,
                branch: this.currentBranch,
                branches: Object.keys(this.branches).length
            };
        },

        reset: function(hard) {
            if (hard) {
                this.files = {}; this.history = [];
                this.branches = { main: { files: {}, head: null } };
                this.currentBranch = 'main';
            } else {
                this.files = Utils.deepClone(this.branches[this.currentBranch].files || {});
            }
            this.save();
            return { success: true };
        },

        export: function() {
            return {
                files: this.files, history: this.history,
                branches: this.branches, currentBranch: this.currentBranch,
                exportedAt: new Date().toISOString(), version: '4.7'
            };
        },

        import: function(data) {
            try {
                const parsed = typeof data === 'string' ? JSON.parse(data) : data;
                this.files = parsed.files || {};
                this.history = parsed.history || [];
                this.branches = parsed.branches || { main: { files: {}, head: null } };
                this.currentBranch = parsed.currentBranch || 'main';
                this.save();
                return { success: true };
            } catch(e) {
                return { success: false, error: e.message };
            }
        }
    };

    // ============================================================
    // 📡 Channel - مُصلح مع دعم الجلب اليدوي
    // ============================================================
    const Channel = {
        botToken: '',
        chatId: '',
        lastUpdateId: 0,
        manualMode: false, // وضع الجلب اليدوي

        init: function() {
            const encToken = localStorage.getItem('telegram_bot_token_enc');
            const encChatId = localStorage.getItem('telegram_chat_id_enc');
            this.botToken = encToken ? Utils.decrypt(encToken) : (localStorage.getItem('telegram_bot_token') || '');
            this.chatId = encChatId ? Utils.decrypt(encChatId) : (localStorage.getItem('telegram_chat_id') || '');
            this.lastUpdateId = parseInt(localStorage.getItem('telegram_last_update_id') || '0');
        },

        hasConfig: function() {
            return this.botToken.length > 10 && this.chatId.length > 0;
        },

        fixConfig: function() {
            let token = this.botToken;
            let chatId = this.chatId;
            let fixed = false;

            if (token.startsWith('-100') || token.startsWith('-')) {
                console.log(`[${TILE_ID}] ⚠️ اكتشاف: التوكن والـ Chat ID معكوسان!`);
                const temp = token; token = chatId; chatId = temp; fixed = true;
            }
            if (chatId.includes(':')) {
                console.log(`[${TILE_ID}] ⚠️ اكتشاف: Chat ID يحتوي على ':' - معكوس!`);
                const temp = chatId; chatId = token; token = temp; fixed = true;
            }
            if (!token.includes(':')) {
                return { success: false, error: 'Bot Token غير صالح (يجب أن يحتوي على ":")' };
            }
            if (fixed) {
                this.botToken = token; this.chatId = chatId;
                this.saveConfig(token, chatId);
                console.log(`[${TILE_ID}] ✅ تم إصلاح الإعدادات`);
            }
            return { success: true, fixed };
        },

        saveConfig: function(token, chatId) {
            this.botToken = token; this.chatId = chatId;
            localStorage.setItem('telegram_bot_token_enc', Utils.encrypt(token));
            localStorage.setItem('telegram_chat_id_enc', Utils.encrypt(chatId));
            localStorage.removeItem('telegram_bot_token');
            localStorage.removeItem('telegram_chat_id');
        },

        // ✅ XMLHttpRequest كبديل لـ fetch
        xhrFetch: function(url, method, data) {
            return new Promise((resolve) => {
                try {
                    const xhr = new XMLHttpRequest();
                    xhr.open(method || 'GET', url, true);
                    xhr.onload = function() {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            resolve({ success: true, text: xhr.responseText, status: xhr.status });
                        } else {
                            resolve({ success: false, error: `HTTP ${xhr.status}: ${xhr.statusText}` });
                        }
                    };
                    xhr.onerror = function() {
                        resolve({ success: false, error: 'XMLHttpRequest failed (CORS?)' });
                    };
                    xhr.ontimeout = function() {
                        resolve({ success: false, error: 'Request timeout' });
                    };
                    xhr.timeout = 30000;
                    if (data) {
                        xhr.send(data);
                    } else {
                        xhr.send();
                    }
                } catch(e) {
                    resolve({ success: false, error: e.message });
                }
            });
        },

        // ✅ محاولة fetch ثم XMLHttpRequest
        safeFetch: async function(url, options) {
            // محاولة 1: fetch
            try {
                const resp = await fetch(url, options);
                const text = await resp.text();
                return { success: true, text: text, status: resp.status };
            } catch(e) {
                console.log(`[${TILE_ID}] ⚠️ fetch فشل: ${e.message}, محاولة XMLHttpRequest...`);
            }

            // محاولة 2: XMLHttpRequest
            const xhrResult = await this.xhrFetch(url, options && options.method, options && options.body);
            if (xhrResult.success) {
                return { success: true, text: xhrResult.text, status: xhrResult.status };
            }

            return { success: false, error: xhrResult.error };
        },

        // ✅ جلب الرسائل (تلقائي)
        fetchAll: async function(options) {
            if (!this.hasConfig()) {
                console.error(`[${TILE_ID}] ❌ إعدادات التلجرام غير مكتملة`);
                return { success: false, error: 'إعدادات غير مكتملة' };
            }

            const fix = this.fixConfig();
            if (!fix.success) return fix;

            const limit = options && options.limit ? options.limit : 100;
            const offset = (options && options.offset !== undefined) ? options.offset : -1;
            const url = `https://api.telegram.org/bot${this.botToken}/getUpdates?limit=${limit}&offset=${offset}`;

            console.log(`[${TILE_ID}] 🔍 جلب الرسائل...`);
            console.log(`[${TILE_ID}] 🌐 URL: ${url.replace(this.botToken, 'BOT_TOKEN_HIDDEN')}`);

            const result = await this.safeFetch(url);
            if (!result.success) {
                console.error(`[${TILE_ID}] ❌ فشل الاتصال:`, result.error);
                return { 
                    success: false, 
                    error: result.error,
                    manualHelp: `⚠️ جرب الوضع اليدوي:\n1. افتح في متصفح:\nhttps://api.telegram.org/bot${this.botToken}/getUpdates?limit=100\n2. انسخ النتيجة JSON\n3. استخدم: TileServer.channel.syncManual(jsonText)`
                };
            }

            try {
                const data = JSON.parse(result.text);
                console.log(`[${TILE_ID}] 📨 Telegram رد: ok=${data.ok}, updates=${data.result ? data.result.length : 0}`);

                if (!data.ok) {
                    return { success: false, error: data.description };
                }

                return await this.processUpdates(data.result);
            } catch(e) {
                return { success: false, error: 'JSON parse error: ' + e.message };
            }
        },

        // ✅ معالجة updates (مشترك بين التلقائي واليدوي)
        processUpdates: async function(updates) {
            if (!updates || updates.length === 0) {
                return { success: true, files: [], totalUpdates: 0, warning: 'لا توجد رسائل' };
            }

            const files = [];
            let docsFound = 0;
            let msgsFound = 0;

            for (const update of updates) {
                const msg = update.channel_post || update.message || update.edited_channel_post || update.edited_message;
                if (!msg) continue;
                msgsFound++;

                // جلب المستندات
                if (msg.document) {
                    docsFound++;
                    const name = msg.document.file_name || `file_${msg.message_id}`;

                    try {
                        const fileUrl = `https://api.telegram.org/bot${this.botToken}/getFile?file_id=${msg.document.file_id}`;
                        const fileResp = await this.safeFetch(fileUrl);
                        if (!fileResp.success) continue;

                        const fileData = JSON.parse(fileResp.text);
                        if (!fileData.ok) continue;

                        const contentUrl = `https://api.telegram.org/file/bot${this.botToken}/${fileData.result.file_path}`;
                        const contentResp = await this.safeFetch(contentUrl);
                        if (!contentResp.success) continue;

                        files.push({
                            name: name, content: contentResp.text,
                            file_id: msg.document.file_id,
                            message_id: msg.message_id,
                            size: contentResp.text.length
                        });
                        console.log(`[${TILE_ID}] ✅ جلب ${name} (${contentResp.text.length} بايت)`);
                    } catch(e) {
                        console.warn(`[${TILE_ID}] ⚠️ فشل جلب ملف:`, e.message);
                    }
                }
                // جلب الصور
                else if (msg.photo && msg.photo.length > 0) {
                    const photo = msg.photo[msg.photo.length - 1];
                    const name = `photo_${msg.message_id}.jpg`;
                    try {
                        const fileResp = await this.safeFetch(`https://api.telegram.org/bot${this.botToken}/getFile?file_id=${photo.file_id}`);
                        if (!fileResp.success) continue;
                        const fileData = JSON.parse(fileResp.text);
                        if (!fileData.ok) continue;
                        const contentResp = await this.safeFetch(`https://api.telegram.org/file/bot${this.botToken}/${fileData.result.file_path}`);
                        if (!contentResp.success) continue;
                        files.push({ name: name, content: contentResp.text, file_id: photo.file_id, message_id: msg.message_id, size: contentResp.text.length });
                    } catch(e) {}
                }
                // جلب النصوص الطويلة
                else if (msg.text && msg.text.length > 100) {
                    files.push({
                        name: `text_${msg.message_id}.txt`, content: msg.text,
                        message_id: msg.message_id, size: msg.text.length
                    });
                }
            }

            console.log(`[${TILE_ID}] 📊 ملخص: ${updates.length} تحديث, ${msgsFound} رسالة, ${docsFound} مستند, ${files.length} ملف`);

            return {
                success: true,
                files: files,
                totalUpdates: updates.length,
                msgsFound: msgsFound,
                docsFound: docsFound,
                filesCount: files.length
            };
        },

        // ✅ جلب يدوي (تجاوز CORS)
        syncManual: async function(jsonText) {
            console.log(`[${TILE_ID}] 📋 وضع الجلب اليدوي...`);

            try {
                const data = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;

                if (!data.ok) {
                    return { success: false, error: data.description || 'Telegram API error' };
                }

                console.log(`[${TILE_ID}] 📋 معالجة ${data.result.length} تحديث يدوي...`);
                const result = await this.processUpdates(data.result);

                if (!result.success) return result;

                // توزيع الملفات
                return await this.distributeFiles(result.files);

            } catch(e) {
                return { success: false, error: 'خطأ في معالجة JSON: ' + e.message };
            }
        },

        // ✅ توزيع الملفات على المربعات
        distributeFiles: async function(files) {
            let count = 0, skipped = 0, savedToRepo = 0;

            for (const file of files) {
                const match = file.name.match(/tile_(\d+)_(\d+)_(.+)/);

                if (!match) {
                    const path = file.name.replace('tile_', '').replace(/_/g, '/');
                    await Repo.addFile(path, file.content, `جلب: ${file.name}`);
                    savedToRepo++;
                    continue;
                }

                const row = parseInt(match[1]);
                const col = parseInt(match[2]);
                const tileId = `${row}_${col}`;
                const fileName = match[3];

                const sm = global.ServerManager || (typeof window !== 'undefined' ? window.ServerManager : null);

                if (!sm || !sm.tiles) {
                    await Repo.addFile(`${tileId}/${fileName}`, file.content, `جلب: ${file.name}`);
                    savedToRepo++;
                    continue;
                }

                if (!sm.tiles[tileId]) {
                    sm.tiles[tileId] = { id: tileId, row, col, files: {}, created: Date.now() };
                }

                const tile = sm.tiles[tileId];
                const existing = tile.files || {};

                if (Object.keys(existing).length > 0) {
                    skipped++;
                    continue;
                }

                tile.files[fileName] = file.content;
                count++;

                if (sm.renderGrid) sm.renderGrid();
                if (sm.updateStats) sm.updateStats();
                if (sm.saveTiles) sm.saveTiles();
            }

            const summary = `✅ [${TILE_ID}] مزامنة: ${count} موزعة + ${savedToRepo} في المستودع (تخطي: ${skipped})`;
            console.log(summary);

            if (typeof global.showToast === 'function') {
                global.showToast(summary, 'success');
            }

            return { success: true, synced: count, skipped, savedToRepo, total: files.length };
        },

        // ✅ المزامنة التلقائية
        syncAll: async function(options) {
            console.log(`[${TILE_ID}] 🚀 بدء المزامنة...`);

            if (!this.hasConfig()) {
                return { success: false, error: 'لا توجد إعدادات تلجرام' };
            }

            const result = await this.fetchAll(options);

            if (!result.success) {
                return result;
            }

            if (result.warning) {
                return result;
            }

            if (result.files.length === 0) {
                return { success: true, synced: 0, skipped: 0, savedToRepo: 0, total: 0, warning: 'لا توجد ملفات' };
            }

            return await this.distributeFiles(result.files);
        },

        pushAll: async function() {
            if (!this.hasConfig()) return { success: false, error: 'إعدادات غير مكتملة' };
            const paths = Repo.getFiles();
            let uploaded = 0;
            for (const path of paths) {
                const content = Repo.getFile(path);
                const name = `tile_${path.replace(/\//g, '_')}`;
                const blob = new Blob([content], { type: 'text/plain' });
                const file = new File([blob], name);
                const form = new FormData();
                form.append('chat_id', this.chatId);
                form.append('document', file);
                const result = await this.safeFetch(
                    `https://api.telegram.org/bot${this.botToken}/sendDocument`,
                    { method: 'POST', body: form }
                );
                if (result.success) {
                    try {
                        const data = JSON.parse(result.text);
                        if (data.ok) uploaded++;
                    } catch(e) {}
                }
            }
            return { success: true, uploaded, total: paths.length };
        },

        diagnostics: async function() {
            const results = { tileId: TILE_ID, hasConfig: this.hasConfig(), tests: [] };
            if (!this.hasConfig()) {
                results.tests.push({ name: 'Config', status: '❌' });
                return results;
            }
            const fix = this.fixConfig();
            results.configFixed = fix.fixed;

            const meResult = await this.safeFetch(`https://api.telegram.org/bot${this.botToken}/getMe`);
            if (!meResult.success) {
                results.tests.push({ name: 'getMe', status: '❌', error: meResult.error, manual: true });
            } else {
                try {
                    const data = JSON.parse(meResult.text);
                    results.tests.push({ name: 'getMe', status: data.ok ? '✅' : '❌', bot: data.result?.username });
                } catch(e) {
                    results.tests.push({ name: 'getMe', status: '❌', error: e.message });
                }
            }

            return results;
        }
    };

    // ============================================================
    // 🎮 GameData
    // ============================================================
    const GameData = {
        players: [],
        worlds: [
            { name: 'العالم الرئيسي', players: 0, maxPlayers: 100 },
            { name: 'عالم المغامرات', players: 0, maxPlayers: 50 }
        ],
        requests: 0,

        addPlayer: function(name) {
            const player = { id: Utils.uid(), name, level: 1, score: 0, joinedAt: new Date().toISOString() };
            this.players.push(player);
            this.worlds[0].players++;
            this.requests++;
            return player;
        },
        getPlayers: function() { return this.players; },
        getWorlds: function() { return this.worlds; },
        updateScore: function(id, score) {
            const p = this.players.find(x => x.id === id);
            if (p) { p.score = score; this.requests++; return p; }
            return null;
        },
        deletePlayer: function(id) {
            const idx = this.players.findIndex(x => x.id === id);
            if (idx !== -1) { this.players.splice(idx, 1); this.worlds[0].players--; this.requests++; return true; }
            return false;
        },
        getBanner: function() {
            return { title: `خادم ${TILE_ID}`, message: 'نظام الجلب والتوزيع v4.7', files: Repo.getStats().files, commits: Repo.getStats().commits };
        }
    };

    // ============================================================
    // 🧩 TileServer
    // ============================================================
    const TileServer = {
        info: function() {
            const stats = Repo.getStats();
            return {
                name: `خادم ${TILE_ID}`, version: '4.7.0', status: 'نشط',
                files: stats.files, commits: stats.commits,
                branches: stats.branches, currentBranch: stats.branch,
                channel: Channel.hasConfig() ? '🟢 متصلة' : '🔴 غير متصلة',
                uptime: Math.floor((Date.now() - (global._startTime || Date.now())) / 1000) + ' ثانية',
                requests: GameData.requests, tileId: TILE_ID, row: TILE_ROW, col: TILE_COL
            };
        },

        ping: function() {
            GameData.requests++;
            return { status: 'online', timestamp: Date.now(), tileId: TILE_ID };
        },

        repo: {
            add: function(p, c, m) { return Repo.addFile(p, c, m); },
            update: function(p, c, m) { return Repo.updateFile(p, c, m); },
            delete: function(p, m) { return Repo.deleteFile(p, m); },
            get: function(p) { return Repo.getFile(p); },
            list: function() { return Repo.getFiles(); },
            history: function(l) { return Repo.getHistory(l); },
            stats: function() { return Repo.getStats(); },
            reset: function(h) { return Repo.reset(h); },
            export: function() { return Repo.export(); },
            import: function(d) { return Repo.import(d); }
        },

        channel: {
            sync: function(o) { return Channel.syncAll(o); },
            push: function() { return Channel.pushAll(); },
            upload: function(p, c) { return Channel.uploadFile(p, c); },
            fetch: function(o) { return Channel.fetchAll(o); },
            saveConfig: function(t, c) { return Channel.saveConfig(t, c); },
            hasConfig: function() { return Channel.hasConfig(); },
            diagnostics: function() { return Channel.diagnostics(); },
            fixConfig: function() { return Channel.fixConfig(); },
            syncManual: function(json) { return Channel.syncManual(json); }  // ✅ جديد
        },

        syncAll: function(o) { return Channel.syncAll(o); },
        pushAll: function() { return Channel.pushAll(); },
        syncManual: function(json) { return Channel.syncManual(json); },  // ✅ جديد

        events: {
            on: function(e, c) { return Events.on(e, c); },
            off: function(e, c) { return Events.off(e, c); },
            emit: function(e, d) { return Events.emit(e, d); }
        },

        getData: function() {
            return { files: Repo.getFiles(), stats: Repo.getStats(), history: Repo.getHistory(10), branches: Object.keys(Repo.branches), currentBranch: Repo.currentBranch };
        },

        getPlayers: function() { return GameData.getPlayers(); },
        getWorlds: function() { return GameData.getWorlds(); },
        getUsers: function() { return GameData.getPlayers(); },
        getMembers: function() { return GameData.getPlayers(); },
        getBanner: function() { return GameData.getBanner(); },
        getCurrentBanner: function() { return GameData.getBanner(); },
        getMessage: function() { return GameData.getBanner(); },
        getLevels: function() { return GameData.getWorlds(); },
        getMaps: function() { return GameData.getWorlds(); },
        getSettings: function() { return { tileId: TILE_ID }; },
        getConfig: function() { return { tileId: TILE_ID }; },

        addPlayer: function(n) { return GameData.addPlayer(n); },
        addBanner: function() { return GameData.getBanner(); },
        addWorld: function(n) { GameData.worlds.push({ name: n, players: 0, maxPlayers: 50 }); return { success: true }; },
        addUser: function(n) { return GameData.addPlayer(n); },

        updateScore: function(i, v) { return GameData.updateScore(i, v); },
        updateData: function(i, v) { return GameData.updateScore(i, v); },
        updatePlayer: function(i, v) { return GameData.updateScore(i, v); },

        deletePlayer: function(i) { return GameData.deletePlayer(i); },
        deleteUser: function(i) { return GameData.deletePlayer(i); },
        deleteData: function(i) { return GameData.deletePlayer(i); },

        test: function() {
            return {
                success: true, message: 'الخادم يعمل',
                timestamp: new Date().toISOString(),
                repo: Repo.getStats(),
                tileId: TILE_ID
            };
        },

        reload: function() {
            Repo.load();
            Channel.init();
            return { success: true };
        },

        reset: function(hard) {
            Repo.reset(hard);
            GameData.players = [];
            GameData.worlds = [{ name: 'العالم الرئيسي', players: 0, maxPlayers: 100 }, { name: 'عالم المغامرات', players: 0, maxPlayers: 50 }];
            GameData.requests = 0;
            return { success: true };
        }
    };

    // ============================================================
    // ✅ التسجيل الفوري
    // ============================================================
    global._startTime = Date.now();
    global.servers = global.servers || {};
    global.servers[TILE_ID] = TileServer;

    console.log(`✅ [${TILE_ID}] TileServer مسجل في window.servers['${TILE_ID}']`);

    // ============================================================
    // 🔄 التهيئة
    // ============================================================
    Repo.load();
    Channel.init();

    console.log(`✅ [${TILE_ID}] نظام الجلب والتوزيع v4.7 جاهز!`);
    console.log(`📁 ملفات: ${Repo.getStats().files} | 📝 التزامات: ${Repo.getStats().commits}`);
    console.log(`📡 القناة: ${Channel.hasConfig() ? '🟢' : '🔴'}`);
    console.log(`💡 إذا فشل الجلب التلقائي، استخدم الوضع اليدوي:`);
    console.log(`   TileServer.syncManual('{"ok":true,"result":[...]}')`);

    if (typeof global.showToast === 'function') {
        global.showToast(`✅ خادم ${TILE_ID} جاهز`, 'success');
    }

    Events.emit('server:ready', { server: TILE_ID, version: '4.7.0' });

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);


