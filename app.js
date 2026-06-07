// ==========================================================================
// FIREBASE CONFIGURATION (請在下方填入您的 Firebase 申請金鑰)
// ==========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyAHSREfWO3zg65eL2P_EFHMefsw2sSzs_Q",
    authDomain: "teacherstudy-109ef-f811b.firebaseapp.com",
    databaseURL: "https://teacherstudy-109ef-f811b-default-rtdb.firebaseio.com",
    projectId: "teacherstudy-109ef-f811b",
    storageBucket: "teacherstudy-109ef-f811b.firebasestorage.app",
    messagingSenderId: "864414214469",
    appId: "1:864414214469:web:dcd72328de2aa6c41db62c"
};

// Check if user has updated placeholder config
const isFirebasePlaceholder = firebaseConfig.apiKey === "YOUR_API_KEY" || firebaseConfig.databaseURL.includes("YOUR_PROJECT_ID");

// Initialize Firebase Realtime Database
let database = null;
let booksRef = null;
if (!isFirebasePlaceholder) {
    try {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        booksRef = database.ref('books');
    } catch (e) {
        console.error("Firebase 初始化失敗，請檢查金鑰設定！", e);
    }
}

// LocalStorage keys for session
const STORAGE_KEYS = {
    STUDENT_SESSION: 'ls_collective_student_session',
    TEACHER_MODE: 'ls_collective_teacher_mode'
};

// Application State
let currentStudent = null;
let books = [];
let filteredBooks = [];
let isTeacherMode = false;

// Pre-defined spine colors (elegant book colors)
const SPINE_COLORS = [
    { bg: '#8b1e0f', text: '#f5f0eb' }, // Deep Crimson
    { bg: '#1c3d27', text: '#f5f0eb' }, // Forest Green
    { bg: '#15325b', text: '#f5f0eb' }, // Prussian Blue
    { bg: '#4e284f', text: '#f5f0eb' }, // Eggplant Purple
    { bg: '#725225', text: '#ffd700' }, // Antique Gold/Brown
    { bg: '#0b4d53', text: '#f5f0eb' }, // Teal
    { bg: '#cc5a14', text: '#f5f0eb' }, // Terracotta
    { bg: '#2f3b42', text: '#f5f0eb' }, // Charcoal Slate
    { bg: '#8c701b', text: '#ffffff' }, // Olive Bronze
    { bg: '#5d3f6a', text: '#f5f0eb' }  // Dusty Plum
];

// Initialize the Application
window.addEventListener('DOMContentLoaded', () => {
    // 1. Check if student is logged in from session
    loadStudentSession();
    
    // 2. Check if Teacher Mode was previously unlocked in this browser session
    isTeacherMode = sessionStorage.getItem(STORAGE_KEYS.TEACHER_MODE) === 'true';

    // 3. Setup modal background close event handlers
    setupModalBackgroundClose();

    // 4. Character counter for reflection textarea
    const textarea = document.getElementById('bookReflection');
    textarea.addEventListener('input', () => {
        document.getElementById('charCount').textContent = textarea.value.length;
    });

    // 5. Setup Date Picker auto-popup
    const dateInput = document.getElementById('bookDate');
    dateInput.addEventListener('click', function() {
        try {
            if (typeof this.showPicker === 'function') {
                this.showPicker();
            }
        } catch (e) {
            console.log('showPicker not supported', e);
        }
    });

    // 6. Refresh student UI state
    updateStudentSessionBadge();

    // 7. Initialize dynamic calendar in header center
    initHeaderCalendar();

    // 8. Connect to cloud database or load offline fallback mock data
    if (isFirebasePlaceholder) {
        books = getCollectiveSampleBooks();
        filteredBooks = [...books];
        updateStats();
        populateClassFilters();
        filterBooks();
        
        setTimeout(() => {
            alert("【系統提示】目前使用的是「離線展示模式」。\n\n如果您需要進行「全自動雲端即時同步」，請參考同目錄下的「firebase-setup-guide.md」教學檔案，申請一個免費的 Google Firebase 資料庫，並將產生的 API 金鑰填寫至 app.js 檔案最上方的 firebaseConfig 中！");
        }, 1000);
    } else {
        // Subscribe to real-time events from Firebase
        subscribeToFirebaseBooks();
    }
});

// Subscribe to real-time events from Firebase Realtime Database
function subscribeToFirebaseBooks() {
    if (!booksRef) return;
    
    booksRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Convert Firebase key-value object to array
            books = Object.keys(data).map(key => {
                return {
                    id: key, // Use Firebase generated unique key as ID
                    ...data[key]
                };
            });
        } else {
            // If database is completely empty on Firebase, initialize it with sample books
            books = getCollectiveSampleBooks();
            saveBooksToFirebase();
        }
        filteredBooks = [...books];
        updateStats();
        populateClassFilters();
        filterBooks(); // This will trigger renderBookcase()
    }, (error) => {
        console.error("Firebase 讀取權限錯誤，請確認 Realtime Database 的安全規則已設為公開！", error);
        showToast("雲端資料讀取失敗，請聯絡系統管理員！");
    });
}

// Bulk save current local array to Firebase
function saveBooksToFirebase() {
    if (!booksRef) return;
    const booksMap = {};
    books.forEach(b => {
        booksMap[b.id] = b;
    });
    booksRef.set(booksMap);
}

// Initialize Header Calendar Widget
function initHeaderCalendar() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const date = String(today.getDate()).padStart(2, '0');
    
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekdayText = weekdays[today.getDay()];

    const monthYearEl = document.getElementById('calMonthYear');
    const dayEl = document.getElementById('calDay');
    const weekdayEl = document.getElementById('calWeekday');

    if (monthYearEl) monthYearEl.textContent = `${year}年${month}月`;
    if (dayEl) dayEl.textContent = date;
    if (weekdayEl) weekdayEl.textContent = weekdayText;
}

