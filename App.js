// === ЛОГІКА ЧАСУ (з script.js) ===
function showTime() {
    document.getElementById('currentTime').innerHTML = new Date().toUTCString();
}
showTime();
setInterval(function () {
    showTime();
}, 1000);

// === ОСНОВНА ЛОГІКА ===
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_STORAGE = 500 * 1024 * 1024;
// !!! ЗМІНІТЬ НА СВІЙ TELEGRAM ID !!!
const ADMIN_ID = 'YOUR_TELEGRAM_ID'; 

let userData = {
    id: null,
    firstName: 'Пользователь',
    username: '@demo',
    isAdmin: false,
    level: 1,
    exp: 0,
    posts: [], // ID постів
    likes: 0,
    favorites: [], // ID обраних постів
    storageUsed: 0,
    warnings: 0,
    banned: false,
    hasSeenWelcome: false
};

let posts = []; // Повний список об'єктів постів
let selectedFile = null;

// Теми
const themes = {
    'winter': { 
        '--bg-primary': '#f0f4f8', '--bg-secondary': '#ffffff', '--bg-card': '#e3f2fd', 
        '--text-primary': '#03a9f4', '--text-secondary': '#546e7a', '--accent': '#29b6f6', 
        '--border': '#bbdefb', '--gradient': 'linear-gradient(135deg, #4fc3f7 0%, #03a9f4 100%)',
        '--text-on-accent': '#ffffff', 'emoji': '❄️' 
    },
    'autumn': { 
        '--bg-primary': '#2d2d2d', '--bg-secondary': '#3a3a3a', '--bg-card': '#4a4a4a', 
        '--text-primary': '#ff6b00', '--text-secondary': '#ffb366', '--accent': '#ff8533', 
        '--border': '#5c5c5c', '--gradient': 'linear-gradient(135deg, #ff6b00 0%, #ff3d00 100%)',
        '--text-on-accent': '#ffffff', 'emoji': '🍂'
    },
    'spring': { 
        '--bg-primary': '#f4f9f4', '--bg-secondary': '#ffffff', '--bg-card': '#e8f5e9', 
        '--text-primary': '#4caf50', '--text-secondary': '#66bb6a', '--accent': '#81c784', 
        '--border': '#c8e6c9', '--gradient': 'linear-gradient(135deg, #81c784 0%, #4caf50 100%)',
        '--text-on-accent': '#ffffff', 'emoji': '🌷'
    },
    'summer': { 
        '--bg-primary': '#fffde7', '--bg-secondary': '#ffffff', '--bg-card': '#fff8e1', 
        '--text-primary': '#ffeb3b', '--text-secondary': '#fbc02d', '--accent': '#ffc107', 
        '--border': '#fff9c4', '--gradient': 'linear-gradient(135deg, #ffc107 0%, #ffeb3b 100%)',
        '--text-on-accent': '#333333', 'emoji': '☀️'
    },
};

// ===================================================
// ФУНКЦІЇ ЗБЕРІГАННЯ ДАНИХ (Telegram CloudStorage)
// ===================================================

function saveData() {
    // Зберігаємо основні дані користувача
    tg.CloudStorage.setItem('gallery_user_data_' + userData.id, JSON.stringify({
        level: userData.level,
        exp: userData.exp,
        likes: userData.likes,
        favorites: userData.favorites,
        storageUsed: userData.storageUsed,
        posts: userData.posts,
        hasSeenWelcome: userData.hasSeenWelcome
    }), (error) => {
        if (error) console.error("Помилка збереження userData:", error);
    });
    
    // Зберігаємо всі пости
    tg.CloudStorage.setItem('gallery_posts_' + userData.id, JSON.stringify(posts), (error) => {
        if (error) console.error("Помилка збереження posts:", error);
    });
}

// ===================================================

// Ініціалізація та завантаження даних
function init() {
    const user = tg.initDataUnsafe.user;
    if (user) {
        userData.id = user.id;
        userData.firstName = user.first_name || 'Користувач';
        userData.username = user.username ? `@${user.username}` : '@user';
        userData.isAdmin = user.id.toString() === ADMIN_ID;

        document.getElementById('profileName').textContent = userData.firstName;
        document.getElementById('profileUsername').textContent = userData.username;
        document.getElementById('profileAvatar').textContent = userData.firstName.charAt(0).toUpperCase();

        if (userData.isAdmin) {
            document.getElementById('adminMusic').style.display = 'block';
        }
    }

    // --- ЗАВАНТАЖЕННЯ ДАНИХ З CloudStorage ---
    tg.CloudStorage.getItem('gallery_user_data_' + userData.id, (error, value) => {
        if (!error && value) {
            try {
                const loadedData = JSON.parse(value);
                if (loadedData) {
                    userData.level = loadedData.level || 1;
                    userData.exp = loadedData.exp || 0;
                    userData.likes = loadedData.likes || 0;
                    userData.favorites = loadedData.favorites || [];
                    userData.storageUsed = loadedData.storageUsed || 0;
                    userData.posts = loadedData.posts || [];
                    userData.hasSeenWelcome = loadedData.hasSeenWelcome || false;
                }
            } catch (e) {
                console.error("Помилка парсингу userData:", e);
            }
        }
        
        // Після завантаження userData, завантажуємо пости
        tg.CloudStorage.getItem('gallery_posts_' + userData.id, (error, value) => {
            if (!error && value) {
                 try {
                    const loadedPosts = JSON.parse(value);
                    if (Array.isArray(loadedPosts)) {
                         posts = loadedPosts;
                    }
                } catch (e) {
                    console.error("Помилка парсингу posts:", e);
                }
            }
            
            // Фіналізація і відображення UI
            changeTheme('winter');
            updateUI();
            filterPosts(); // Оновлення галереї після завантаження
            
            // Якщо користувач не бачив привітання, показуємо його
            if (!userData.hasSeenWelcome) {
                 document.getElementById('welcomeScreen').classList.remove('hidden');
            } else {
                 document.getElementById('welcomeScreen').classList.add('hidden');
            }
        });
    });
}

