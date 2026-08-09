// ============================================================
// 🚀 main.js - الخادم الشامل المتكامل (النسخة النهائية v4.1)
// ============================================================

(function(global) {
    'use strict';

    console.log('🟢 الخادم الشامل المتكامل جاهز!');

    // ============================================================
    // ⚙️ الإعدادات العامة
    // ============================================================
    const CONFIG = {
        VERSION: '4.1.0',
        TILE_ID: '5_3',
        SYNC_INTERVAL: 300000,
        SESSION_TIMEOUT: 3600000,
        MAX_LOGIN_ATTEMPTS: 5,
        LOCKOUT_DURATION: 900000,
        MAX_FILE_SIZE: 50 * 1024 * 1024,
        RATE_LIMIT: 100,
        RATE_WINDOW: 60000,
        MAX_BACKUPS: 10,
        PASSWORD_MIN_LENGTH: 6
    };

    // ============================================================
    // 🛠️ أدوات مساعدة
    // ============================================================
    const Utils = {
        now: function() { return Date.now(); },
        randomString: function(len) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < len; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        },
        generateId: function() { return 'id_' + this.now() + '_' + this.randomString(6); },
        generateToken: function() { return this.randomString(32); },
        secureCompare: function(a, b) {
            if (a.length !== b.length) return false;
            let result = 0;
            for (let i = 0; i < a.length; i++) {
                result |= a.charCodeAt(i) ^ b.charCodeAt(i);
            }
            return result === 0;
        },
        sanitize: function(str) {
            if (!str) return '';
            return str.replace(/[<>]/g, '').replace(/script/gi, 'blocked').trim();
        },
        isValidEmail: function(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        isStrongPassword: function(password) {
            const checks = {
                length: password.length >= CONFIG.PASSWORD_MIN_LENGTH,
                uppercase: /[A-Z]/.test(password),
                lowercase: /[a-z]/.test(password),
                number: /\d/.test(password),
                special: /[!@#$%^&*()]/.test(password)
            };
            const score = Object.values(checks).filter(Boolean).length;
            return { valid: score >= 4, score: score, checks: checks };
        },
        maskString: function(str, visible = 2) {
            if (!str || str.length <= visible * 2) return '*'.repeat(str.length);
            return str.substring(0, visible) + '*'.repeat(str.length - visible * 2) + str.substring(str.length - visible);
        }
    };

    // ============================================================
    // 📦 1. نظام المستودع (GitHub-like)
    // ============================================================
    const Repo = {
        files: {},
        history: [],
        branches: { main: { files: {}, head: null } },
        currentBranch: 'main',

        save: function() {
            try {
                localStorage.setItem('gitlike_repo', JSON.stringify({
                    files: this.files,
                    history: this.history,
                    branches: this.branches,
                    currentBranch: this.currentBranch
                }));
            } catch(e) { console.error('❌ فشل حفظ المستودع:', e); }
        },

        load: function() {
            try {
                const data = localStorage.getItem('gitlike_repo');
                if (data) {
                    const parsed = JSON.parse(data);
                    this.files = parsed.files || {};
                    this.history = parsed.history || [];
                    this.branches = parsed.branches || { main: { files: {}, head: null } };
                    this.currentBranch = parsed.currentBranch || 'main';
                    return true;
                }
            } catch(e) { console.error('❌ فشل تحميل المستودع:', e); }
            return false;
        },

        getFile: function(path) { return this.files[path] || null; },
        getFiles: function() { return Object.keys(this.files); },

        addFile: function(path, content, msg = 'إضافة ملف') {
            this.files[path] = content;
            this.history.push({ action: 'add', path, message: msg, timestamp: new Date().toISOString() });
            this.save();
            return { success: true, path };
        },

        updateFile: function(path, content, msg = 'تحديث ملف') {
            if (!this.files[path]) return { success: false, error: 'الملف غير موجود' };
            this.files[path] = content;
            this.history.push({ action: 'update', path, message: msg, timestamp: new Date().toISOString() });
            this.save();
            return { success: true, path };
        },

        deleteFile: function(path, msg = 'حذف ملف') {
            if (!this.files[path]) return { success: false, error: 'الملف غير موجود' };
            delete this.files[path];
            this.history.push({ action: 'delete', path, message: msg, timestamp: new Date().toISOString() });
            this.save();
            return { success: true, path };
        },

        getHistory: function(limit = 20) { return this.history.slice(-limit); },

        getStats: function() {
            let size = 0;
            for (const content of Object.values(this.files)) size += content.length;
            return {
                files: Object.keys(this.files).length,
                size: size,
                commits: this.history.length,
                branch: this.currentBranch
            };
        },

        branch: function(name) {
            if (this.branches[name]) return { success: false, error: 'الفرع موجود' };
            this.branches[name] = { ...this.files };
            this.save();
            return { success: true };
        },

        checkout: function(name) {
            if (!this.branches[name]) return { success: false, error: 'الفرع غير موجود' };
            this.files = { ...this.branches[name] };
            this.currentBranch = name;
            this.save();
            return { success: true };
        },

        reset: function() {
            this.files = {};
            this.history = [];
            this.branches = { main: { files: {}, head: null } };
            this.currentBranch = 'main';
            this.save();
            return { success: true };
        },

        export: function() {
            return {
                files: this.files,
                history: this.history,
                branches: this.branches,
                currentBranch: this.currentBranch,
                exportedAt: new Date().toISOString()
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
    // 📡 2. نظام المزامنة مع القناة
    // ============================================================
    const Channel = {
        botToken: '',
        chatId: '',

        init: function() {
            this.botToken = localStorage.getItem('telegram_bot_token') || '';
            this.chatId = localStorage.getItem('telegram_chat_id') || '';
        },

        hasConfig: function() {
            return this.botToken.length > 10 && this.chatId.length > 0;
        },

        uploadFile: async function(path, content) {
            if (!this.hasConfig()) return { success: false, error: 'إعدادات التلجرام غير مكتملة' };
            try {
                const name = `tile_${path.replace(/\//g, '_')}`;
                const blob = new Blob([content], { type: 'text/plain' });
                const file = new File([blob], name);
                const form = new FormData();
                form.append('chat_id', this.chatId);
                form.append('document', file);
                const resp = await fetch(`https://api.telegram.org/bot${this.botToken}/sendDocument`, {
                    method: 'POST',
                    body: form
                });
                const data = await resp.json();
                return data.ok ? { success: true } : { success: false, error: data.description };
            } catch(e) {
                return { success: false, error: e.message };
            }
        },

        fetchAll: async function() {
            if (!this.hasConfig()) return { success: false, error: 'إعدادات التلجرام غير مكتملة' };
            try {
                const resp = await fetch(`https://api.telegram.org/bot${this.botToken}/getUpdates?limit=100`);
                const data = await resp.json();
                if (!data.ok) return { success: false, error: data.description };
                const files = [];
                for (const update of data.result) {
                    const msg = update.channel_post || update.message;
                    if (!msg || !msg.document) continue;
                    const name = msg.document.file_name || '';
                    if (!name.startsWith('tile_')) continue;
                    const fileResp = await fetch(`https://api.telegram.org/bot${this.botToken}/getFile?file_id=${msg.document.file_id}`);
                    const fileData = await fileResp.json();
                    if (!fileData.ok) continue;
                    const url = `https://api.telegram.org/file/bot${this.botToken}/${fileData.result.file_path}`;
                    const contentResp = await fetch(url);
                    const content = await contentResp.text();
                    const path = name.replace('tile_', '').replace(/_/g, '/');
                    files.push({ path, content, name });
                }
                return { success: true, files };
            } catch(e) {
                return { success: false, error: e.message };
            }
        },

        syncAll: async function() {
            if (!this.hasConfig()) {
                console.log('⚠️ لا توجد إعدادات تلجرام');
                return { success: false, error: 'لا توجد إعدادات' };
            }

            try {
                const result = await this.fetchAll();
                if (!result.success) return result;

                let count = 0;
                let skipped = 0;

                for (const file of result.files) {
                    const match = file.name.match(/tile_(\d+)_(\d+)_(.+)/);
                    if (!match) {
                        console.log(`⚠️ تنسيق غير صحيح: ${file.name}`);
                        continue;
                    }

                    const row = parseInt(match[1]);
                    const col = parseInt(match[2]);
                    const tileId = `${row}_${col}`;
                    const fileType = match[3];

                    if (typeof window.ServerManager === 'undefined' || !window.ServerManager.tiles) {
                        console.log('⚠️ ServerManager غير موجود');
                        Repo.addFile(file.path, file.content, `مزامنة من القناة: ${file.name}`);
                        count++;
                        continue;
                    }

                    if (!window.ServerManager.tiles[tileId]) {
                        window.ServerManager.tiles[tileId] = { files: {}, row, col, created: Date.now() };
                    }

                    const tile = window.ServerManager.tiles[tileId];
                    const existingFiles = tile.files || {};

                    if (Object.keys(existingFiles).length > 0) {
                        console.log(`⚠️ المربع (${row},${col}) مملؤ بالفعل (${Object.keys(existingFiles).length} ملفات)`);
                        if (typeof window.showToast === 'function') {
                            window.showToast(`⚠️ المربع (${row},${col}) مملؤ بالفعل!`, 'warning');
                        }
                        skipped++;
                        continue;
                    }

                    tile.files[fileType] = file.content;
                    console.log(`✅ تم حفظ ${fileType} في المربع (${row},${col})`);

                    if (typeof window.showToast === 'function') {
                        window.showToast(`✅ تم حفظ ${fileType} في (${row},${col})`, 'success');
                    }

                    if (typeof window.ServerManager !== 'undefined' && window.ServerManager.renderGrid) {
                        window.ServerManager.renderGrid();
                        window.ServerManager.updateStats();
                    }

                    count++;
                }

                const message = `✅ تم مزامنة ${count} ملف${skipped > 0 ? ` (تخطي ${skipped} مربع مملؤ)` : ''}`;
                console.log(message);
                if (typeof window.showToast === 'function') {
                    window.showToast(message, 'success');
                }

                return { success: true, synced: count, skipped };

            } catch(e) {
                console.error('❌ فشل المزامنة:', e);
                if (typeof window.showToast === 'function') {
                    window.showToast('❌ فشل المزامنة: ' + e.message, 'error');
                }
                return { success: false, error: e.message };
            }
        },

        syncManual: async function(jsonText) {
            log('info', '📋 بدء الجلب اليدوي...');
            try {
                let json = jsonText;
                const firstBrace = json.indexOf('{');
                const lastBrace = json.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) json = json.substring(firstBrace, lastBrace + 1);

                const data = JSON.parse(json);
                if (!data.ok) return { success: false, error: data.description };

                const files = [];
                for (const update of data.result) {
                    const msg = update.channel_post || update.message;
                    if (!msg || !msg.document) continue;
                    const name = msg.document.file_name || '';
                    if (!name.startsWith('tile_')) continue;

                    let content = '';
                    if (this.hasConfig() && msg.document.file_id) {
                        try {
                            const fileResp = await fetch(`https://api.telegram.org/bot${this.botToken}/getFile?file_id=${msg.document.file_id}`);
                            const fileData = await fileResp.json();
                            if (fileData.ok) {
                                const url = `https://api.telegram.org/file/bot${this.botToken}/${fileData.result.file_path}`;
                                const contentResp = await fetch(url);
                                content = await contentResp.text();
                            }
                        } catch(e) {
                            console.warn('⚠️ فشل جلب المحتوى:', e);
                        }
                    }

                    files.push({ name, content, file_id: msg.document.file_id });
                }

                return await this.distributeFiles(files);
            } catch(e) {
                return { success: false, error: 'JSON خطأ: ' + e.message };
            }
        },

        distributeFiles: async function(files) {
            let count = 0, skipped = 0, savedToRepo = 0;

            for (const file of files) {
                const match = file.name.match(/tile_(\d+)_(\d+)_(.+)/);
                if (!match) {
                    const path = file.name.replace('tile_', '').replace(/_/g, '/');
                    await Repo.addFile(path, file.content || '', `جلب: ${file.name}`);
                    savedToRepo++;
                    continue;
                }

                const row = parseInt(match[1]);
                const col = parseInt(match[2]);
                const tileId = `${row}_${col}`;
                const fileName = match[3];

                const sm = window.ServerManager;
                if (!sm || !sm.tiles) {
                    await Repo.addFile(`${tileId}/${fileName}`, file.content || '', `جلب: ${file.name}`);
                    savedToRepo++;
                    continue;
                }

                if (!sm.tiles[tileId]) {
                    sm.tiles[tileId] = { id: tileId, row, col, files: {}, created: Date.now() };
                }

                const tile = sm.tiles[tileId];
                if (Object.keys(tile.files || {}).length > 0) {
                    skipped++;
                    continue;
                }

                tile.files[fileName] = file.content || '';
                count++;
                if (sm.renderGrid) sm.renderGrid();
                if (sm.updateStats) sm.updateStats();
                if (sm.saveTiles) sm.saveTiles();
            }

            return { success: true, synced: count, skipped, savedToRepo, total: files.length };
        },

        pushAll: async function() {
            if (!this.hasConfig()) return { success: false, error: 'إعدادات غير مكتملة' };
            const paths = Repo.getFiles();
            let uploaded = 0;
            for (const path of paths) {
                const content = Repo.getFile(path);
                const result = await this.uploadFile(path, content);
                if (result.success) uploaded++;
            }
            return { success: true, uploaded, total: paths.length };
        }
    };

    // ============================================================
    // 🔐 3. نظام التشفير
    // ============================================================
    const Crypto = {
        key: 'MySecureKey2026@SuperSecret!',

        encrypt: function(text) {
            if (!text) return '';
            let result = '';
            for (let i = 0; i < text.length; i++) {
                const code = text.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length);
                result += String.fromCharCode(code);
            }
            return btoa(result);
        },

        decrypt: function(encrypted) {
            if (!encrypted) return '';
            try {
                const decoded = atob(encrypted);
                let result = '';
                for (let i = 0; i < decoded.length; i++) {
                    const code = decoded.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length);
                    result += String.fromCharCode(code);
                }
                return result;
            } catch(e) {
                return encrypted;
            }
        },

        encryptData: function(data) { return this.encrypt(JSON.stringify(data)); },
        decryptData: function(encrypted) {
            try { return JSON.parse(this.decrypt(encrypted)); } catch(e) { return null; }
        },

        hash: function(text) {
            let hash = 0;
            for (let i = 0; i < text.length; i++) {
                const char = text.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return 'h_' + Math.abs(hash).toString(36);
        }
    };

    // ============================================================
    // 🔑 4. نظام المصادقة
    // ============================================================
    const Auth = {
        users: {},
        sessions: {},
        loginAttempts: {},

        register: function(username, password, role = 'player') {
            username = Utils.sanitize(username);
            if (!username || username.length < 3) return { success: false, error: 'اسم المستخدم قصير جداً' };
            if (this.users[username]) return { success: false, error: 'المستخدم موجود مسبقاً' };
            const strength = Utils.isStrongPassword(password);
            if (!strength.valid) return { success: false, error: 'كلمة المرور ضعيفة' };
            this.users[username] = {
                id: Utils.generateId(),
                username: username,
                password: Crypto.encrypt(password),
                role: role,
                createdAt: new Date().toISOString(),
                lastLogin: null,
                isActive: true
            };
            return { success: true, user: { username, role } };
        },

        login: function(username, password, ip = 'local') {
            username = Utils.sanitize(username);
            const user = this.users[username];
            if (!user) return { success: false, error: 'بيانات غير صحيحة' };
            const attempts = this.loginAttempts[username] || 0;
            if (attempts >= CONFIG.MAX_LOGIN_ATTEMPTS) {
                return { success: false, error: 'تم قفل الحساب مؤقتاً' };
            }
            const decrypted = Crypto.decrypt(user.password);
            if (decrypted !== password) {
                this.loginAttempts[username] = (this.loginAttempts[username] || 0) + 1;
                return { success: false, error: 'بيانات غير صحيحة' };
            }
            delete this.loginAttempts[username];
            const token = Utils.generateToken();
            this.sessions[token] = {
                userId: user.id,
                username: user.username,
                role: user.role,
                createdAt: Utils.now(),
                expiresAt: Utils.now() + CONFIG.SESSION_TIMEOUT,
                ip: ip
            };
            user.lastLogin = new Date().toISOString();
            return { success: true, token, user: { id: user.id, username: user.username, role: user.role } };
        },

        verify: function(token) {
            const session = this.sessions[token];
            if (!session) return { valid: false, error: 'جلسة غير موجودة' };
            if (Utils.now() > session.expiresAt) {
                delete this.sessions[token];
                return { valid: false, error: 'انتهت صلاحية الجلسة' };
            }
            return { valid: true, user: { username: session.username, role: session.role } };
        },

        logout: function(token) {
            delete this.sessions[token];
            return { success: true };
        },

        changePassword: function(username, oldPassword, newPassword) {
            const user = this.users[username];
            if (!user) return { success: false, error: 'المستخدم غير موجود' };
            const decrypted = Crypto.decrypt(user.password);
            if (decrypted !== oldPassword) return { success: false, error: 'كلمة المرور الحالية غير صحيحة' };
            const strength = Utils.isStrongPassword(newPassword);
            if (!strength.valid) return { success: false, error: 'كلمة المرور ضعيفة' };
            user.password = Crypto.encrypt(newPassword);
            return { success: true };
        },

        listUsers: function() {
            return Object.values(this.users).map(u => ({
                username: u.username,
                role: u.role,
                lastLogin: u.lastLogin
            }));
        },

        cleanSessions: function() {
            const now = Utils.now();
            for (const [token, session] of Object.entries(this.sessions)) {
                if (now > session.expiresAt) delete this.sessions[token];
            }
        }
    };

    // ============================================================
    // 🛡️ 5. نظام الصلاحيات
    // ============================================================
    const Permissions = {
        roles: {
            admin: { level: 100, permissions: ['*'] },
            moderator: { level: 60, permissions: ['edit', 'delete', 'view'] },
            player: { level: 20, permissions: ['view', 'play'] },
            guest: { level: 5, permissions: ['view_public'] }
        },

        hasPermission: function(role, permission) {
            const roleData = this.roles[role];
            if (!roleData) return false;
            if (roleData.permissions.includes('*')) return true;
            return roleData.permissions.includes(permission);
        },

        hasLevel: function(role, minLevel) {
            const roleData = this.roles[role];
            return roleData ? roleData.level >= minLevel : false;
        },

        addRole: function(name, level, permissions) {
            this.roles[name] = { level: level || 10, permissions: permissions || [] };
            return { success: true };
        }
    };

    // ============================================================
    // 📝 6. سجل الأحداث
    // ============================================================
    const AuditLog = {
        logs: [],

        add: function(type, message, data = {}) {
            const entry = {
                id: Utils.generateId(),
                timestamp: new Date().toISOString(),
                type: type,
                message: message,
                data: data
            };
            this.logs.push(entry);
            if (this.logs.length > 1000) this.logs.shift();
            console.log(`📝 [${type}] ${message}`);
            return entry;
        },

        get: function(type, limit = 50) {
            let filtered = this.logs;
            if (type) filtered = filtered.filter(l => l.type === type);
            return filtered.slice(-limit);
        },

        clear: function() {
            this.logs = [];
            return { success: true };
        }
    };

    // ============================================================
    // 🚫 7. مكافحة الهجمات (WAF)
    // ============================================================
    const WAF = {
        requests: {},
        blockedIPs: {},

        check: function(ip, path = '', content = '') {
            const now = Utils.now();
            if (this.blockedIPs[ip] && this.blockedIPs[ip] > now) {
                return { allowed: false, reason: 'IP محظور' };
            }
            if (!this.requests[ip]) this.requests[ip] = [];
            this.requests[ip].push(now);
            this.requests[ip] = this.requests[ip].filter(t => now - t < CONFIG.RATE_WINDOW);
            if (this.requests[ip].length > CONFIG.RATE_LIMIT) {
                this.blockedIPs[ip] = now + CONFIG.LOCKOUT_DURATION;
                return { allowed: false, reason: 'تجاوز معدل الطلبات' };
            }
            if (/<script\b/i.test(content) || /javascript:/i.test(content)) {
                this.blockedIPs[ip] = now + CONFIG.LOCKOUT_DURATION;
                return { allowed: false, reason: 'XSS محظور' };
            }
            if (/UNION\s+SELECT/i.test(content) || /DROP\s+TABLE/i.test(content)) {
                this.blockedIPs[ip] = now + CONFIG.LOCKOUT_DURATION;
                return { allowed: false, reason: 'SQL Injection محظور' };
            }
            return { allowed: true };
        },

        unblock: function(ip) {
            delete this.blockedIPs[ip];
            return { success: true };
        },

        getBlocked: function() {
            return Object.keys(this.blockedIPs);
        }
    };

    // ============================================================
    // 💾 8. النسخ الاحتياطي
    // ============================================================
    const Backup = {
        backups: [],

        create: function(data, name) {
            const backup = {
                id: Utils.generateId(),
                name: name || 'نسخة احتياطية',
                timestamp: new Date().toISOString(),
                data: Crypto.encryptData(data),
                hash: Crypto.hash(JSON.stringify(data))
            };
            this.backups.push(backup);
            if (this.backups.length > CONFIG.MAX_BACKUPS) this.backups.shift();
            return { success: true, id: backup.id };
        },

        restore: function(id) {
            const backup = this.backups.find(b => b.id === id);
            if (!backup) return { success: false, error: 'النسخة غير موجودة' };
            try {
                const data = Crypto.decryptData(backup.data);
                const hash = Crypto.hash(JSON.stringify(data));
                if (hash !== backup.hash) return { success: false, error: 'البيانات تالفة' };
                return { success: true, data: data };
            } catch(e) {
                return { success: false, error: 'فشل فك التشفير' };
            }
        },

        list: function() {
            return this.backups.map(b => ({ id: b.id, name: b.name, timestamp: b.timestamp }));
        },

        delete: function(id) {
            this.backups = this.backups.filter(b => b.id !== id);
            return { success: true };
        }
    };

    // ============================================================
    // ✅ 9. التحقق من السلامة
    // ============================================================
    const Integrity = {
        protectedItems: {},

        protect: function(data, label = 'data') {
            const hash = Crypto.hash(JSON.stringify(data));
            this.protectedItems[label] = {
                data: JSON.parse(JSON.stringify(data)),
                hash: hash,
                timestamp: Utils.now()
            };
            return { success: true, label, hash };
        },

        verify: function(label) {
            const item = this.protectedItems[label];
            if (!item) return { valid: false, error: 'العنصر غير موجود' };
            const hash = Crypto.hash(JSON.stringify(item.data));
            return {
                valid: Utils.secureCompare(hash, item.hash),
                timestamp: item.timestamp,
                age: Utils.now() - item.timestamp
            };
        }
    };

    // ============================================================
    // 🦠 10. فحص الفيروسات
    // ============================================================
    const VirusScan = {
        patterns: [
            { pattern: /eval\s*\(/i, risk: 'high', name: 'eval()' },
            { pattern: /document\.write\s*\(/i, risk: 'medium', name: 'document.write()' },
            { pattern: /window\.location\s*=/i, risk: 'medium', name: 'Location manipulation' },
            { pattern: /\.cookie/i, risk: 'high', name: 'Cookie access' },
            { pattern: /XMLHttpRequest/i, risk: 'low', name: 'XHR request' },
            { pattern: /fetch\s*\(/i, risk: 'low', name: 'Fetch API' }
        ],

        scan: function(content) {
            const threats = [];
            let totalRisk = 0;
            for (const { pattern, risk, name } of this.patterns) {
                const matches = content.match(pattern);
                if (matches) {
                    const riskScore = { high: 30, medium: 15, low: 5 };
                    threats.push({ name, risk, count: matches.length, score: riskScore[risk] || 10 });
                    totalRisk += riskScore[risk] || 10;
                }
            }
            return {
                safe: totalRisk < 30,
                totalRisk: totalRisk,
                threats: threats.sort((a, b) => b.score - a.score)
            };
        },

        clean: function(content) {
            let cleaned = content;
            cleaned = cleaned.replace(/eval\s*\(/gi, '/* blocked */ eval(');
            cleaned = cleaned.replace(/document\.write\s*\(/gi, '/* blocked */ document.write(');
            cleaned = cleaned.replace(/window\.location\s*=/gi, '/* blocked */ location =');
            return cleaned;
        }
    };

    // ============================================================
    // 🕵️ 11. حماية من التجسس
    // ============================================================
    const SpyProtection = {
        patterns: [
            { pattern: /console\.log/i, name: 'console.log', risk: 'low' },
            { pattern: /alert\s*\(/i, name: 'alert', risk: 'low' },
            { pattern: /debugger;/i, name: 'debugger', risk: 'medium' },
            { pattern: /eval/i, name: 'eval', risk: 'high' }
        ],

        scan: function(code) {
            const findings = [];
            for (const { pattern, name, risk } of this.patterns) {
                if (pattern.test(code)) {
                    findings.push({ name, risk, score: risk === 'high' ? 25 : risk === 'medium' ? 10 : 5 });
                }
            }
            return { safe: findings.length === 0, findings };
        }
    };

    // ============================================================
    // 📊 12. معلومات النظام
    // ============================================================
    const SystemInfo = {
        getInfo: function() {
            const stats = Repo.getStats();
            return {
                name: 'الخادم الشامل المتكامل',
                version: CONFIG.VERSION,
                status: 'نشط',
                tileId: CONFIG.TILE_ID,
                users: Object.keys(Auth.users).length,
                sessions: Object.keys(Auth.sessions).length,
                files: stats.files,
                commits: stats.commits,
                backups: Backup.backups.length,
                blockedIPs: WAF.getBlocked().length,
                logs: AuditLog.logs.length,
                uptime: Math.floor((Utils.now() - (global._startTime || Utils.now())) / 1000) + ' ثانية'
            };
        },

        ping: function() {
            return {
                status: 'online',
                timestamp: new Date().toISOString(),
                version: CONFIG.VERSION
            };
        }
    };

    // ============================================================
    // 🧩 13. الخادم الرئيسي
    // ============================================================
    const TileServer = {
        // معلومات
        info: SystemInfo.getInfo,
        ping: SystemInfo.ping,

        // المستودع (GitHub-like)
        repo: {
            add: Repo.addFile.bind(Repo),
            update: Repo.updateFile.bind(Repo),
            delete: Repo.deleteFile.bind(Repo),
            get: Repo.getFile.bind(Repo),
            list: Repo.getFiles.bind(Repo),
            history: Repo.getHistory.bind(Repo),
            stats: Repo.getStats.bind(Repo),
            branch: Repo.branch.bind(Repo),
            checkout: Repo.checkout.bind(Repo),
            reset: Repo.reset.bind(Repo),
            export: Repo.export.bind(Repo),
            import: Repo.import.bind(Repo)
        },

        // القناة
        channel: {
            sync: Channel.syncAll.bind(Channel),
            push: Channel.pushAll.bind(Channel),
            upload: Channel.uploadFile.bind(Channel),
            fetch: Channel.fetchAll.bind(Channel),
            syncManual: Channel.syncManual.bind(Channel),
            hasConfig: Channel.hasConfig.bind(Channel),
            saveConfig: function(token, chatId) {
                localStorage.setItem('telegram_bot_token', token);
                localStorage.setItem('telegram_chat_id', chatId);
                Channel.init();
                return { success: true };
            }
        },

        // مزامنة يدوية
        syncManual: Channel.syncManual.bind(Channel),

        // المصادقة
        auth: {
            register: Auth.register.bind(Auth),
            login: Auth.login.bind(Auth),
            verify: Auth.verify.bind(Auth),
            logout: Auth.logout.bind(Auth),
            changePassword: Auth.changePassword.bind(Auth),
            listUsers: Auth.listUsers.bind(Auth)
        },

        // الحماية
        security: {
            waf: WAF.check.bind(WAF),
            virus: VirusScan.scan.bind(VirusScan),
            spy: SpyProtection.scan.bind(SpyProtection),
            integrity: Integrity.protect.bind(Integrity),
            verifyIntegrity: Integrity.verify.bind(Integrity)
        },

        // النسخ الاحتياطي
        backup: {
            create: Backup.create.bind(Backup),
            restore: Backup.restore.bind(Backup),
            list: Backup.list.bind(Backup),
            delete: Backup.delete.bind(Backup)
        },

        // السجلات
        logs: {
            add: AuditLog.add.bind(AuditLog),
            get: AuditLog.get.bind(AuditLog),
            clear: AuditLog.clear.bind(AuditLog)
        },

        // أدوات مساعدة
        utils: {
            encrypt: Crypto.encrypt.bind(Crypto),
            decrypt: Crypto.decrypt.bind(Crypto),
            hash: Crypto.hash.bind(Crypto),
            generateToken: Utils.generateToken.bind(Utils)
        },

        // بيانات اللعبة الأساسية        getData: function() {
            return {
                players: [],
                worlds: [],
                banners: [],
                settings: {},
                files: Repo.getFiles()
            };
        },

        // اختبار الاتصال
        test: function() {
            return {
                success: true,
                message: 'الخادم يعمل بشكل طبيعي',
                timestamp: new Date().toISOString(),
                repo: Repo.getStats()
            };
        },

        // إعادة تحميل
        reload: function() {
            Repo.load();
            Auth.cleanSessions();
            return { success: true };
        },

        // إعادة تعيين
        reset: function() {
            Repo.reset();
            Auth.users = {};
            Auth.sessions = {};
            Backup.backups = [];
            AuditLog.logs = [];
            WAF.blockedIPs = {};
            return { success: true };
        }
    };

    // ============================================================
    // 📌 تسجيل الخادم
    // ============================================================

    global._startTime = Date.now();

    // تحميل المستودع
    Repo.load();

    // تهيئة القناة
    Channel.init();

    // تسجيل الخادم
    window.servers = window.servers || {};
    window.servers[CONFIG.TILE_ID] = TileServer;

    // ============================================================
    // 🔄 التشغيل التلقائي
    // ============================================================

    // مزامنة تلقائية كل 5 دقائق
    setInterval(async () => {
        console.log('🔄 مزامنة تلقائية مع القناة...');
        await Channel.syncAll();
    }, CONFIG.SYNC_INTERVAL);

    // تنظيف الجلسات كل دقيقة
    setInterval(() => {
        Auth.cleanSessions();
    }, 60000);

    // ============================================================
    // 📢 رسائل البداية
    // ============================================================

    const stats = Repo.getStats();
    console.log(`✅ الخادم الشامل (${CONFIG.TILE_ID}) جاهز!`);
    console.log(`📁 الملفات في المستودع: ${stats.files}`);
    console.log(`📝 الالتزامات: ${stats.commits}`);
    console.log(`👥 المستخدمين: ${Object.keys(Auth.users).length}`);
    console.log(`📊 السجلات: ${AuditLog.logs.length}`);
    console.log(`📡 القناة: ${Channel.hasConfig() ? '🟢 متصلة' : '🔴 غير متصلة'}`);
    console.log('');
    console.log('📌 الأوامر المتاحة:');
    console.log('  TileServer.info()           - معلومات الخادم');
    console.log('  TileServer.ping()           - اختبار الاتصال');
    console.log('  TileServer.repo.list()      - قائمة الملفات');
    console.log('  TileServer.repo.add()       - إضافة ملف');
    console.log('  TileServer.channel.sync()   - مزامنة تلقائية');
    console.log('  TileServer.channel.syncManual(json) - مزامنة يدوية من JSON');
    console.log('  TileServer.channel.push()   - رفع إلى القناة');
    console.log('  TileServer.auth.register()  - تسجيل مستخدم');
    console.log('  TileServer.auth.login()     - تسجيل الدخول');
    console.log('  TileServer.security.waf()   - فحص WAF');
    console.log('  TileServer.backup.create()  - نسخ احتياطي');
    console.log('  TileServer.test()           - اختبار الخادم');
    console.log('');

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