// Load student session from LocalStorage
function loadStudentSession() {
    const data = localStorage.getItem(STORAGE_KEYS.STUDENT_SESSION);
    if (data) {
        try {
            currentStudent = JSON.parse(data);
        } catch (e) {
            console.error('解析登記學生資料失敗', e);
            currentStudent = null;
        }
    }
}

// Save student session to LocalStorage
function saveStudentSession() {
    localStorage.setItem(STORAGE_KEYS.STUDENT_SESSION, JSON.stringify(currentStudent));
}

// Update Header student badge based on session state
function updateStudentSessionBadge() {
    const badge = document.getElementById('userInfoBadge');
    const detailsText = document.getElementById('userDetailsText');
    const btnAction = document.getElementById('btnUserAction');
    
    if (currentStudent) {
        badge.classList.remove('guest-mode');
        detailsText.innerHTML = `
            <div class="user-status-label">👤 登記人：${currentStudent.class}班 ${String(currentStudent.seat).padStart(2, '0')}號</div>
            <div class="user-status-sub">姓名：${currentStudent.name} (點此切換)</div>
        `;
        btnAction.textContent = '🔄';
        btnAction.title = '切換學生身分';
    } else {
        badge.classList.add('guest-mode');
        detailsText.innerHTML = `
            <div class="user-status-label">👤 登記學生：未登入</div>
            <div class="user-status-sub">(點此登入以登記書籍)</div>
        `;
        btnAction.textContent = '🔑';
        btnAction.title = '登入學生身分';
    }
}

// Handle Student Session click (Toggle/Prompt login)
function promptStudentLogin() {
    if (currentStudent) {
        // Logged in: open login form pre-populated to allow easy modification or logout
        document.getElementById('studentClass').value = currentStudent.class;
        document.getElementById('studentSeat').value = currentStudent.seat;
        document.getElementById('studentName').value = currentStudent.name;
        
        // Add a logout button in form if it doesn't exist yet
        let loginForm = document.getElementById('studentLoginForm');
        let logoutBtn = document.getElementById('btnStudentLogout');
        if (!logoutBtn) {
            logoutBtn = document.createElement('button');
            logoutBtn.type = 'button';
            logoutBtn.id = 'btnStudentLogout';
            logoutBtn.className = 'btn btn-danger btn-block';
            logoutBtn.style.marginTop = '0.5rem';
            logoutBtn.textContent = '登出目前身分';
            logoutBtn.onclick = handleStudentLogout;
            loginForm.appendChild(logoutBtn);
        }
    } else {
        document.getElementById('studentLoginForm').reset();
        const logoutBtn = document.getElementById('btnStudentLogout');
        if (logoutBtn) logoutBtn.remove();
    }
    openModal('studentLoginModal');
}

// Student Login Form Submission
function handleStudentLogin(event) {
    event.preventDefault();
    const classVal = document.getElementById('studentClass').value.trim();
    const seatVal = parseInt(document.getElementById('studentSeat').value);
    const nameVal = document.getElementById('studentName').value.trim();

    if (!classVal || !seatVal || !nameVal) {
        showToast('請完整填寫所有欄位！');
        return;
    }

    currentStudent = {
        class: classVal,
        seat: seatVal,
        name: nameVal
    };

    saveStudentSession();
    updateStudentSessionBadge();
    closeModal('studentLoginModal');
    showToast(`學生 ${nameVal} 登入成功！已切換登記身分。`);
}

// Student Logout Handler
function handleStudentLogout() {
    currentStudent = null;
    localStorage.removeItem(STORAGE_KEYS.STUDENT_SESSION);
    updateStudentSessionBadge();
    closeModal('studentLoginModal');
    showToast('已登出學生登記身分。目前處於訪客瀏覽模式。');
}

// Handle "Register Book" button click
function handleRegisterBookClick() {
    if (!currentStudent) {
        showToast('請先登入學生登記身分！');
        promptStudentLogin();
        return;
    }
    
    // Populate readonly student badge in form
    document.getElementById('formStudentBadge').textContent = 
        `${currentStudent.class}班 ${String(currentStudent.seat).padStart(2, '0')}號 ${currentStudent.name}`;
    
    // Open Add Modal
    document.getElementById('modalTitle').textContent = '登記閱讀書籍';
    document.getElementById('editBookId').value = '';
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('bookDate').value = today;
    
    // Reset mood selector
    document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById('selectedMoodEmoji').value = '';
    document.getElementById('selectedMoodText').value = '';
    document.getElementById('customMoodEmoji').value = '';
    document.getElementById('customMoodText').value = '';
    
    setRating('');
    document.getElementById('bookForm').reset();
    document.getElementById('charCount').textContent = '0';
    
    openModal('bookModal');
}

