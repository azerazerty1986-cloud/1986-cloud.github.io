/**
 * ==============================================
 * reels.js - نظام الريلز (استخدام داخلي فقط)
 * ناردو برو - نكهة وجمال 2026
 * ==============================================
 */

// =================== إعدادات القناة ===================
const TELEGRAM_CONFIG = {
    botToken: '8576673096:AAEFKd-YSJcW_0d_wAHZBt-5nPg_VOjDX_0',
    channelId: '-1003822964890',
    adminId: '7461896689',
    channelLink: 'https://t.me/c/1003822964890',
    apiUrl: 'https://api.telegram.org/bot',
    fileUrl: 'https://api.telegram.org/file/bot'
};

// =================== إعدادات التخزين ===================
const STORAGE_CONFIG = {
    maxVideoSize: 50 * 1024 * 1024,
    maxDuration: 60,
    supportedFormats: ['video/mp4', 'video/quicktime', 'video/x-msvideo']
};

// =================== متغيرات عامة ===================
let allReels = [];
let currentFilter = 'all';
let currentUser = null;
let lastUpdateId = 0;

// =================== تهيئة الصفحة ===================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 نظام الريلز يبدأ العمل...');
    console.log('✅ البوت:', 'azer1986_bot (مشرف على القناة)');
    console.log('✅ القناة:', '-1003822964890');
    
    await testSystemConnection();
    await loadReelsFromChannel();
    setupReelsUI();
    setInterval(loadReelsFromChannel, 60 * 1000);
    setTimeout(hideLoader, 2000);
});

// =================== اختبار اتصال النظام ===================
async function testSystemConnection() {
    try {
        // اختبار البوت
        const botResponse = await fetch(
            `${TELEGRAM_CONFIG.apiUrl}${TELEGRAM_CONFIG.botToken}/getMe`
        );
        const botData = await botResponse.json();
        
        if (botData.ok) {
            console.log('✅ البوت متصل:', botData.result.username);
        }
        
        // اختبار القناة
        const channelResponse = await fetch(
            `${TELEGRAM_CONFIG.apiUrl}${TELEGRAM_CONFIG.botToken}/getChat?chat_id=${TELEGRAM_CONFIG.channelId}`
        );
        const channelData = await channelResponse.json();
        
        if (channelData.ok) {
            console.log('✅ القناة متصلة:', channelData.result.title);
        }
        
    } catch (error) {
        console.error('❌ خطأ في الاتصال:', error.message);
    }
}

// =================== تحميل الريلز من القناة ===================
async function loadReelsFromChannel() {
    const track = document.getElementById('reelsTrack');
    if (!track) return;
    
    track.innerHTML = `
        <div class="reels-loader">
            <div class="loader-spinner-small"></div>
            <span>جاري تحميل الريلز من القناة...</span>
        </div>
    `;
    
    try {
        const response = await fetch(
            `${TELEGRAM_CONFIG.apiUrl}${TELEGRAM_CONFIG.botToken}/getUpdates?offset=${lastUpdateId}&limit=100`
        );
        
        const data = await response.json();
        
        if (!data.ok) {
            throw new Error(data.description);
        }
        
        const reels = [];
        
        for (const update of data.result) {
            if (update.update_id > lastUpdateId) {
                lastUpdateId = update.update_id;
            }
            
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
            console.log(`✅ تم تحميل ${reels.length} ريل من القناة`);
        } else {
            const cached = localStorage.getItem('cachedReels');
            if (cached) {
                allReels = JSON.parse(cached);
            } else {
                allReels = getMockReels();
            }
        }
        
        displayReels();
        
    } catch (error) {
        console.error('❌ خطأ في تحميل الريلز:', error.message);
        
        const cached = localStorage.getItem('cachedReels');
        if (cached) {
            allReels = JSON.parse(cached);
        } else {
            allReels = getMockReels();
        }
        
        displayReels();
    }
}

