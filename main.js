// ============================================================
// 🚀 main.js - القلب النابض للخادم
// ============================================================

console.log('🟢 خادم اللعبة جاهز!');

// ====== البيانات ======
let Database = {
    players: [],
    worlds: [],
    banners: [],
    settings: {}
};

// ====== تحميل/حفظ ======
function loadData() {
    const saved = localStorage.getItem('game_server_data');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            Database.players = data.players || [];
            Database.worlds = data.worlds || [];
            Database.banners = data.banners || [];
            Database.settings = data.settings || {};
        } catch(e) {}
    } else {
        // بيانات افتراضية
        Database.players = [
            { id: 1, name: 'مغامر 1', level: 5, score: 1200 },
            { id: 2, name: 'مغامر 2', level: 3, score: 800 }
        ];
        Database.worlds = [
            { id: 'main', name: 'العالم الرئيسي', players: 2 }
        ];
        Database.banners = [
            { text: '🌍 مرحباً', color: '#ffd700' }
        ];
        saveData();
    }
}

function saveData() {
    localStorage.setItem('game_server_data', JSON.stringify(Database));
}

// ====== دوال الخادم ======
const TileServer = {
    // معلومات
    info: function() {
        return {
            name: 'خادم اللعبة',
            status: 'نشط',
            players: Database.players.length,
            worlds: Database.worlds.length
        };
    },
    
    // اللاعبين
    getPlayers: function() { return Database.players; },
    addPlayer: function(name) {
        const p = { id: Date.now(), name: name || 'مغامر', level: 1, score: 0 };
        Database.players.push(p);
        saveData();
        return p;
    },
    updateScore: function(id, points) {
        const p = Database.players.find(p => p.id === id);
        if (p) { p.score += points; p.level = Math.floor(p.score/500)+1; saveData(); return p; }
        return null;
    },
    
    // العوالم
    getWorlds: function() { return Database.worlds; },
    addWorld: function(name) {
        const w = { id: 'w_' + Date.now(), name: name || 'عالم جديد', players: 0 };
        Database.worlds.push(w);
        saveData();
        return w;
    },
    
    // الشرائط
    getCurrentBanner: function() {
        return Database.banners[0] || { text: '🌍 مرحباً', color: '#ffd700' };
    },
    addBanner: function(text, color) {
        Database.banners.push({ text, color: color || '#fff' });
        saveData();
        return Database.banners;
    },
    
    // اختبار
    ping: function() {
        return { status: 'online', timestamp: Date.now() };
    },
    
    // مزامنة
    sync: async function() {
        const token = localStorage.getItem('telegram_bot_token');
        const chatId = localStorage.getItem('telegram_chat_id');
        if (!token || !chatId) return { success: false };
        try {
            const data = JSON.stringify(Database);
            const blob = new Blob([data], { type: 'application/json' });
            const file = new File([blob], 'server_data.json');
            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append('document', file);
            const resp = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
                method: 'POST', body: formData
            });
            const result = await resp.json();
            return { success: result.ok };
        } catch(e) {
            return { success: false, error: e.message };
        }
    }
};

// ====== تسجيل ======
window.servers = window.servers || {};
const tileId = window.location.hash.replace('#', '') || '5_3';
window.servers[tileId] = TileServer;

// ====== بدء ======
loadData();
console.log(`✅ خادم (${tileId}) جاهز`);
console.log(`👥 عدد اللاعبين: ${Database.players.length}`);
console.log(`🌍 عدد العوالم: ${Database.worlds.length}`);

