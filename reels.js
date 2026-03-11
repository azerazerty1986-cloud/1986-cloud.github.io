// ========== reels.js - نظام الريلز ==========

// 1️⃣ إعدادات القناة
const REELS_CONFIG = {
    botToken: '8576673096:AAEFKd-YSJcW_0d_wAHZBt-5nPg_VOjDX_0',
    channelId: '-1003822964890',
    channelLink: 'https://t.me/c/1003822964890',
    apiUrl: 'https://api.telegram.org/bot',
    fileUrl: 'https://api.telegram.org/file/bot'
};

// 2️⃣ متغيرات عامة
let allReels = [];
let currentFilter = 'all';
let lastUpdateId = 0;
let currentReelIndex = 0;
let isMuted = false;

// 3️⃣ تهيئة الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 نظام الريلز يبدأ العمل...');
    await loadReelsFromChannel();
    setupReelsUI();
    setInterval(loadReelsFromChannel, 60 * 1000);
});

// 4️⃣ تحميل الريلز من القناة
async function loadReelsFromChannel() {
    const track = document.getElementById('reelsTrack');
    if (!track) return;
    
    track.innerHTML = `<div class="reels-loader"><div class="loader-spinner-small"></div><span>جاري التحميل...</span></div>`;
    
    try {
        const response = await fetch(`${REELS_CONFIG.apiUrl}${REELS_CONFIG.botToken}/getUpdates?offset=${lastUpdateId}&limit=50`);
        const data = await response.json();
        
        if (!data.ok) throw new Error(data.description);
        
        const reels = [];
        
        for (const update of data.result) {
            if (update.update_id > lastUpdateId) lastUpdateId = update.update_id;
            
            const message = update.channel_post;
            if (message && message.video) {
                const reel = await processVideoMessage(message);
                reels.push(reel);
            }
        }
        
        reels.sort((a, b) => b.messageId - a.messageId);
        
        if (reels.length > 0) {
            allReels = reels;
            localStorage.setItem('cachedReels', JSON.stringify(reels));
        } else {
            const cached = localStorage.getItem('cachedReels');
            allReels = cached ? JSON.parse(cached) : getMockReels();
        }
        
        displayReels();
        
    } catch (error) {
        console.error('❌ خطأ:', error);
        const cached = localStorage.getItem('cachedReels');
        allReels = cached ? JSON.parse(cached) : getMockReels();
        displayReels();
    }
}

// 5️⃣ معالجة رسالة فيديو
async function processVideoMessage(message) {
    const video = message.video;
    const caption = message.caption || '';
    
    const titleMatch = caption.match(/🎬 (.*?)(?:\n|$)/);
    
    let thumbnail = '';
    if (video.thumbnail) {
        try {
            const fileResponse = await fetch(`${REELS_CONFIG.apiUrl}${REELS_CONFIG.botToken}/getFile?file_id=${video.thumbnail.file_id}`);
            const fileData = await fileResponse.json();
            if (fileData.ok) {
                thumbnail = `${REELS_CONFIG.fileUrl}${REELS_CONFIG.botToken}/${fileData.result.file_path}`;
            }
        } catch (error) {}
    }
    
    return {
        id: `reel_${message.message_id}`,
        messageId: message.message_id,
        title: titleMatch ? titleMatch[1].trim() : 'ريل بدون عنوان',
        thumbnail: thumbnail || 'https://via.placeholder.com/300x500/0a1a15/d4af37?text=ناردو',
        videoFileId: video.file_id,
        views: message.views || 0,
        date: new Date(message.date * 1000).toISOString().split('T')[0],
        duration: video.duration || 30,
        category: extractCategory(caption),
        link: `${REELS_CONFIG.channelLink}/${message.message_id}`
    };
}

// 6️⃣ استخراج الفئة
function extractCategory(caption) {
    if (caption.includes('#promo') || caption.includes('برومسيون')) return 'promo';
    if (caption.includes('#spices') || caption.includes('توابل')) return 'spices';
    if (caption.includes('#cosmetic') || caption.includes('كوسمتيك')) return 'cosmetic';
    return 'other';
}