// Stats Calculation & Leaderboard Rendering
function updateStats() {
    document.getElementById('statTotalBooks').textContent = `${books.length} 本`;

    // Count unique participating students (combination of class + seat + name)
    const uniqueStudents = new Set();
    books.forEach(b => {
        uniqueStudents.add(`${b.studentClass}_${b.studentSeat}_${b.studentName}`);
    });
    document.getElementById('statTotalStudents').textContent = `${uniqueStudents.size} 人`;

    // Initialize leaderboard statistics
    const studentCounts = {};
    const classCounts = {};
    const moodCounts = {};

    books.forEach(b => {
        // 1. Individual Leaderboard Stats
        const stdKey = `${b.studentClass}_${b.studentSeat}_${b.studentName}`;
        if (!studentCounts[stdKey]) {
            studentCounts[stdKey] = {
                class: b.studentClass,
                seat: b.studentSeat,
                name: b.studentName,
                count: 0
            };
        }
        studentCounts[stdKey].count++;

        // 2. Class Leaderboard Stats
        if (b.studentClass) {
            classCounts[b.studentClass] = (classCounts[b.studentClass] || 0) + 1;
        }

        // 3. Mood Stats
        const moodKey = `${b.moodEmoji} ${b.moodText}`;
        moodCounts[moodKey] = (moodCounts[moodKey] || 0) + 1;
    });

    // Most active class calculation
    if (books.length === 0) {
        document.getElementById('statTopClass').textContent = '無';
        document.getElementById('statTopMood').textContent = '無';
    } else {
        // Top Class
        let topClass = '無';
        let maxClassCount = 0;
        for (const [cls, count] of Object.entries(classCounts)) {
            if (count > maxClassCount) {
                maxClassCount = count;
                topClass = `${cls} 班`;
            }
        }
        document.getElementById('statTopClass').textContent = topClass;

        // Top Mood
        let topMood = '無';
        let maxMoodCount = 0;
        for (const [mood, count] of Object.entries(moodCounts)) {
            if (count > maxMoodCount) {
                maxMoodCount = count;
                topMood = mood;
            }
        }
        document.getElementById('statTopMood').textContent = topMood;
    }

    // --- RENDER LEADERBOARDS ---
    
    // A. Render Personal Leaderboard (個人閱讀王)
    const personalContainer = document.getElementById('personalLeaderboard');
    if (personalContainer) {
        personalContainer.innerHTML = '';
        
        // Convert map to array and sort descending by count, then class/seat ascending
        const sortedStudents = Object.values(studentCounts).sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            const classCompare = String(a.class).localeCompare(String(b.class), 'zh-hant', { numeric: true });
            if (classCompare !== 0) return classCompare;
            return a.seat - b.seat;
        });

        if (sortedStudents.length === 0) {
            personalContainer.innerHTML = '<li class="leaderboard-empty">目前尚無閱讀成果 📖</li>';
        } else {
            // Get Top 3
            const topThreeStudents = sortedStudents.slice(0, 3);
            topThreeStudents.forEach((std, index) => {
                const li = document.createElement('li');
                li.className = 'leaderboard-item';
                const rank = index + 1;
                const classSeatLabel = `${std.class}班 ${String(std.seat).padStart(2, '0')}號`;
                
                li.innerHTML = `
                    <div class="leaderboard-rank-info">
                        <span class="rank-badge rank-${rank}">${rank}</span>
                        <span class="leaderboard-item-name">${classSeatLabel} <span class="highlight-rank-name">${std.name}</span></span>
                    </div>
                    <span class="leaderboard-count-badge">${std.count} 本</span>
                `;
                personalContainer.appendChild(li);
            });
        }
    }

    // B. Render Class Leaderboard (班級閱讀王)
    const classContainer = document.getElementById('classLeaderboard');
    if (classContainer) {
        classContainer.innerHTML = '';

        // Convert map to array and sort descending by count, then class ascending
        const sortedClasses = Object.entries(classCounts).map(([cls, count]) => {
            return { class: cls, count: count };
        }).sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            return String(a.class).localeCompare(String(b.class), 'zh-hant', { numeric: true });
        });

        if (sortedClasses.length === 0) {
            classContainer.innerHTML = '<li class="leaderboard-empty">目前尚無閱讀成果 🏫</li>';
        } else {
            // Get Top 3
            const topThreeClasses = sortedClasses.slice(0, 3);
            topThreeClasses.forEach((cls, index) => {
                const li = document.createElement('li');
                li.className = 'leaderboard-item';
                const rank = index + 1;
                
                li.innerHTML = `
                    <div class="leaderboard-rank-info">
                        <span class="rank-badge rank-${rank}">${rank}</span>
                        <span class="leaderboard-item-name highlight-rank-name">${cls.class} 班</span>
                    </div>
                    <span class="leaderboard-count-badge">${cls.count} 本</span>
                `;
                classContainer.appendChild(li);
            });
        }
    }
}

// Populate Class filters dynamically based on existing database classes
function populateClassFilters() {
    const classFilterSelect = document.getElementById('classFilter');
    const reportClassSelect = document.getElementById('reportClassSelect');
    
    // Save current values to restore them if possible
    const prevFilterVal = classFilterSelect.value;
    const prevReportVal = reportClassSelect ? reportClassSelect.value : 'all';
    
    // Extract unique classes
    const classes = new Set();
    books.forEach(b => {
        if (b.studentClass) classes.add(b.studentClass);
    });
    
    // Sort classes alphanumeric (e.g. 901, 902, 913)
    const sortedClasses = Array.from(classes).sort((a, b) => String(a).localeCompare(String(b), 'zh-hant', { numeric: true }));
    
    // Reset options but keep "All"
    classFilterSelect.innerHTML = '<option value="all">所有班級</option>';
    if (reportClassSelect) {
        reportClassSelect.innerHTML = '<option value="all">全體班級</option>';
    }
    
    sortedClasses.forEach(cls => {
        // For filter select
        const opt = document.createElement('option');
        opt.value = cls;
        opt.textContent = `${cls} 班`;
        classFilterSelect.appendChild(opt);
        
        // For report select
        if (reportClassSelect) {
            const optRep = document.createElement('option');
            optRep.value = cls;
            optRep.textContent = `${cls} 班`;
            reportClassSelect.appendChild(optRep);
        }
    });
    
    // Restore previous selections if they still exist
    if (sortedClasses.includes(prevFilterVal)) {
        classFilterSelect.value = prevFilterVal;
    } else {
        classFilterSelect.value = 'all';
    }
    
    if (reportClassSelect) {
        if (prevReportVal === 'all' || sortedClasses.includes(prevReportVal)) {
            reportClassSelect.value = prevReportVal;
        } else {
            reportClassSelect.value = 'all';
        }
    }
}