// =================== معالجة رسالة فيديو ===================
async function processVideoMessage(message) {
    const video = message.video;
    const caption = message.caption || '';
    
    const titleMatch = caption.match(/🎬 (.*?)(?:\n|$)/);
    const descMatch = caption.match(/📝 (.*?)(?:\n|$)/);
    const categoryMatch = caption.match(/🏷️ الفئة: (.*?)(?:\n|$)/);
    
    let thumbnail = '';
    if (video.thumbnail) {
        try {
            const fileResponse = await fetch(
                `${TELEGRAM_CONFIG.apiUrl}${TELEGRAM_CONFIG.botToken}/getFile?file_id=${video.thumbnail.file_id}`
            );
            const fileData = await fileResponse.json();
            if (fileData.ok) {
                thumbnail = `${TELEGRAM_CONFIG.fileUrl}${TELEGRAM_CONFIG.botToken}/${fileData.result.file_path}`;
            }
        } catch (error) {
            console.error('خطأ في جلب الصورة المصغرة:', error);
        }
    }
    
    return {
        id: `reel_${message.message_id}`,
        messageId: message.message_id,
        fingerprint: `${video.file_id}_${video.file_unique_id}`,
        title: titleMatch ? titleMatch[1].trim() : 'ريل بدون عنوان',
        description: descMatch ? descMatch[1].trim() : '',
        thumbnail: thumbnail || `https://via.placeholder.com/300x500/0a1a15/d4af37?text=ناردو`,
        videoFileId: video.file_id,
        views: message.views || 0,
        date: new Date(message.date * 1000).toISOString().split('T')[0],
        duration: video.duration || 30,
        category: extractCategory(categoryMatch, caption),
        tags: extractTags(caption),
        link: `${TELEGRAM_CONFIG.channelLink}/${message.message_id}`,
        source: 'telegram',
        sourceIcon: 'fab fa-telegram',
        sourceColor: '#0088cc'
    };
}