// Глобальні функції, які викликаються з HTML
function closeWelcome() {
    document.getElementById('welcomeScreen').classList.add('hidden');
    userData.hasSeenWelcome = true;
    saveData(); // Зберігаємо, що користувач бачив привітання
}

function switchPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const pageElement = document.getElementById(page + 'Page');
    const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);

    if (pageElement && navItem) {
        pageElement.classList.add('active');
        navItem.classList.add('active');
    }

    if (page === 'gallery') {
         filterPosts();
    } else if (page === 'favorites') {
        renderFavorites();
    }
}

function changeTheme(themeName) {
    const theme = themes[themeName];
    if (!theme) return;

    const root = document.documentElement.style;
    for (const key in theme) {
        if (key !== 'emoji') {
            root.setProperty(key, theme[key]);
        }
    }
    
    // Оновлення активної кнопки теми
    document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.theme-btn[onclick="changeTheme('${themeName}')"]`).classList.add('active');
    
    // Оновлення CSS стилю для body::before (емодзі)
    const styleElement = document.querySelector('link[rel="stylesheet"]').nextElementSibling || document.createElement('style');
    if (!styleElement.parentElement) {
        document.head.appendChild(styleElement);
    }
    styleElement.textContent = styleElement.textContent.replace(/content: '.*';/g, `content: '${theme.emoji}';`);
}

function openCreateModal() {
    document.getElementById('createModal').classList.add('active');
}

function closeCreateModal() {
    document.getElementById('createModal').classList.remove('active');
    document.getElementById('createPostForm').reset();
    document.getElementById('filePreview').style.display = 'none';
    document.getElementById('fileInfo').textContent = '';
    selectedFile = null;
}

function openViewModal(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    const isFavorite = userData.favorites.includes(postId);
    
    const content = `
        <div class="modal-header">
            <h2 class="modal-title">${post.description.substring(0, 30)}${post.description.length > 30 ? '...' : ''}</h2>
            <button class="close-btn" onclick="closeViewModal()">×</button>
        </div>
        <div style="margin-bottom: 20px;">
            ${post.fileType.startsWith('image') ? `<img src="${post.fileUrl}" style="width: 100%; border-radius: 10px;"/>` : `<video src="${post.fileUrl}" controls style="width: 100%; border-radius: 10px;"></video>`}
        </div>
        <p style="font-size: 16px; margin-bottom: 10px;">${post.description}</p>
        <p style="font-size: 14px; color: var(--text-primary); margin-bottom: 15px;">Хештеги: ${post.hashtags}</p>
        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #999;">
            <span>Автор: ${post.authorName}</span>
            <span>${post.date}</span>
        </div>
        <button class="submit-btn" style="margin-top: 20px;" onclick="toggleFavorite(${postId})">${isFavorite ? '⭐ В обраному' : '⭐ Додати в обране'}</button>
    `;
    
    document.getElementById('viewContent').innerHTML = content;
    document.getElementById('viewModal').classList.add('active');
}

function closeViewModal() {
     document.getElementById('viewModal').classList.remove('active');
}

function toggleFavorite(postId) {
    const index = userData.favorites.indexOf(postId);
    if (index > -1) {
        userData.favorites.splice(index, 1);
        tg.showPopup({message: 'Видалено з обраного!'});
    } else {
        userData.favorites.push(postId);
        tg.showPopup({message: 'Додано в обране!'});
    }
    updateUI();
    saveData();
    closeViewModal();
    if (document.getElementById('favoritesPage').classList.contains('active')) {
        renderFavorites();
    }
}

function renderPosts(postList, targetId) {
    const grid = document.getElementById(targetId);
    grid.innerHTML = '';
    
    if (postList.length === 0) {
         grid.innerHTML = targetId === 'postsGrid' 
            ? `<div class="empty-state"><div class="empty-state-icon">⛷️</div><div class="empty-state-text">Поки що немає публікацій. Додайте свій перший пост!</div></div>`
            : `<div class="empty-state"><div class="empty-state-icon">⭐</div><div class="empty-state-text">Немає обраних постів</div></div>`;
        return;
    }

    postList.forEach(post => {
        // Увага: URL.createObjectURL тимчасовий і може не працювати після перезапуску.
        const postElement = document.createElement('div');
        postElement.className = 'post-card';
        postElement.onclick = () => openViewModal(post.id);
        postElement.innerHTML = `
            <div class="post-actions">
                <button class="post-action-btn ${userData.favorites.includes(post.id) ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite(${post.id})">⭐</button>
            </div>
            ${post.fileType.startsWith('image') ? `<img class="post-media" src="${post.fileUrl}" alt="Пост">` : `<video class="post-media" src="${post.fileUrl}"></video>`}
            <div class="post-content">
                <p class="post-description">${post.description}</p>
                <div class="post-meta">
                    <span>❤️ ${post.likes}</span>
                    <span class="post-date">${post.date}</span>
                </div>
            </div>
        `;
        grid.appendChild(postElement);
    });
}

function filterPosts() {
    renderPosts(posts, 'postsGrid');
}

function renderFavorites() {
    const favoritePosts = posts.filter(p => userData.favorites.includes(p.id));
    renderPosts(favoritePosts, 'favoritesGrid');
}

function updateUI() {
    document.getElementById('userLevel').textContent = userData.level;
    document.getElementById('currentExp').textContent = userData.exp;
    document.getElementById('neededExp').textContent = userData.level * 100;
    
    const expProgress = userData.exp / (userData.level * 100);
    document.getElementById('levelFill').style.width = `${Math.min(100, expProgress * 100)}%`;
    
    const usedMB = (userData.storageUsed / 1024 / 1024).toFixed(2);
    const maxMB = (MAX_STORAGE / 1024 / 1024).toFixed(0);
    const percentage = (userData.storageUsed / MAX_STORAGE) * 100;

    document.getElementById('storageText').textContent = `${usedMB} МБ / ${maxMB} МБ`;
    document.getElementById('storageFill').style.width = `${Math.min(100, percentage)}%`;
    
    document.getElementById('postsCount').textContent = userData.posts.length;
    document.getElementById('likesCount').textContent = userData.likes;
    document.getElementById('favoritesCount').textContent = userData.favorites.length;
}

function toggleMusic() {
    const toggle = document.getElementById('musicToggle');
    const music = document.getElementById('bgMusic');
    
    if (toggle.classList.contains('active')) {
        toggle.classList.remove('active');
        music.pause();
        tg.showPopup({message: 'Музику вимкнено'});
    } else {
        toggle.classList.add('active');
        music.play().catch(e => console.error("Помилка відтворення музики:", e));
        tg.showPopup({message: 'Музику увімкнено (лише для демо)'});
    }
}

// Обробка форми створення посту
document.getElementById('createPostForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!selectedFile) {
        tg.showAlert('Будь ласка, виберіть файл!');
        return;
    }
    
    if (userData.storageUsed + selectedFile.size > MAX_STORAGE) {
        tg.showAlert('Перевищено ліміт сховища (500 МБ)!');
        return;
    }

    const description = document.getElementById('description').value;
    const hashtags = document.getElementById('hashtags').value;
    
    // Демо-пост
    const newPost = {
        id: posts.length + 1,
        authorId: userData.id,
        authorName: userData.firstName,
        description: description || 'Без опису',
        hashtags: hashtags || 'Без хештегів',
        // Увага: URL.createObjectURL тимчасовий!
        fileUrl: URL.createObjectURL(selectedFile), 
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        likes: Math.floor(Math.random() * 50),
        date: new Date().toLocaleDateString('uk-UA')
    };
    
    posts.unshift(newPost);
    userData.posts.push(newPost.id);
    userData.storageUsed += newPost.fileSize;
    userData.exp += 10;
    if (userData.exp >= userData.level * 100) {
        userData.level++;
        userData.exp = 0;
    }

    updateUI();
    filterPosts();
    closeCreateModal();
    saveData(); // ЗБЕРЕЖЕННЯ ДАНИХ
    tg.showPopup({message: 'Публікацію успішно створено!'});
});

// Обробка вибору файлу
document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const filePreview = document.getElementById('filePreview');
    const fileInfo = document.getElementById('fileInfo');
    selectedFile = null;
    filePreview.innerHTML = '';
    filePreview.style.display = 'none';

    if (file) {
        selectedFile = file;
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);

        if (file.size > MAX_FILE_SIZE) {
            fileInfo.textContent = `Файл завеликий: ${fileSizeMB} МБ (макс. 100 МБ)`;
            selectedFile = null;
            return;
        }
        
        fileInfo.textContent = `Вибрано: ${file.name} (${fileSizeMB} МБ)`;

        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            filePreview.appendChild(img);
            filePreview.style.display = 'block';
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.controls = true;
            filePreview.appendChild(video);
            filePreview.style.display = 'block';
        }
    } else {
        fileInfo.textContent = '';
    }
});

// Лічильник слів для опису
document.getElementById('description').addEventListener('input', function() {
    const text = this.value.trim();
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    document.getElementById('charCount').textContent = wordCount;
});

// Запуск
init();