// Modals Management
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    
    if (modalId === 'bookModal') {
        document.getElementById('bookForm').reset();
        document.getElementById('editBookId').value = '';
        document.getElementById('selectedMoodEmoji').value = '';
        document.getElementById('selectedMoodText').value = '';
        document.getElementById('charCount').textContent = '0';
        document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('selected'));
    }
}

function setupModalBackgroundClose() {
    const overlays = document.querySelectorAll('.modal-overlay');
    overlays.forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal(overlay.id);
            }
        });
    });
}

// Toast Notifications
function showToast(message, duration = 3500) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('active');
    setTimeout(() => {
        toast.classList.remove('active');
    }, duration);
}

// Mood Picker Helpers
function selectMood(emoji, text = '') {
    document.getElementById('customMoodEmoji').value = '';
    document.getElementById('customMoodText').value = '';

    if (!text) {
        const moodMap = {
            '😊': '充實',
            '🤯': '震撼',
            '😢': '感動',
            '🤔': '啟發',
            '😍': '超推',
            '🥱': '乏味'
        };
        text = moodMap[emoji] || '其他';
    }

    document.getElementById('selectedMoodEmoji').value = emoji;
    document.getElementById('selectedMoodText').value = text;

    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.getAttribute('data-mood') === emoji) {
            btn.classList.add('selected');
        }
    });
}

// Apply Custom Mood Picker
function applyCustomMood() {
    const emojiInput = document.getElementById('customMoodEmoji').value.trim();
    const textInput = document.getElementById('customMoodText').value.trim();

    if (!emojiInput || !textInput) {
        showToast('請填寫自訂 Emoji 與心情！');
        return;
    }

    document.getElementById('selectedMoodEmoji').value = emojiInput;
    document.getElementById('selectedMoodText').value = textInput;

    document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('selected'));
    showToast(`已設定自訂心情：${emojiInput} ${textInput}`);
}

// Star Rating Picker Helpers
function setRating(val) {
    document.getElementById('bookRating').value = val;
    const stars = document.querySelectorAll('.star-rating-picker .star');
    stars.forEach((star, idx) => {
        if (idx < val) {
            star.textContent = '★';
        } else {
            star.textContent = '☆';
        }
    });
}

// Book Submit Handler (Add or Edit)
function handleBookSubmit(event) {
    event.preventDefault();

    if (!currentStudent) {
        showToast('請先登入學生登記身分！');
        return;
    }

    const editId = document.getElementById('editBookId').value;
    const title = document.getElementById('bookTitle').value.trim();
    const author = document.getElementById('bookAuthor').value.trim();
    const date = document.getElementById('bookDate').value;
    const moodEmoji = document.getElementById('selectedMoodEmoji').value;
    const moodText = document.getElementById('selectedMoodText').value;
    const ratingVal = document.getElementById('bookRating').value;
    const reflection = document.getElementById('bookReflection').value.trim();

    if (!title || !author || !date || !moodEmoji || !moodText || !reflection) {
        showToast('請確認所有欄位與心情皆已填寫！');
        return;
    }

    if (!ratingVal) {
        showToast('請評分推薦指數！');
        return;
    }
    const rating = parseInt(ratingVal);

    if (isFirebasePlaceholder) {
        showToast('⚠️ 目前處於離線展示模式，無法同步寫入雲端資料庫！');
        return;
    }

    if (editId) {
        // Edit Mode: Check edit authorization
        const targetBook = books.find(b => b.id == editId);
        if (targetBook) {
            const isOwner = currentStudent && 
                            String(targetBook.studentClass).trim() === String(currentStudent.class).trim() && 
                            Number(targetBook.studentSeat) === Number(currentStudent.seat) && 
                            String(targetBook.studentName).trim() === String(currentStudent.name).trim();
            
            if (!isTeacherMode && !isOwner) {
                showToast('您無修改權限！只能修改自己登記的書籍，或請老師開啟教師模式。');
                return;
            }

            // Sync update to Firebase
            database.ref('books/' + editId).update({
                title,
                author,
                date,
                moodEmoji,
                moodText,
                rating,
                reflection
            }, (error) => {
                if (error) {
                    showToast('雲端更新失敗，請確認網路連線或金鑰！');
                } else {
                    showToast('書籍資料已成功更新並同步！');
                    closeModal('bookModal');
                }
            });
        }
    } else {
        // Add Mode: Generate a beautiful spine styling for this book
        const colorSet = SPINE_COLORS[Math.floor(Math.random() * SPINE_COLORS.length)];
        const randomHeight = `${Math.floor(Math.random() * 45) + 130}px`; // 130px to 175px
        const randomWidth = `${Math.floor(Math.random() * 12) + 32}px`;   // 32px to 44px
        const spineStyle = Math.floor(Math.random() * 3) + 1;
        
        const newBookRef = booksRef.push(); // Push generates a unique firebase key ID
        const newBook = {
            id: newBookRef.key,
            title,
            author,
            date,
            moodEmoji,
            moodText,
            rating,
            reflection,
            spineColor: colorSet.bg,
            textColor: colorSet.text,
            height: randomHeight,
            width: randomWidth,
            spineStyle,
            // Bind student credentials
            studentClass: currentStudent.class,
            studentSeat: currentStudent.seat,
            studentName: currentStudent.name
        };

        newBookRef.set(newBook, (error) => {
            if (error) {
                showToast('雲端登記失敗，請檢查規則與連線！');
            } else {
                showToast(`新書《${title}》登記成功，已即時發佈至雲端書架！`);
                closeModal('bookModal');
            }
        });
    }
}

