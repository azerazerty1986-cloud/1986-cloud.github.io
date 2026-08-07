// ============================================================
// 🧪 خادم تجريبي - test_server.js
// ============================================================

console.log('🧪 بدء تشغيل الخادم التجريبي...');

// ====== الخادم الرئيسي ======
const TestServer = {
    // البيانات
    data: [],
    requests: 0,
    startTime: Date.now(),
    isRunning: false,
    
    // ====== بدء الخادم ======
    start: function() {
        if (this.isRunning) {
            console.log('⚠️ الخادم يعمل بالفعل');
            return this;
        }
        
        this.isRunning = true;
        this.startTime = Date.now();
        
        console.log('✅ تم تشغيل الخادم التجريبي بنجاح');
        console.log(`📅 وقت البدء: ${new Date().toLocaleString()}`);
        
        // ====== مهام الخادم ======
        
        // 1. إضافة بيانات كل 10 ثواني
        this.interval1 = setInterval(() => {
            this.requests++;
            const entry = {
                id: this.requests,
                time: new Date().toISOString(),
                type: 'auto_generated',
                data: `طلب رقم ${this.requests}`
            };
            this.data.push(entry);
            this.saveData();
            console.log(`📊 تم إضافة بيانات جديدة (${this.requests})`);
        }, 10000);
        
        // 2. عرض إحصائيات كل 30 ثانية
        this.interval2 = setInterval(() => {
            console.log(`📈 الإحصائيات:`);
            console.log(`   - عدد الطلبات: ${this.requests}`);
            console.log(`   - عدد السجلات: ${this.data.length}`);
            console.log(`   - وقت التشغيل: ${this.getUptime()}`);
        }, 30000);
        
        // 3. حفظ البيانات عند الإغلاق
        window.addEventListener('beforeunload', () => {
            this.stop();
        });
        
        return this;
    },
    
    // ====== إيقاف الخادم ======
    stop: function() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        clearInterval(this.interval1);
        clearInterval(this.interval2);
        
        console.log('⏹️ تم إيقاف الخادم التجريبي');
        console.log(`📊 الإحصائيات النهائية:`);
        console.log(`   - إجمالي الطلبات: ${this.requests}`);
        console.log(`   - إجمالي السجلات: ${this.data.length}`);
        console.log(`   - وقت التشغيل: ${this.getUptime()}`);
        
        this.saveData();
    },
    
    // ====== حفظ البيانات ======
    saveData: function() {
        try {
            const data = {
                requests: this.requests,
                data: this.data,
                lastSave: Date.now()
            };
            localStorage.setItem('test_server_data', JSON.stringify(data));
        } catch(e) {
            console.error('❌ فشل حفظ البيانات:', e);
        }
    },
    
    // ====== تحميل البيانات ======
    loadData: function() {
        try {
            const raw = localStorage.getItem('test_server_data');
            if (raw) {
                const data = JSON.parse(raw);
                this.requests = data.requests || 0;
                this.data = data.data || [];
                console.log(`📂 تم تحميل ${this.data.length} سجل`);
                return true;
            }
        } catch(e) {
            console.error('❌ فشل تحميل البيانات:', e);
        }
        return false;
    },
    
    // ====== وقت التشغيل ======
    getUptime: function() {
        const ms = Date.now() - this.startTime;
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    },
    
    // ====== إضافة بيانات يدوياً ======
    addData: function(customData) {
        this.requests++;
        const entry = {
            id: this.requests,
            time: new Date().toISOString(),
            type: 'manual',
            data: customData || `بيانات يدوية ${this.requests}`
        };
        this.data.push(entry);
        this.saveData();
        console.log(`📝 تم إضافة بيانات يدوية (${this.requests})`);
        return entry;
    },
    
    // ====== عرض جميع البيانات ======
    getAllData: function() {
        return {
            totalRequests: this.requests,
            totalRecords: this.data.length,
            uptime: this.getUptime(),
            data: this.data
        };
    },
    
    // ====== تصدير البيانات ======
    exportData: function() {
        const allData = this.getAllData();
        console.log('📤 تصدير البيانات:');
        console.log(JSON.stringify(allData, null, 2));
        return allData;
    },
    
    // ====== مسح البيانات ======
    clearData: function() {
        if (!confirm('🗑️ هل أنت متأكد من مسح جميع البيانات؟')) return;
        this.data = [];
        this.requests = 0;
        this.saveData();
        console.log('🗑️ تم مسح جميع البيانات');
    }
};

// ====== تحميل البيانات السابقة ======
TestServer.loadData();

// ====== بدء الخادم تلقائياً ======
TestServer.start();

// ====== إضافة بيانات تجريبية ======
setTimeout(() => {
    TestServer.addData('بيانات تجريبية من بدء التشغيل');
}, 2000);

setTimeout(() => {
    TestServer.addData('مرحباً! هذا خادم تجريبي يعمل');
}, 5000);

// ====== دوال مساعدة للاستخدام من الكونسول ======
console.log('🧪 الخادم التجريبي جاهز!');
console.log('📋 الأوامر المتاحة:');
console.log('  - TestServer.addData("نص")  → إضافة بيانات');
console.log('  - TestServer.getAllData()   → عرض جميع البيانات');
console.log('  - TestServer.exportData()   → تصدير البيانات');
console.log('  - TestServer.clearData()    → مسح البيانات');
console.log('  - TestServer.stop()         → إيقاف الخادم');
console.log('  - TestServer.start()        → تشغيل الخادم');

// تصدير للاستخدام
window.TestServer = TestServer;

console.log('✅ تم تحميل الخادم التجريبي بنجاح!');
