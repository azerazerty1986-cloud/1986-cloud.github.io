// ============================================================
// 📄 main.js - متحكم الشريط المتحرك
// ============================================================

// ====== عناصر الواجهة ======
const bar = document.getElementById('bar');
const status = document.getElementById('status');
const percent = document.getElementById('percent');

// ====== الحالة ======
let progress = 0;
let interval = null;
let running = false;

// ====== تشغيل الشريط ======
function startBar() {
    if (running) return;
    running = true;
    status.textContent = '▶️ جاري التحميل...';
    status.style.color = '#4ade80';
    
    interval = setInterval(() => {
        progress += 0.5;
        if (progress >= 100) {
            progress = 100;
            stopBar();
            status.textContent = '✅ اكتمل!';
            status.style.color = '#ffd700';
        }
        bar.style.width = progress + '%';
        percent.textContent = Math.round(progress) + '%';
    }, 50);
}

// ====== إيقاف الشريط ======
function stopBar() {
    running = false;
    if (interval) {
        clearInterval(interval);
        interval = null;
    }
    if (progress < 100) {
        status.textContent = '⏸️ متوقف';
        status.style.color = '#888';
    }
}

// ====== إعادة ضبط الشريط ======
function resetBar() {
    stopBar();
    progress = 0;
    bar.style.width = '0%';
    percent.textContent = '0%';
    status.textContent = '🔄 تم إعادة الضبط';
    status.style.color = '#fbbf24';
    setTimeout(() => {
        status.textContent = '⏸️ متوقف';
        status.style.color = '#888';
    }, 1000);
}

// ====== بدء تلقائي عند التحميل ======
setTimeout(startBar, 500);

// ====== تصدير للاستخدام الخارجي ======
window.startBar = startBar;
window.stopBar = stopBar;
window.resetBar = resetBar;

console.log('✅ main.js يعمل!');
console.log('📊 استخدم: startBar(), stopBar(), resetBar()');