// Filters & Search logic
function filterBooks() {
    const searchStr = document.getElementById('searchInput').value.toLowerCase().trim();
    const classVal = document.getElementById('classFilter').value;
    const moodVal = document.getElementById('moodFilter').value;
    const sortVal = document.getElementById('sortSelect').value;

    filteredBooks = books.filter(book => {
        // 1. Search Query Match
        const matchSearch = book.title.toLowerCase().includes(searchStr) || 
                            book.author.toLowerCase().includes(searchStr) || 
                            book.reflection.toLowerCase().includes(searchStr) ||
                            (book.studentName && book.studentName.toLowerCase().includes(searchStr)) ||
                            (book.studentSeat && String(book.studentSeat).includes(searchStr));
        
        // 2. Class Filter Match
        let matchClass = true;
        if (classVal !== 'all') {
            matchClass = book.studentClass === classVal;
        }

        // 3. Mood Filter Match
        let matchMood = true;
        if (moodVal !== 'all') {
            if (moodVal === 'custom') {
                const standardMoods = ['😊', '🤯', '😢', '🤔', '😍', '🥱'];
                matchMood = !standardMoods.includes(book.moodEmoji);
            } else {
                matchMood = book.moodEmoji === moodVal;
            }
        }

        return matchSearch && matchClass && matchMood;
    });

    // Sorting Logic
    filteredBooks.sort((a, b) => {
        if (sortVal === 'newest') {
            return new Date(b.date) - new Date(a.date);
        } else if (sortVal === 'oldest') {
            return new Date(a.date) - new Date(b.date);
        } else if (sortVal === 'classSeat') {
            // Sort by Class (alphanumeric), then Seat (numeric), then Date
            const classCompare = String(a.studentClass).localeCompare(String(b.studentClass), 'zh-hant', { numeric: true });
            if (classCompare !== 0) return classCompare;
            
            const seatCompare = Number(a.studentSeat) - Number(b.studentSeat);
            if (seatCompare !== 0) return seatCompare;
            
            return new Date(b.date) - new Date(a.date);
        } else if (sortVal === 'title') {
            return a.title.localeCompare(b.title, 'zh-hant');
        }
        return 0;
    });

    renderBookcase();
}

// Render Bookcase virtual shelves
function renderBookcase() {
    const container = document.getElementById('shelvesContainer');
    container.innerHTML = '';

    const booksPerShelf = 8;
    const shelfCount = Math.max(1, Math.ceil(filteredBooks.length / booksPerShelf));

    for (let i = 0; i < shelfCount; i++) {
        const shelfEl = document.createElement('div');
        shelfEl.className = 'bookcase-shelf';

        const shadowOverlay = document.createElement('div');
        shadowOverlay.className = 'shelf-shadow-overlay';
        shelfEl.appendChild(shadowOverlay);

        const booksRow = document.createElement('div');
        booksRow.className = 'books-row';

        const startIndex = i * booksPerShelf;
        const endIndex = Math.min(startIndex + booksPerShelf, filteredBooks.length);
        const shelfBooks = filteredBooks.slice(startIndex, endIndex);

        if (shelfBooks.length === 0 && i === 0) {
            const emptyText = document.createElement('div');
            emptyText.className = 'empty-shelf-text';
            emptyText.textContent = '此書架目前空空如也，快點擊「登記書籍」增加閱讀成果吧！';
            shelfEl.appendChild(emptyText);
        } else {
            shelfBooks.forEach(book => {
                const bookItem = document.createElement('div');
                bookItem.className = 'book-item';
                bookItem.style.setProperty('--book-height', book.height);
                bookItem.style.setProperty('--book-width', book.width);
                bookItem.style.setProperty('--book-color', book.spineColor);
                bookItem.style.setProperty('--book-text-color', book.textColor);
                
                let decorHtml = '';
                if (book.spineStyle === 1) {
                    decorHtml = '<div class="book-spine-decor-top"></div>';
                } else if (book.spineStyle === 2) {
                    decorHtml = '<div class="book-spine-decor-top"></div><div class="book-spine-decor-bottom"></div>';
                }

                const ratingVal = book.rating || 5;
                const classSeatLabel = `${book.studentClass}班 ${String(book.studentSeat).padStart(2, '0')}號`;
                
                bookItem.innerHTML = `
                    ${decorHtml}
                    <div class="book-title-vertical">${book.title}</div>
                    <div class="book-mood-icon">${book.moodEmoji}</div>
                    <div class="book-tooltip">
                        <span class="tooltip-title"><strong>${book.title}</strong></span>
                        <span class="tooltip-author">作者: ${book.author}</span>
                        <span class="tooltip-date">閱讀日: ${book.date}</span>
                        <span class="tooltip-rating" style="color: #ffb400; font-size: 0.75rem;">${'★'.repeat(ratingVal)}${'☆'.repeat(5 - ratingVal)}</span>
                        <span class="tooltip-reader">👤 閱讀人: ${classSeatLabel} ${book.studentName}</span>
                    </div>
                `;

                bookItem.addEventListener('click', () => viewBookDetail(book.id));
                booksRow.appendChild(bookItem);
            });
        }

        shelfEl.appendChild(booksRow);

        const woodShelf = document.createElement('div');
        woodShelf.className = 'shelf-wood';
        shelfEl.appendChild(woodShelf);

        container.appendChild(shelfEl);
    }
}

// Current Book View State
let currentSelectedBookId = null;