// =================== عرض الريلز ===================
function displayReels() {
    const track = document.getElementById('reelsTrack');
    if (!track) return;
    
    let reelsToShow = allReels;
    
    if (currentFilter !== 'all') {
        reelsToShow = allReels.filter(r => r.category === currentFilter);
    }
    
    if (reelsToShow.length === 0) {
        track.innerHTML = `
            <div class="no-reels-message">
                <i class="fas fa-film" style="font-size: 60px; color: var(--gold);"></i>
                <p>لا توجد ريلز في هذه الفئة</p>
                <button class="btn-gold" onclick="showUploadReelModal()">
                    <i class="fas fa-plus"></i> أضف أول ريل
                </button>
            </div>
        `;
        return;
    }
    
    let html = '';
    reelsToShow.forEach((reel, index) => {
        html += `
            <div class="reel-item" onclick="showReelModal(${index})">
                <div class="reel-thumbnail">
                    <img src="${reel.thumbnail}" alt="${reel.title}" loading="lazy">
                    <span class="reel-duration">${formatDuration(reel.duration)}</span>
                    <span class="reel-source" style="background: ${reel.sourceColor}">
                        <i class="${reel.sourceIcon}"></i>
                    </span>
                    ${reel.views > 0 ? `<span class="reel-views"><i class="fas fa-eye"></i> ${formatNumber(reel.views)}</span>` : ''}
                </div>
                <div class="reel-info">
                    <h4>${reel.title}</h4>
                    <div class="reel-meta">
                        <span><i class="fas fa-calendar"></i> ${reel.date}</span>
                        <span class="reel-category">${getCategoryIcon(reel.category)}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    track.innerHTML = html;
}

// =================== فتح نافذة الريل ===================
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
                    <source src="https://api.telegram.org/file/bot${TELEGRAM_CONFIG.botToken}/${reel.videoFileId}" type="video/mp4">
                </video>
            </div>
            
            <div class="reel-details">
                <div class="reel-header">
                    <h2>${reel.title}</h2>
                    <div class="reel-stats">
                        <span><i class="fas fa-eye"></i> ${formatNumber(reel.views)}</span>
                        <span><i class="fas fa-calendar"></i> ${reel.date}</span>
                        <span class="reel-category-badge">${getCategoryName(reel.category)}</span>
                    </div>
                </div>
                
                <div class="reel-description">
                    <p>${reel.description || 'لا يوجد وصف'}</p>
                </div>
                
                <div class="reel-tags">
                    ${reel.tags ? reel.tags.map(tag => `<span class="tag">#${tag}</span>`).join('') : ''}
                </div>
                
                <div class="reel-actions">
                    <a href="${reel.link}" target="_blank" class="btn-telegram">
                        <i class="fab fa-telegram"></i> مشاهدة على تلجرام
                    </a>
                    <button class="btn-share" onclick="copyLink('${reel.link}')">
                        <i class="fas fa-share-alt"></i> مشاركة
                    </button>
                </div>
            </div>
            
            <div class="reel-navigation">
                <button class="nav-reel prev" onclick="navigateReel('prev')" ${currentReelIndex === 0 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-right"></i> السابق
                </button>
                <button class="nav-reel next" onclick="navigateReel('next')" ${currentReelIndex === allReels.length - 1 ? 'disabled' : ''}>
                    التالي <i class="fas fa-chevron-left"></i>
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('reelViewModal').style.display = 'flex';
}

// =================== التنقل بين الريلز ===================
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

// =================== رفع ريل جديد إلى القناة ===================
async function uploadReelToChannel(videoFile, reelData) {
    const duration = await getVideoDuration(videoFile);
    
    if (duration > STORAGE_CONFIG.maxDuration) {
        alert(`المدة ${Math.round(duration)} ثانية. يجب أن لا تتجاوز دقيقة واحدة`);
        return false;
    }
    
    if (videoFile.size > STORAGE_CONFIG.maxVideoSize) {
        alert('حجم الفيديو كبير جداً (الحد الأقصى 50MB)');
        return false;
    }
    
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CONFIG.channelId);
    formData.append('video', videoFile);
    formData.append('caption', generateVideoCaption(reelData, duration));
    formData.append('parse_mode', 'HTML');
    formData.append('supports_streaming', 'true');
    
    try {
        const response = await fetch(
            `${TELEGRAM_CONFIG.apiUrl}${TELEGRAM_CONFIG.botToken}/sendVideo`,
            { method: 'POST', body: formData }
        );
        
        const result = await response.json();
        
        if (!result.ok) {
            throw new Error(result.description);
        }
        
        alert('✅ تم رفع الريل بنجاح إلى القناة!');
        await loadReelsFromChannel();
        return true;
        
    } catch (error) {
        console.error('❌ خطأ في الرفع:', error.message);
        alert('❌ فشل في رفع الريل: ' + error.message);
        return false;
    }
}

// =================== إنشاء كابشن الفيديو ===================
function generateVideoCaption(reelData, duration) {
    const tags = reelData.tags ? reelData.tags.split(',').map(t => `#${t.trim()}`).join(' ') : '';
    
    return `
🎬 <b>${reelData.title}</b>

📝 ${reelData.description || 'لا يوجد وصف'}

🏷️ الفئة: ${getCategoryEmoji(reelData.category)} ${getCategoryName(reelData.category)}
⏱️ المدة: ${Math.round(duration)} ثانية
📅 التاريخ: ${new Date().toLocaleDateString('ar-DZ')}

🔖 ${tags}

🛒 <b>ناردو برو - نكهة وجمال</b>
    `;
}

// =================== عرض نافذة رفع ريل ===================
function showUploadReelModal() {
    // هذه الدالة ستستدعى من onclick في HTML
    // لذلك يجب أن تكون معرفة على window أو في النطاق العام
    
    const modalHtml = `
        <div class="modal" id="uploadReelModal" onclick="if(event.target===this) closeModal('uploadReelModal')">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-cloud-upload-alt" style="color: var(--gold);"></i> رفع ريل جديد</h3>
                    <button class="close-btn" onclick="closeModal('uploadReelModal')">&times;</button>
                </div>
                
                <div class="channel-info" style="background: #1a2a25; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                    <i class="fab fa-telegram" style="color: #0088cc; font-size: 24px;"></i>
                    <span style="margin-right: 10px;">قناة: <strong>ناردو برو - ريلز</strong></span>
                </div>
                
                <div class="upload-area" id="uploadArea" 
                     ondragover="event.preventDefault()" 
                     ondrop="handleDrop(event)"
                     style="border: 2px dashed var(--gold); padding: 40px; text-align: center; border-radius: 10px; cursor: pointer;">
                    
                    <i class="fas fa-video" style="font-size: 60px; color: var(--gold);"></i>
                    <p style="margin: 20px 0;">اسحب وأفلت الفيديو هنا أو</p>
                    
                    <input type="file" id="videoFile" accept="video/*" style="display: none;" onchange="handleFileSelect(event)">
                    <button class="btn-gold" onclick="document.getElementById('videoFile').click()" type="button">
                        <i class="fas fa-upload"></i> اختر فيديو
                    </button>
                    
                    <div class="upload-hint" style="margin-top: 20px; color: #888; font-size: 14px;">
                        <p><i class="fas fa-clock"></i> المدة: دقيقة واحدة كحد أقصى</p>
                        <p><i class="fas fa-weight"></i> الحجم: 50MB كحد أقصى</p>
                    </div>
                </div>
                
                <div id="uploadForm" style="display: none; margin-top: 20px;">
                    <div class="video-preview" id="videoPreview" style="margin-bottom: 20px;"></div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-heading"></i> عنوان الريل</label>
                        <input type="text" id="reelTitle" class="form-control" maxlength="100" required>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-align-left"></i> وصف الريل</label>
                        <textarea id="reelDescription" class="form-control" rows="3" maxlength="500"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-tags"></i> الفئة</label>
                        <select id="reelCategory" class="form-control" required>
                            <option value="promo">🔥 برومسيون</option>
                            <option value="spices">🧂 توابل</option>
                            <option value="cosmetic">💄 كوسمتيك</option>
                            <option value="other">🎁 منتوجات أخرى</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-hashtag"></i> الوسوم</label>
                        <input type="text" id="reelTags" class="form-control" placeholder="بهارات, عروض, جديد">
                    </div>
                    
                    <div class="form-actions" style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn-gold" onclick="submitReelUpload()" style="flex: 2;">
                            <i class="fas fa-cloud-upload-alt"></i> رفع إلى القناة
                        </button>
                        <button class="btn-outline-gold" onclick="closeModal('uploadReelModal')" style="flex: 1;">
                            إلغاء
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer.firstElementChild);
}

// =================== معالجة اختيار ملف ===================
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) processSelectedFile(file);
}

function handleDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
        processSelectedFile(file);
    } else {
        alert('الرجاء اختيار ملف فيديو صالح');
    }
}

async function processSelectedFile(file) {
    if (!STORAGE_CONFIG.supportedFormats.includes(file.type)) {
        alert('صيغة الفيديو غير مدعومة');
        return;
    }
    
    if (file.size > STORAGE_CONFIG.maxVideoSize) {
        alert('حجم الفيديو كبير جداً (الحد الأقصى 50MB)');
        return;
    }
    
    const duration = await getVideoDuration(file);
    if (duration > STORAGE_CONFIG.maxDuration) {
        alert(`المدة ${Math.round(duration)} ثانية. يجب أن لا تتجاوز دقيقة واحدة`);
        return;
    }
    
    document.getElementById('uploadArea').style.display = 'none';
    document.getElementById('uploadForm').style.display = 'block';
    
    const preview = document.getElementById('videoPreview');
    const videoUrl = URL.createObjectURL(file);
    
    preview.innerHTML = `
        <video controls style="width: 100%; max-height: 300px; border-radius: 10px;">
            <source src="${videoUrl}" type="${file.type}">
        </video>
        <div style="display: flex; justify-content: space-between; margin-top: 10px; padding: 10px; background: #1a2a25; border-radius: 5px;">
            <span><i class="fas fa-clock"></i> المدة: ${formatDuration(duration)}</span>
            <span><i class="fas fa-weight"></i> الحجم: ${(file.size / (1024 * 1024)).toFixed(2)} MB</span>
        </div>
    `;
    
    window.selectedVideoFile = file;
    window.videoDuration = duration;
}

async function submitReelUpload() {
    const title = document.getElementById('reelTitle').value;
    if (!title) {
        alert('الرجاء إدخال عنوان الريل');
        return;
    }
    
    const reelData = {
        title: title,
        description: document.getElementById('reelDescription').value,
        category: document.getElementById('reelCategory').value,
        tags: document.getElementById('reelTags').value,
        uploadedBy: 'مستخدم'
    };
    
    const success = await uploadReelToChannel(window.selectedVideoFile, reelData);
    
    if (success) {
        closeModal('uploadReelModal');
    }
}

// =================== دوال مساعدة ===================
function getVideoDuration(file) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            URL.revokeObjectURL(video.src);
            resolve(video.duration);
        };
        video.onerror = () => resolve(60);
        video.src = URL.createObjectURL(file);
    });
}

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

function getCategoryEmoji(category) {
    const emojis = { 'promo': '🔥', 'spices': '🧂', 'cosmetic': '💄', 'other': '🎁' };
    return emojis[category] || '📹';
}

function getCategoryName(category) {
    const names = { 'promo': 'برومسيون', 'spices': 'توابل', 'cosmetic': 'كوسمتيك', 'other': 'أخرى' };
    return names[category] || category;
}

function getCategoryIcon(category) {
    const icons = { 'promo': '🔥', 'spices': '🧂', 'cosmetic': '💄', 'other': '🎁' };
    return icons[category] || '📹';
}

function extractCategory(categoryMatch, caption) {
    if (categoryMatch) {
        const cat = categoryMatch[1].trim();
        if (cat.includes('برومسيون')) return 'promo';
        if (cat.includes('توابل')) return 'spices';
        if (cat.includes('كوسمتيك')) return 'cosmetic';
    }
    
    if (caption.includes('#promo') || caption.includes('#برومسيون')) return 'promo';
    if (caption.includes('#spices') || caption.includes('#توابل')) return 'spices';
    if (caption.includes('#cosmetic') || caption.includes('#كوسمتيك')) return 'cosmetic';
    
    return 'other';
}

function extractTags(caption) {
    const hashtagRegex = /#(\w+)/g;
    const matches = caption.match(hashtagRegex);
    return matches ? matches.map(tag => tag.replace('#', '')) : [];
}

function getMockReels() {
    return [
        {
            id: 'reel_1',
            messageId: 1,
            title: 'عرض خاص على البهارات',
            description: 'تخفيضات تصل إلى 40% على جميع أنواع البهارات',
            thumbnail: 'https://via.placeholder.com/300x500/0a1a15/d4af37?text=بهارات',
            views: 15420,
            date: '2026-03-10',
            duration: 45,
            category: 'spices',
            source: 'telegram',
            sourceIcon: 'fab fa-telegram',
            sourceColor: '#0088cc'
        },
        {
            id: 'reel_2',
            messageId: 2,
            title: 'كريمات طبيعية للبشرة',
            description: 'مجموعة الكوسمتيك العضوية الطبيعية',
            thumbnail: 'https://via.placeholder.com/300x500/0a1a15/d4af37?text=كريمات',
            views: 23200,
            date: '2026-03-09',
            duration: 58,
            category: 'cosmetic',
            source: 'telegram',
            sourceIcon: 'fab fa-telegram',
            sourceColor: '#0088cc'
        }
    ];
}

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => { loader.style.display = 'none'; }, 500);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.remove();
    }
}

function copyLink(link) {
    navigator.clipboard.writeText(link);
    alert('تم نسخ الرابط');
}

function setupReelsUI() {
    // إضافة أزرار التصفية إذا لم تكن موجودة
    if (!document.querySelector('.reels-filter')) {
        const filterDiv = document.createElement('div');
        filterDiv.className = 'reels-filter';
        filterDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;';
        filterDiv.innerHTML = `
            <button class="btn-filter active" onclick="filterReels('all')">الكل</button>
            <button class="btn-filter" onclick="filterReels('promo')">🔥 برومسيون</button>
            <button class="btn-filter" onclick="filterReels('spices')">🧂 توابل</button>
            <button class="btn-filter" onclick="filterReels('cosmetic')">💄 كوسمتيك</button>
            <button class="btn-filter" onclick="filterReels('other')">🎁 أخرى</button>
        `;
        
        const container = document.querySelector('.reels-promo-bar .container');
        if (container) {
            container.insertBefore(filterDiv, container.querySelector('.reels-divider'));
        }
    }
}

function filterReels(category) {
    currentFilter = category;
    
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    displayReels();
}