// 7️⃣ عرض الريلز
function displayReels() {
    const track = document.getElementById('reelsTrack');
    if (!track) return;
    
    let reelsToShow = allReels;
    if (currentFilter !== 'all') {
        reelsToShow = allReels.filter(r => r.category === currentFilter);
    }
    
    if (reelsToShow.length === 0) {
        track.innerHTML = `<div class="no-reels-message"><i class="fas fa-film"></i><p>لا توجد ريلز</p></div>`;
        return;
    }
    
    track.innerHTML = reelsToShow.map((reel, index) => `
        <div class="reel-card" onclick="showReelModal(${index})">
            <div class="reel-thumbnail">
                <img src="${reel.thumbnail}" alt="${reel.title}" loading="lazy">
                <span class="reel-duration">${formatDuration(reel.duration)}</span>
                <div class="reel-play-overlay"><i class="fas fa-play"></i></div>
            </div>
            <div class="reel-info">
                <h4 class="reel-title">${reel.title}</h4>
                <div class="reel-meta">
                    <span><i class="fas fa-eye"></i> ${formatNumber(reel.views)}</span>
                    <span><i class="fas fa-calendar"></i> ${reel.date}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// 8️⃣ فتح نافذة الريل
function showReelModal(index) {
    const reel = allReels[index];
    if (!reel) return;
    
    currentReelIndex = index;
    
    const modalContent = document.getElementById('reelViewContent');
    if (!modalContent) return;
    
    reel.views += 1;
    
    modalContent.innerHTML = `
        <div class="reel-viewer">
            <div class="reel-video-container">
                <video controls autoplay poster="${reel.thumbnail}">
                    <source src="https://api.telegram.org/file/bot${REELS_CONFIG.botToken}/${reel.videoFileId}" type="video/mp4">
                </video>
            </div>
            <div class="reel-details">
                <h2>${reel.title}</h2>
                <div class="reel-stats">
                    <span><i class="fas fa-eye"></i> ${formatNumber(reel.views)}</span>
                    <span><i class="fas fa-calendar"></i> ${reel.date}</span>
                </div>
                <a href="${reel.link}" target="_blank" class="btn-telegram">مشاهدة على تلجرام</a>
            </div>
            <div class="reel-navigation">
                <button class="nav-reel prev" onclick="navigateReel('prev')" ${currentReelIndex === 0 ? 'disabled' : ''}>السابق</button>
                <button class="nav-reel next" onclick="navigateReel('next')" ${currentReelIndex === allReels.length - 1 ? 'disabled' : ''}>التالي</button>
            </div>
        </div>
    `;
    
    document.getElementById('reelViewModal').style.display = 'flex';
}

// 9️⃣ التنقل بين الريلز
function navigateReel(direction) {
    if (direction === 'prev' && currentReelIndex > 0) {
        currentReelIndex--;
    } else if (direction === 'next' && currentReelIndex < allReels.length - 1) {
        currentReelIndex++;
    } else {
        return;
    }
    showReelModal(currentReelIndex);
}

// 🔟 دوال مساعدة
function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// 1️⃣1️⃣ تمرير الريلز
function scrollReels(direction) {
    const track = document.getElementById('reelsTrack');
    const scrollAmount = 300;
    if (direction === 'left') {
        track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
        track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
}

// 1️⃣2️⃣ إعداد واجهة الريلز
function setupReelsUI() {
    const filterDiv = document.createElement('div');
    filterDiv.className = 'reels-filter';
    filterDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;';
    filterDiv.innerHTML = `
        <button class="btn-filter active" onclick="filterReels('all')">الكل</button>
        <button class="btn-filter" onclick="filterReels('promo')">🔥 برومسيون</button>
        <button class="btn-filter" onclick="filterReels('spices')">🧂 توابل</button>
        <button class="btn-filter" onclick="filterReels('cosmetic')">💄 كوسمتيك</button>
    `;
    
    const container = document.querySelector('.reels-promo-bar .container');
    if (container) {
        container.insertBefore(filterDiv, container.querySelector('.reels-scroll-container'));
    }
}

// 1️⃣3️⃣ تصفية الريلز
function filterReels(category) {
    currentFilter = category;
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    displayReels();
}

// 1️⃣4️⃣ بيانات تجريبية
function getMockReels() {
    return [
        {
            id: 'reel_1', messageId: 1, title: 'عرض خاص على البهارات',
            thumbnail: 'https://via.placeholder.com/300x500/0a1a15/d4af37?text=بهارات',
            views: 15000, date: '2026-03-10', duration: 45, category: 'spices'
        },
        {
            id: 'reel_2', messageId: 2, title: 'كريمات طبيعية للبشرة',
            thumbnail: 'https://via.placeholder.com/300x500/0a1a15/d4af37?text=كريمات',
            views: 23000, date: '2026-03-09', duration: 58, category: 'cosmetic'
        }
    ];
}

// 1️⃣5️⃣ إغلاق النافذة
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}