// Open Book Detail View Modal
function viewBookDetail(bookId) {
    const book = books.find(b => b.id == bookId);
    if (!book) return;

    currentSelectedBookId = bookId;

    // Left Page
    document.getElementById('detailTitle').textContent = book.title;
    document.getElementById('detailAuthor').textContent = `作者：${book.author}`;
    document.getElementById('detailDate').textContent = book.date;
    document.getElementById('detailMoodBadge').textContent = book.moodEmoji;
    document.getElementById('detailMoodText').textContent = book.moodText;
    document.getElementById('detailSpineAccent').style.backgroundColor = book.spineColor;
    
    // Highlight Reader Credentials
    document.getElementById('detailReaderInfo').textContent = 
        `${book.studentClass}班 ${String(book.studentSeat).padStart(2, '0')}號 ${book.studentName}`;
    
    const ratingVal = book.rating || 5;
    document.getElementById('detailRating').textContent = '★'.repeat(ratingVal) + '☆'.repeat(5 - ratingVal);

    // Right Page
    document.getElementById('detailReflection').textContent = book.reflection;

    // Edit/Delete Action Buttons are always displayed
    const btnEdit = document.getElementById('btnEditBook');
    const btnDelete = document.getElementById('btnDeleteBook');
    
    btnEdit.style.display = 'inline-flex';
    btnDelete.style.display = 'inline-flex';

    openModal('detailModal');
}

// Edit book action triggered inside detail modal
function triggerEditBook() {
    if (!currentSelectedBookId) return;
    const book = books.find(b => b.id == currentSelectedBookId);
    if (!book) return;

    // Check authorization first
    const isOwner = currentStudent && 
                    String(book.studentClass).trim() === String(currentStudent.class).trim() && 
                    Number(book.studentSeat) === Number(currentStudent.seat) && 
                    String(book.studentName).trim() === String(currentStudent.name).trim();

    if (!isTeacherMode && !isOwner) {
        showToast('您無修改權限！只能修改自己登記的書籍，或請老師開啟教師模式。');
        return;
    }

    closeModal('detailModal');

    // Populate Add Book Modal with current details
    document.getElementById('modalTitle').textContent = '編輯登記書籍';
    document.getElementById('editBookId').value = book.id;
    document.getElementById('bookTitle').value = book.title;
    document.getElementById('bookAuthor').value = book.author;
    document.getElementById('bookDate').value = book.date;
    document.getElementById('bookReflection').value = book.reflection;
    document.getElementById('charCount').textContent = book.reflection.length;
    
    // Set Student label in form based on the book's owner, not session
    document.getElementById('formStudentBadge').textContent = 
        `${book.studentClass}班 ${String(book.studentSeat).padStart(2, '0')}號 ${book.studentName}`;

    selectMood(book.moodEmoji, book.moodText);
    
    const standardEmojis = ['😊', '🤯', '😢', '🤔', '😍', '🥱'];
    if (!standardEmojis.includes(book.moodEmoji)) {
        document.getElementById('customMoodEmoji').value = book.moodEmoji;
        document.getElementById('customMoodText').value = book.moodText;
    }

    setRating(book.rating || 5);
    openModal('bookModal');
}

// Delete book action triggered inside detail modal
function triggerDeleteBook() {
    if (!currentSelectedBookId) return;
    const book = books.find(b => b.id == currentSelectedBookId);
    if (!book) return;

    if (isFirebasePlaceholder) {
        showToast('⚠️ 目前處於離線展示模式，無法寫入雲端資料庫！');
        return;
    }

    // Check authorization again
    const isOwner = currentStudent && 
                    String(book.studentClass).trim() === String(currentStudent.class).trim() && 
                    Number(book.studentSeat) === Number(currentStudent.seat) && 
                    String(book.studentName).trim() === String(currentStudent.name).trim();

    if (!isTeacherMode && !isOwner) {
        showToast('無刪除權限！只能移出自己登記的書籍，或請老師開啟教師模式。');
        return;
    }

    if (confirm(`確定要將書籍《${book.title}》（登記人：${book.studentName}）從學思軒書櫃中移出嗎？`)) {
        database.ref('books/' + currentSelectedBookId).remove((err) => {
            if (err) {
                showToast('雲端刪除失敗，請檢查金鑰或網路連線！');
            } else {
                closeModal('detailModal');
                showToast('書籍已成功從雲端書櫃移出！');
                currentSelectedBookId = null;
            }
        });
    }
}

// Copy single report text
function copySingleReport() {
    if (!currentSelectedBookId) return;
    const book = books.find(b => b.id == currentSelectedBookId);
    if (!book) return;

    const ratingVal = book.rating || 5;
    const reportText = 
`📖【讀書心得分享】
書名：《${book.title}》
作者：${book.author}
閱讀完畢日期：${book.date}
推薦指數：${'★'.repeat(ratingVal)}${'☆'.repeat(5 - ratingVal)}
閱讀心得心情：${book.moodEmoji} ${book.moodText}
----------------------------------------
心得與感言：
${book.reflection}
----------------------------------------
成果記錄人：${book.studentClass}班 ${String(book.studentSeat).padStart(2, '0')}號 ${book.studentName}
（學思軒國文教室）`;

    navigator.clipboard.writeText(reportText).then(() => {
        showToast('單篇心得報告已複製到剪貼簿！');
    }).catch(err => {
        console.error('複製失敗', err);
        showToast('複製失敗，請手動複製。');
    });
}

/* ==========================================================================
   TEACHER ADMIN CENTER / WORKFLOWS
   ========================================================================== */

function openTeacherModal() {
    if (isTeacherMode) {
        showTeacherDashboard();
    } else {
        showTeacherLockScreen();
    }
    openModal('teacherModal');
}

function showTeacherLockScreen() {
    document.getElementById('teacherLockScreen').style.display = 'flex';
    document.getElementById('teacherDashboard').style.display = 'none';
    document.getElementById('teacherPin').value = '';
}

function showTeacherDashboard() {
    document.getElementById('teacherLockScreen').style.display = 'none';
    document.getElementById('teacherDashboard').style.display = 'flex';
    switchTab('tabExport'); // Initial tab in database sync version is Export/Reset
}

