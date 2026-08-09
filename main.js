// ============================================================
// 🚀 main.js - الخادم الأساسي للمربعات (النسخة النهائية)
// ============================================================

console.log('🟢 خادم المربعات جاهز للعمل!');

// ====== تسجيل الخادم في window.servers ======
window.servers = window.servers || {};

// ====== بيانات الخادم ======
const ServerData = {
    name: 'خادم المربع الرئيسي',
    status: 'نشط',
    version: '1.0',
    startTime: Date.now(),
    requests: 0
};

// ====== قاعدة البيانات ======
let Database = {
    players: [
        { id: 1, name: 'مغامر 1', level: 5, score: 1200 },
        { id: 2, name: 'مغامر 2', level: 3, score: 800 },
        { id: 3, name: 'مغامر 3', level: 7, score: 2500 }
    ],
    worlds: [
        { id: 'main', name: 'العالم الرئيسي', players: 3 },
        { id: 'forest', name: 'الغابة المظلمة', players: 1 }
    ],
    banners: [
        { text: '🌍 مرحباً بك في عالمك الافتراضي!', color: '#ffd700' },
        { text: '⚔️ استعد للمغامرة!', color: '#4ade80' },
        { text: '🏆 سجل نقاطك وتحدى أصدقائك', color: '#60a5fa' }
    ]
};

// ====== دوال الخادم ======
const TileServer = {

    // معلومات الخادم
    info: function() {
        ServerData.requests++;
        return {
            name: ServerData.name,
            status: ServerData.status,
            version: ServerData.version,
            uptime: Math.floor((Date.now() - ServerData.startTime) / 1000) + ' ثانية',
            requests: ServerData.requests,
            players: Database.players.length,
            worlds: Database.worlds.length,
            banners: Database.banners.length
        };
    },

    // جلب جميع البيانات
    getData: function() {
        ServerData.requests++;
        return {
            players: Database.players,
            worlds: Database.worlds,
            banners: Database.banners
        };
    },

    // جلب اللاعبين
    getPlayers: function() {
        ServerData.requests++;
        return Database.players;
    },

    // جلب العوالم
    getWorlds: function() {
        ServerData.requests++;
        return Database.worlds;
    },

    // جلب الشريط الحالي
    getCurrentBanner: function() {
        ServerData.requests++;
        return Database.banners[0] || { text: '🌍 مرحباً!', color: '#ffd700' };
    },

    // جلب جميع الشرائط
    getBanners: function() {
        ServerData.requests++;
        return Database.banners;
    },

    // إضافة لاعب
    addPlayer: function(name) {
        ServerData.requests++;
        const newPlayer = {
            id: Database.players.length + 1,
            name: name || 'مغامر جديد',
            level: 1,
            score: 0
        };
        Database.players.push(newPlayer);
        return newPlayer;
    },

    // تحديث نقاط اللاعب
    updateScore: function(playerId, points) {
        ServerData.requests++;
        const player = Database.players.find(p => p.id === playerId);
        if (player) {
            player.score += points;
            player.level = Math.floor(player.score / 500) + 1;
            return { success: true, player: player };
        }
        return { success: false, error: 'اللاعب غير موجود' };
    },

    // إضافة عالم
    addWorld: function(name) {
        ServerData.requests++;
        const newWorld = {
            id: 'world_' + Date.now(),
            name: name || 'عالم جديد',
            players: 0
        };
        Database.worlds.push(newWorld);
        return newWorld;
    },

    // إضافة شريط
    addBanner: function(text, color) {
        ServerData.requests++;
        Database.banners.push({ text: text || 'رسالة جديدة', color: color || '#ffffff' });
        return { success: true, total: Database.banners.length };
    },

    // اختبار الاتصال
    ping: function() {
        ServerData.requests++;
        return {
            status: 'online',
            timestamp: Date.now(),
            message: 'الخادم يعمل'
        };
    },

    // جلب ملف من المربع (لـ main.html)
    getFile: function(fileName) {
        // البحث عن الملف في جميع المربعات
        if (window.ServerManager && window.ServerManager.tiles) {
            for (const [tileId, tile] of Object.entries(window.ServerManager.tiles)) {
                if (tile.files && tile.files[fileName]) {
                    return tile.files[fileName];
                }
            }
        }
        return null;
    },

    // مزامنة يدوية من JSON (لـ main.html)
    syncManual: async function(jsonText) {
        try {
            const data = JSON.parse(jsonText);
            if (!data.ok || !data.result) {
                return { success: false, error: 'JSON غير صالح' };
            }

            let count = 0;
            let skipped = 0;

            for (const update of data.result) {
                const msg = update.channel_post || update.message;
                if (!msg || !msg.document) continue;

                const fileName = msg.document.file_name || '';
                const match = fileName.match(/tile_(\d+)_(\d+)_(.+)/);
                if (!match) continue;

                const row = parseInt(match[1]);
                const col = parseInt(match[2]);
                const tileId = `${row}_${col}`;
                const fileType = match[3];

                if (!window.ServerManager || !window.ServerManager.tiles) {
                    console.log('⚠️ ServerManager غير موجود');
                    continue;
                }

                if (!window.ServerManager.tiles[tileId]) {
                    window.ServerManager.tiles[tileId] = {
                        id: tileId, row: row, col: col,
                        files: {}, created: Date.now()
                    };
                }

                const tile = window.ServerManager.tiles[tileId];
                if (Object.keys(tile.files || {}).length > 0) {
                    skipped++;
                    continue;
                }

                // جلب محتوى الملف
                let content = '';
                const token = localStorage.getItem('telegram_bot_token');
                if (token) {
                    try {
                        const fileResp = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${msg.document.file_id}`);
                        const fileData = await fileResp.json();
                        if (fileData.ok) {
                            const url = `https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`;
                            const contentResp = await fetch(url);
                            content = await contentResp.text();
                        }
                    } catch(e) {
                        console.warn('⚠️ فشل جلب المحتوى:', e);
                    }
                }

                tile.files[fileType] = content || `[METADATA]\nfile_name: ${fileName}\nfile_id: ${msg.document.file_id}`;
                count++;

                if (window.ServerManager.renderGrid) {
                    window.ServerManager.renderGrid();
                    window.ServerManager.updateStats();
                }
            }

            return { success: true, synced: count, skipped: skipped };

        } catch(e) {
            return { success: false, error: e.message };
        }
    }
};

// ====== تسجيل الخادم ======
const tileId = window.location.hash.replace('#', '') || '5_3';
window.servers[tileId] = TileServer;

// ====== بدء التشغيل ======
console.log(`✅ خادم (${tileId}) جاهز`);
console.log(`📊 عدد اللاعبين: ${Database.players.length}`);
console.log(`🌍 عدد العوالم: ${Database.worlds.length}`);
console.log(`📢 عدد الشرائط: ${Database.banners.length}`);
console.log('');
console.log('📌 الأوامر المتاحة:');
console.log('  TileServer.info() - معلومات الخادم');
console.log('  TileServer.getPlayers() - قائمة اللاعبين');
console.log('  TileServer.getWorlds() - قائمة العوالم');
console.log('  TileServer.getCurrentBanner() - الشريط الحالي');
console.log('  TileServer.addPlayer("اسم") - إضافة لاعب');
console.log('  TileServer.updateScore(1, 100) - تحديث نقاط');
console.log('  TileServer.ping() - اختبار الاتصال');
console.log('  TileServer.syncManual(json) - مزامنة يدوية من JSON');
