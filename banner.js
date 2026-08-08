// ============================================================
// 📢 banner.js - خادم الشريط المتحرك (نسخة نهائية)
// ============================================================

console.log('🟢 خادم الشريط المتحرك جاهز!');

// ====== بيانات الشرائط ======
const BannerData = {
    messages: [
        { text: '🌍 مرحباً بك في عالمك الافتراضي!', color: '#ffd700' },
        { text: '⚔️ استعد للمغامرة!', color: '#4ade80' },
        { text: '🏆 سجل نقاطك وتحدى أصدقائك', color: '#60a5fa' },
        { text: '🎮 استمتع بلعب العوالم الكروية', color: '#a78bfa' },
        { text: '📡 متصل بالخادم بنجاح', color: '#4ade80' },
        { text: '🔥 تحدى أصدقائك في ساحة القتال', color: '#f87171' },
        { text: '⭐ اجمع النجوم وارفع مستواك', color: '#fbbf24' },
        { text: '🛡️ حماية المربعات متاحة للمدير', color: '#34d399' }
    ],
    currentIndex: 0,
    interval: 3000,
    isActive: true
};

// ====== دوال الخادم ======
const TileServer = {

    // معلومات الخادم
    info: function() {
        return {
            name: 'خادم الشريط المتحرك',
            status: 'نشط',
            version: '1.0',
            totalBanners: BannerData.messages.length,
            interval: BannerData.interval,
            isActive: BannerData.isActive
        };
    },

    // جلب الشريط الحالي
    getCurrentBanner: function() {
        return BannerData.messages[BannerData.currentIndex];
    },

    // جلب الشريط التالي
    getNextBanner: function() {
        BannerData.currentIndex = (BannerData.currentIndex + 1) % BannerData.messages.length;
        return BannerData.messages[BannerData.currentIndex];
    },

    // جلب جميع الشرائط
    getBannerList: function() {
        return BannerData.messages;
    },

    // جلب البيانات العامة
    getData: function() {
        return {
            current: this.getCurrentBanner(),
            list: BannerData.messages,
            interval: BannerData.interval,
            isActive: BannerData.isActive
        };
    },

    // إضافة شريط جديد
    addBanner: function(text, color) {
        BannerData.messages.push({
            text: text || 'رسالة جديدة',
            color: color || '#ffffff'
        });
        return { success: true, total: BannerData.messages.length };
    },

    // حذف شريط
    removeBanner: function(index) {
        if (index >= 0 && index < BannerData.messages.length) {
            BannerData.messages.splice(index, 1);
            return { success: true, total: BannerData.messages.length };
        }
        return { success: false, error: 'الرقم غير صحيح' };
    },

    // تغيير سرعة التحديث
    setInterval: function(ms) {
        BannerData.interval = ms || 3000;
        return { success: true, interval: BannerData.interval };
    },

    // تشغيل/إيقاف
    toggle: function(active) {
        BannerData.isActive = (active !== undefined) ? active : !BannerData.isActive;
        return { success: true, isActive: BannerData.isActive };
    },

    // اختبار الاتصال
    ping: function() {
        return {
            status: 'online',
            timestamp: Date.now(),
            message: 'خادم الشريط يعمل'
        };
    },

    // بدء التحديث التلقائي
    start: function() {
        if (this._interval) clearInterval(this._interval);
        this._interval = setInterval(() => {
            if (BannerData.isActive) {
                const banner = this.getNextBanner();
                if (window.updateGameBanner) {
                    window.updateGameBanner(banner.text, banner.color);
                }
                console.log(`📢 ${banner.text}`);
            }
        }, BannerData.interval);
        return { success: true };
    },

    // إيقاف التحديث التلقائي
    stop: function() {
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
        }
        return { success: true };
    }
};

// ====== تسجيل الخادم ======
window.servers = window.servers || {};
const tileId = window.location.hash.replace('#', '') || '1_0';
window.servers[tileId] = TileServer;

// ====== بدء التشغيل التلقائي ======
TileServer.start();

// ====== رسائل البداية ======
console.log(`✅ خادم الشريط (${tileId}) يعمل`);
console.log(`📢 عدد الرسائل: ${BannerData.messages.length}`);
console.log(`⏱️ التحديث كل ${BannerData.interval} مللي ثانية`);
console.log('');
console.log('📌 الأوامر المتاحة:');
console.log('  TileServer.getCurrentBanner() - الشريط الحالي');
console.log('  TileServer.getBannerList() - جميع الشرائط');
console.log('  TileServer.addBanner("نص", "#لون") - إضافة شريط');
console.log('  TileServer.removeBanner(0) - حذف شريط');
console.log('  TileServer.setInterval(5000) - تغيير السرعة');
console.log('  TileServer.toggle() - تشغيل/إيقاف');
console.log('  TileServer.start() - بدء التحديث');
console.log('  TileServer.stop() - إيقاف التحديث');
console.log('  TileServer.ping() - اختبار الاتصال');