// Verify Teacher PIN code
function verifyTeacherPin() {
    const pin = document.getElementById('teacherPin').value.trim();
    if (pin === '0904' || pin.toUpperCase() === 'GTYBD') { // Supports both 0904 and GTYBD
        isTeacherMode = true;
        sessionStorage.setItem(STORAGE_KEYS.TEACHER_MODE, 'true');
        showTeacherDashboard();
        showToast('教師管理授權成功！已解鎖系統權限。');
    } else {
        showToast('管理密碼輸入錯誤，請重新輸入！');
        document.getElementById('teacherPin').focus();
    }
}

// Exit Teacher Mode
function exitTeacherMode() {
    isTeacherMode = false;
    sessionStorage.removeItem(STORAGE_KEYS.TEACHER_MODE);
    showTeacherLockScreen();
    showToast('已結束教師管理模式。');
}

// Tab Switching
function switchTab(tabId) {
    const panels = document.querySelectorAll('.tab-panel');
    const buttons = document.querySelectorAll('.tab-btn');
    
    panels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.id === tabId) panel.classList.add('active');
    });
    
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(tabId)) btn.classList.add('active');
    });
}

// Export entire Collective Database
function exportCollectiveDatabase() {
    const backupData = {
        exportedAt: new Date().toISOString(),
        site: "學思軒閱讀書櫃 (雲端版備份)",
        books: books
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0,10);
    
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `學思軒雲端閱讀書櫃資料庫_備份_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    
    showToast('雲端資料備份下載中，請妥善保管！');
}

// Reset Database to have only Teacher's Little Prince
function clearCollectiveDatabase() {
    if (isFirebasePlaceholder) {
        showToast('⚠️ 目前處於離線展示模式，無法重設雲端資料！');
        return;
    }

    if (confirm('確定要完全清空學思軒「雲端資料庫」嗎？(系統將會重設並保留黃于珊老師登記的《小王子》範本書)')) {
        if (confirm('⚠️ 再次警告：此動作將徹底刪除 Firebase 雲端資料庫中所有同學的登記紀錄，且無法復原！確定要執行嗎？')) {
            const teacherSampleBook = {
                id: "teacher-sample-little-prince",
                title: "小王子",
                author: "安東尼·聖修伯里",
                date: "2026-06-06",
                moodEmoji: "😢",
                moodText: "感動",
                rating: 5,
                reflection: "這是我第三次讀《小王子》，但每一次的感觸都不同。小王子與狐狸的「馴養」關係，以及他和那朵驕傲玫瑰之間的牽絆，總是能直擊靈魂深處。「真正重要的東西，用眼睛是看不見的，必須用你的心。」在這個忙碌的現代社會，我們常常像大人生意人一樣只追求數字，卻忘了事物原本的單純。一邊讀，眼眶一邊濕潤，真的是一本給大人的心靈療癒之書。",
                spineColor: "#15325b",
                textColor: "#f5f0eb",
                height: "140px",
                width: "32px",
                spineStyle: 2,
                studentClass: "913",
                studentSeat: 13,
                studentName: "黃于珊"
            };

            // Set the Firebase node directly
            booksRef.set({
                "teacher-sample-little-prince": teacherSampleBook
            }, (error) => {
                if (error) {
                    showToast('雲端清空重設失敗，請確認 Firebase 寫入權限！');
                } else {
                    showToast('雲端資料庫重設成功！已為您重新發佈教師範本書！');
                }
            });
        }
    }
}

// Generate & Copy Collective Report (Markdown or Excel Table)
function copyCollectiveReport() {
    const cls = document.getElementById('reportClassSelect').value;
    const format = document.getElementById('reportFormatSelect').value;

    const reportBooks = books.filter(b => {
        return cls === 'all' || b.studentClass === cls;
    });

    if (reportBooks.length === 0) {
        showToast('選取範圍內沒有任何書籍紀錄！');
        return;
    }

    // Sort report books: Class -> Seat -> Date
    reportBooks.sort((a, b) => {
        const classComp = String(a.studentClass).localeCompare(String(b.studentClass), 'zh-hant', { numeric: true });
        if (classComp !== 0) return classComp;
        const seatComp = Number(a.studentSeat) - Number(b.studentSeat);
        if (seatComp !== 0) return seatComp;
        return new Date(a.date) - new Date(b.date);
    });

    let output = '';

    if (format === 'detailed') {
        // Markdown detailed logs
        output += `# 學思軒閱讀書櫃 (雲端版) 統計成果報告\n`;
        output += `統計對象：${cls === 'all' ? '全體班級' : `${cls} 班`}\n`;
        output += `統計日期：${new Date().toLocaleDateString('zh-TW')}\n`;
        output += `累計登錄書本數：${reportBooks.length} 本\n`;
        output += `========================================\n\n`;

        let currentClsSeat = '';
        reportBooks.forEach((book, index) => {
            const studentLabel = `${book.studentClass}班 ${String(book.studentSeat).padStart(2, '0')}號 ${book.studentName}`;
            if (studentLabel !== currentClsSeat) {
                currentClsSeat = studentLabel;
                output += `\n## 👤 學生：${studentLabel}\n`;
            }
            output += `### ${index + 1}. 《${book.title}》/ ${book.author}\n`;
            output += `   - 閱讀日期：${book.date}\n`;
            output += `   - 心情評星：${book.moodEmoji} ${book.moodText} (推薦星等：${'★'.repeat(book.rating)}${'☆'.repeat(5-book.rating)})\n`;
            output += `   - 閱讀心得：${book.reflection}\n`;
            output += `   -------------------------------------\n`;
        });
        
        output += `\n\n只要有心，人人都是國文神！\n© 2026 龍門國中學思軒國文教室`;
    } else {
        // Tabular copy format for Excel
        output += `班級\t座號\t姓名\t書名\t作者\t閱讀日期\t完讀心情\t推薦星等\t閱讀心得與感言\n`;
        reportBooks.forEach(book => {
            // Replace newlines or tabs in reflection to prevent breaking Excel cells
            const cleanReflection = book.reflection.replace(/\r?\n|\r/g, ' ').replace(/\t/g, ' ');
            output += `${book.studentClass}\t${book.studentSeat}\t${book.studentName}\t${book.title}\t${book.author}\t${book.date}\t${book.moodEmoji} ${book.moodText}\t${'★'.repeat(book.rating)}${'☆'.repeat(5-book.rating)}\t${cleanReflection}\n`;
        });
    }

    navigator.clipboard.writeText(output).then(() => {
        showToast(`雲端讀書報告已複製（共 ${reportBooks.length} 筆，格式：${format === 'detailed' ? 'Markdown' : 'Excel 表格'}）！`);
    }).catch(err => {
        console.error('複製失敗', err);
        showToast('複製失敗，請檢查權限。');
    });
}

