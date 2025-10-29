// Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

let currentUser = null;
const adminUsername = "@GreatTeacherOn1dzuka";
let allPosts = [];

// LocalStorage helpers
function savePosts() { localStorage.setItem('posts', JSON.stringify(allPosts)); }
function loadPostsFromStorage() { const data = localStorage.getItem('posts'); return data ? JSON.parse(data) : []; }

// Initialization
window.onload = () => {
  const user = tg.initDataUnsafe?.user;
  if(user){
    currentUser = {
      id: user.id,
      username: "@" + user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      avatar: user.photo_url || 'https://i.imgur.com/0y0y0y0.png'
    };
    document.getElementById('user-name').textContent = currentUser.firstName + (currentUser.lastName ? ' '+currentUser.lastName : '');
    document.getElementById('user-username').textContent = currentUser.username;
    document.getElementById('user-avatar').src = currentUser.avatar;
    if(currentUser.username === adminUsername){
      document.getElementById('admin-settings').style.display = 'block';
    }
  }
  allPosts = loadPostsFromStorage();
  showTab('main-menu');
  renderPosts(allPosts);
  renderFavorites();
};

// Tabs
function showTab(id){
  document.querySelectorAll('section').forEach(s=>s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active-tab'));
  const tab=document.getElementById('tab-'+id);
  if(tab) tab.classList.add('active-tab');
}

// Render posts
function renderPosts(posts){
  const container = document.getElementById('posts');
  container.innerHTML = '';
  posts.forEach(data => {
    const isAuthor = currentUser?.id === data.authorId;
    const isAdmin = currentUser?.username === adminUsername;
    const visibleLikes = isAuthor || isAdmin ? data.likes.map(l => l.username).join(", ") : "Скрыто";
    const mediaTag = data.mediaType === "video" 
      ? `<video src="${data.mediaUrl}" controls class="w-full rounded-lg mb-2"></video>` 
      : `<img src="${data.mediaUrl}" class="rounded-lg w-full mb-2"/>`;
    const likedByUser = data.likes.some(l => l.userId === currentUser.id);
    const favoritedByUser = data.favorites.includes(currentUser.id);

    let adminControls='';
    if(isAdmin){
      adminControls=`<div class="flex gap-2 mt-1">
      <button onclick="adminDeletePost(${data.id})" class="bg-red-600 px-2 py-1 rounded text-xs">Удалить</button>
      <button onclick="adminBanUser(${data.authorId})" class="bg-yellow-600 px-2 py-1 rounded text-xs">Бан</button>
      </div>`;
    }

    const postHTML=`<div class="card p-2">
      ${mediaTag}
      <p class="font-semibold">${data.title}</p>
      <p class="text-sm text-gray-300">${data.hashtags.map(h => "#"+h).join(" ")}</p>
      <div class="flex justify-between text-xs mt-1">
        <span class="like-btn" onclick="toggleLike(${data.id})">${likedByUser ? '💖':'🤍'} ${data.likes.length}</span>
        <span>${new Date(data.createdAt).toLocaleString()}</span>
        <span class="favorite-btn" onclick="toggleFavorite(${data.id})">${favoritedByUser ? '⭐':'☆'}</span>
      </div>
      <p class="text-xs text-gray-400">Лайкнули: ${visibleLikes}</p>
      ${adminControls}
    </div>`;
    container.insertAdjacentHTML('beforeend', postHTML);
  });
}

// Filter posts
function filterPosts(range){
  const now = new Date();
  let filtered = [];
  if(range==='day') filtered = allPosts.filter(p => new Date(p.createdAt) >= new Date(now.getTime()-24*60*60*1000));
  else if(range==='week') filtered = allPosts.filter(p => new Date(p.createdAt) >= new Date(now.getTime()-7*24*60*60*1000));
  else if(range==='month') filtered = allPosts.filter(p => new Date(p.createdAt) >= new Date(now.getTime()-30*24*60*60*1000));
  else if(range==='year') filtered = allPosts.filter(p => new Date(p.createdAt) >= new Date(now.getTime()-365*24*60*60*1000));
  renderPosts(filtered);
}

// Favorites
function renderFavorites(){
  const container = document.getElementById('favoritePosts');
  container.innerHTML = '';
  allPosts.filter(p => p.favorites.includes(currentUser.id)).forEach(data => {
    const mediaTag = data.mediaType === "video" 
      ? `<video src="${data.mediaUrl}" controls class="w-full rounded-lg mb-2"></video>` 
      : `<img src="${data.mediaUrl}" class="rounded-lg w-full mb-2"/>`;
    container.insertAdjacentHTML('beforeend', `<div class="card p-2">${mediaTag}<p class="font-semibold">${data.title}</p></div>`);
  });
}

// Toggle like
function toggleLike(postId){
  const post = allPosts.find(p => p.id === postId);
  if(!post) return;
  const liked = post.likes.some(l => l.userId === currentUser.id);
  if(liked) post.likes = post.likes.filter(l => l.userId !== currentUser.id);
  else post.likes.push({userId: currentUser.id, username: currentUser.username});
  savePosts();
  renderPosts(allPosts);
}

// Toggle favorite
function toggleFavorite(postId){
  const post = allPosts.find(p => p.id === postId);
  if(!post) return;
  const fav = post.favorites.includes(currentUser.id);
  if(fav) post.favorites = post.favorites.filter(id => id !== currentUser.id);
  else post.favorites.push(currentUser.id);
  savePosts();
  renderPosts(allPosts);
  renderFavorites();
}

// Create post
document.getElementById('createForm').addEventListener('submit', async e => {
  e.preventDefault();
  const title = e.target[0].value;
  const description = e.target[1].value;
  const file = e.target[2].files[0];
  const hashtags = e.target[3].value.split(" ").map(h => h.replace(/^#/,'')).filter(Boolean);
  if(!file) return alert("Выберите файл");

  const reader = new FileReader();
  reader.onload = function(evt){
    const mediaUrl = evt.target.result;
    const post = {
      id: Date.now(),
      authorId: currentUser.id,
      title,
      description,
      hashtags,
      mediaUrl,
      mediaType: file.type.startsWith("video") ? "video" : "image",
      createdAt: new Date().toISOString(),
      likes: [],
      favorites: []
    };
    allPosts.unshift(post);
    savePosts();
    renderPosts(allPosts);
    e.target.reset();
    showTab('gallery');
  };
  reader.readAsDataURL(file);
});

// Admin functions
function adminDeletePost(postId){
  if(!confirm("Удалить пост?")) return;
  if(!confirm("Точно удалить пост?")) return;
  allPosts = allPosts.filter(p => p.id !== postId);
  savePosts();
  renderPosts(allPosts);
}

function adminBanUser(userId){
  if(!confirm("Забанить пользователя?")) return;
  alert("Пользователь забанен (локально, просто уведомление)");
}

// Admin theme and music
function adminSetTheme(theme){
  document.body.style.backgroundImage=`url('themes/${theme}.jpg')`;
}

function adminSetMusic(event){
  const file=event.target.files[0];
  const audio=document.getElementById('bg-music')||new Audio();
  audio.src=URL.createObjectURL(file);
  audio.loop=true;
  audio.play();
  audio.id='bg-music';
  document.body.appendChild(audio);
  }