/* ==========================================================================
   MOCK STATIC DATABASE FOR FIRST LOAD (COLLECTIVE INITIAL DEMO)
   ========================================================================== */
function getCollectiveSampleBooks() {
    return [
        {
            id: "cls-sample-1",
            title: "經典常談",
            author: "朱自清",
            date: "2026-05-15",
            moodEmoji: "🤔",
            moodText: "啟發",
            rating: 5,
            reflection: "朱自清先生用極其淺顯優美且生動的文字，介紹了《說文解字》、《周易》、《尚書》、《詩經》等古典著作。以前總覺得國學經典晦澀難懂，但在這本書裡，每個典籍的背景與演變都像是聽故事一樣，引人入勝。看完這本書，我對國文課本裡的古文有了截然不同的認識，很想親自去翻翻這些古籍！",
            spineColor: "#725225",
            textColor: "#ffd700",
            height: "165px",
            width: "36px",
            spineStyle: 2,
            studentClass: "913",
            studentSeat: 13,
            studentName: "王大同"
        },
        {
            id: "cls-sample-2",
            title: "撒哈拉的故事",
            author: "三毛",
            date: "2026-06-02",
            moodEmoji: "😊",
            moodText: "充實",
            rating: 4,
            reflection: "三毛與荷西在撒哈拉沙漠的日常生活，既充滿異國情調，又充滿了面對艱苦環境時的樂觀與幽默。文字看似平淡家常，卻藏著對生命的無窮熱愛。特別喜歡〈白手成家〉這一篇，他們將空無一物的荒涼房子裝飾成沙漠中最美麗的家。這本書讓我知道，生活的美好不在於物資是否富裕，而在於自己看待世界的心態。",
            spineColor: "#cc5a14",
            textColor: "#f5f0eb",
            height: "155px",
            width: "34px",
            spineStyle: 1,
            studentClass: "913",
            studentSeat: 5,
            studentName: "陳怡君"
        },
        {
            id: "cls-sample-3",
            title: "小王子",
            author: "安東尼·聖修伯里",
            date: "2026-06-06",
            moodEmoji: "😢",
            moodText: "感動",
            rating: 5,
            reflection: "這是我第三次讀《小王子》，但每一次的感觸都不同。小王子與狐狸的「馴養」關係，以及他和那朵驕傲玫瑰之間的牽絆，總是能直擊靈魂深處。「真正重要的東西，用眼睛是看不見的，必須用你的心。」在這個忙碌的現代社會，我們常常像大人生意人一樣只追求數字，卻忘了事物原本的單純。一邊讀，眼眶一邊濕潤，真的是一本給大人的心靈療癒之書。",
            spineColor: "#15325b",
            textColor: "#f5f0eb",
            height: "140px",
            width: "32px",
            spineStyle: 2,
            studentClass: "913",
            studentSeat: 13,
            studentName: "黃于珊"
        },
        {
            id: "cls-sample-4",
            title: "老人與海",
            author: "歐內斯特·海明威",
            date: "2026-06-01",
            moodEmoji: "🤯",
            moodText: "震撼",
            rating: 5,
            reflection: "古巴老漁夫聖地牙哥在連續八十四天沒捕到魚後，終於獨自捕獲一條巨大的馬林魚。在與大魚奮力搏鬥兩天兩夜並成功將其殺死後，卻在回程中遭到無數鯊魚的襲擊，最終回港時只剩下一具巨大的白骨。這本書完美展現了硬漢精神：「人不是為了失敗而生的。一個人可以被毀滅，但不能被打敗。」這種永不屈服的求生勇氣，帶給我極大的震撼與感動！",
            spineColor: "#2f3b42",
            textColor: "#f5f0eb",
            height: "172px",
            width: "42px",
            spineStyle: 3,
            studentClass: "913",
            studentSeat: 12,
            studentName: "林志豪"
        },
        {
            id: "cls-sample-5",
            title: "邊城",
            author: "沈從文",
            date: "2026-05-28",
            moodEmoji: "🤔",
            moodText: "啟發",
            rating: 4,
            reflection: "《邊城》描繪了湘西小鎮茶峒一個如詩如畫的世外桃源生活。翠翠與外公、以及天保、儺送兄弟之間的純樸愛情故事與親情，在沈從文優美寧靜的筆觸下顯得有些哀傷。看完這本書，我體會到人性的善良與純潔，同時也被命運交錯的無常而打動。文字裡帶著淡淡的鄉土氣息，給人一種回歸自然的平靜感。",
            spineColor: "#1c3d27",
            textColor: "#f5f0eb",
            height: "148px",
            width: "35px",
            spineStyle: 1,
            studentClass: "914",
            studentSeat: 8,
            studentName: "曾威宇"
        }
    ];
}
