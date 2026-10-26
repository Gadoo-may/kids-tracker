let selectedDate = new Date();
let calendarDate = new Date();
let selectedAvatar = null;

let eventListenersSet = false;

function initApp() {
    const character = Storage.getCurrentCharacter();
    if (character) {
        hideLoginScreen();
        Storage.initData();
        initDateSelector();
        renderAll();
        if (!eventListenersSet) {
            setupEventListeners();
            eventListenersSet = true;
        }
        renderCharacterInfo();
    } else {
        showLoginScreen();
    }
}

function showLoginScreen() {
    document.getElementById('login-screen').classList.remove('hidden');
    renderCharacterOptions();
    renderExistingCharacters();
}

function hideLoginScreen() {
    document.getElementById('login-screen').classList.add('hidden');
}

function renderCharacterOptions() {
    const container = document.getElementById('character-list');
    container.innerHTML = '';
    
    Storage.CHARACTER_AVATARS.forEach(avatar => {
        const div = document.createElement('div');
        div.className = `character-option ${selectedAvatar === avatar ? 'selected' : ''}`;
        div.textContent = avatar;
        div.onclick = () => selectAvatar(avatar);
        container.appendChild(div);
    });
}

function selectAvatar(avatar) {
    selectedAvatar = avatar;
    renderCharacterOptions();
}

function renderExistingCharacters() {
    const container = document.getElementById('existing-character-list');
    const characters = Storage.loadCharacters();
    
    container.innerHTML = '';
    
    if (characters.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">暂无角色，创建一个吧！</div>';
        return;
    }
    
    characters.forEach(char => {
        const coins = Storage.loadData('kids_tracker_points', char.id) || 0;
        const streakData = Storage.loadData('kids_tracker_streak', char.id);
        const streak = streakData ? streakData.current : 0;
        
        const item = document.createElement('div');
        item.className = 'existing-character-item';
        item.innerHTML = `
            <div class="char-emoji">${char.avatar}</div>
            <div class="char-info">
                <div class="char-name">${char.name}</div>
                <div class="char-stats">💰 ${coins}金币 · 🔥 连续${streak}天</div>
            </div>
            <button class="char-delete" onclick="deleteCharacter('${char.id}', '${char.name}')">删除</button>
        `;
        item.onclick = () => loginCharacter(char.id);
        container.appendChild(item);
    });
}

function createNewCharacter() {
    const name = document.getElementById('characterName').value.trim();
    
    if (!name) {
        showToast('请输入角色昵称！');
        return;
    }
    
    if (!selectedAvatar) {
        showToast('请选择一个角色头像！');
        return;
    }
    
    const character = Storage.createCharacter(name, selectedAvatar);
    loginCharacter(character.id);
}

function loginCharacter(characterId) {
    Storage.setCurrentCharacter(characterId);
    hideLoginScreen();
    Storage.initData();
    initDateSelector();
    renderAll();
    if (!eventListenersSet) {
        setupEventListeners();
        eventListenersSet = true;
    }
    renderCharacterInfo();
    showToast('欢迎回来！🎮');
}

function deleteCharacter(characterId, characterName) {
    event.stopPropagation();
    showConfirmModal(`确定要删除角色「${characterName}」吗？所有数据将被删除！`, () => {
        Storage.deleteCharacter(characterId);
        renderExistingCharacters();
        showToast('角色已删除！');
    });
}

function renderCharacterInfo() {
    const character = Storage.getCurrentCharacter();
    if (character) {
        const avatarDisplay = document.getElementById('characterAvatarDisplay');
        avatarDisplay.textContent = character.avatar;
    }
}

function initDateSelector() {
    const today = Storage.getTodayString();
    document.getElementById('selectedDate').value = today;
    selectedDate = new Date();
}

function renderAll() {
    renderCoins();
    renderMap();
    renderCalendar();
    renderShop();
    renderStats();
    renderChallenge();
}

function renderCoins() {
    const coins = Storage.loadData('kids_tracker_points') || 0;
    document.getElementById('totalCoins').textContent = coins;
    document.getElementById('shopCoins').textContent = coins;
}

function renderMap() {
    const streak = Storage.loadData('kids_tracker_streak');
    const tasks = Storage.loadData('kids_tracker_tasks') || [];
    const dateStr = Storage.formatDate(selectedDate);
    const stats = Storage.getDateStats(dateStr);
    const todayStr = Storage.getTodayString();
    
    document.getElementById('streakDays').textContent = streak ? streak.current : 0;
    document.getElementById('completedCount').textContent = stats.completed;
    document.getElementById('totalCount').textContent = stats.total;
    
    const progressPercent = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
    document.getElementById('progressFill').style.width = `${progressPercent}%`;
    
    const worldNumber = Math.floor(streak.current / 7) + 1;
    const levelNumber = (streak.current % 7) + 1;
    document.getElementById('currentWorld').textContent = worldNumber;
    document.getElementById('currentLevel').textContent = levelNumber;
    
    const isPast = dateStr < todayStr;
    const isFuture = dateStr > todayStr;
    
    const gameTasks = document.getElementById('gameTasks');
    gameTasks.innerHTML = '';
    
    if (tasks.length === 0) {
        gameTasks.innerHTML = `
            <div class="empty-state">
                <div class="empty-emoji">📋</div>
                <p>还没有任务哦！</p>
            </div>
        `;
        return;
    }
    
    // Sort tasks: must-do first (by createdAt desc), then others
    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.isMustDo && !b.isMustDo) return -1;
        if (!a.isMustDo && b.isMustDo) return 1;
        if (a.isMustDo && b.isMustDo) return (b.createdAt || 0) - (a.createdAt || 0);
        return 0;
    });
    
    sortedTasks.forEach((task, index) => {
        const isCompleted = Storage.checkTaskCompleted(task.id, dateStr);
        const isFailed = task.isMustDo ? Storage.checkTaskFailed(task.id, dateStr) : false;
        const taskItem = document.createElement('div');
        taskItem.className = `game-task ${isCompleted ? 'completed' : ''} ${isFailed ? 'failed' : ''} ${isFuture ? 'future' : ''} ${task.isMustDo ? 'must-do' : ''}`;
        taskItem.style.animationDelay = `${index * 0.1}s`;
        
        const categoryText = getCategoryText(task.category);
        const categoryClass = getCategoryClass(task.category);
        const characterClass = getCharacterClass(task.category);
        
        let timerHtml = '';
        if (task.hasTimer && !isCompleted && !isFuture) {
            timerHtml = `
                <div class="task-timer" id="timer-${task.id}">
                    <div class="timer-display" id="timer-display-${task.id}">${formatTime(task.timerDuration * 60)}</div>
                    <div class="timer-buttons">
                        <button class="timer-btn start-btn" onclick="startTimer('${task.id}', ${task.timerDuration * 60}, event)">▶</button>
                        <button class="timer-btn pause-btn" onclick="pauseTimer('${task.id}', event)" style="display: none;">⏸</button>
                        <button class="timer-btn reset-btn" onclick="resetTimer('${task.id}', ${task.timerDuration * 60}, event)">↺</button>
                        <button class="timer-btn finish-btn" onclick="finishTimerAndComplete('${task.id}', ${task.points}, '${dateStr}', ${isPast}, event)" style="display: none;">✓</button>
                    </div>
                </div>
            `;
        }
        
        let mustDoBadge = '';
        if (task.isMustDo) {
            mustDoBadge = '<span class="must-do-badge">🔴 必做</span>';
        }
        
        let failedBadge = '';
        if (isFailed) {
            // 显示已存储的天数标记（免除日/全部不累计不计入，不显示数字）
            let dayMarkHtml = '';
            const isExemptDay = task.exemptDays && task.exemptDays.includes(new Date(dateStr).getDay());
            if (!isExemptDay) {
                const mark = Storage.getFailDayNum(task.id, dateStr);
                if (mark) {
                    dayMarkHtml = ` <span class="fail-day-tag">${mark}</span>`;
                }
            }
            failedBadge = `<span class="failed-badge">❌ 未完成${dayMarkHtml}</span>`;
        }
        
        let failButtonHtml = '';
        if (task.isMustDo && !isCompleted && !isFuture && !isFailed) {
            failButtonHtml = `<button class="fail-btn" onclick="failGameTask('${task.id}', '${dateStr}', ${isPast}, event)">未完成</button>`;
        }
        
        taskItem.innerHTML = `
            ${mustDoBadge}
            <div class="task-character ${characterClass} ${isCompleted ? 'completed' : ''}"></div>
            <div class="task-info">
                <div class="task-name">${task.name}</div>
                <span class="task-category ${categoryClass}">${categoryText}</span>
                ${isCompleted ? '<span class="completed-badge">✓ 已完成</span>' : ''}
                ${failedBadge}
                ${isFuture ? '<span class="future-badge">⏳ 未开放</span>' : ''}
                ${timerHtml}
            </div>
            <div class="task-actions">
                ${failButtonHtml}
                <div class="task-coin">
                    <span class="task-coin-value">+${task.points}</span>
                    <div class="coin-icon-img"></div>
                </div>
            </div>
        `;
        
        if (!isCompleted && !task.hasTimer && !isFuture && !isFailed) {
            taskItem.onclick = () => completeGameTask(task.id, task.points, dateStr, isPast);
        } else if (!isCompleted && task.hasTimer && !isFuture && !isFailed) {
            taskItem.onclick = null;
        }
        
        gameTasks.appendChild(taskItem);
    });
}

function getCategoryText(category) {
    if (category === 'study') return '📚 学习';
    if (category === 'life') return '🧹 生活';
    if (category === 'sport') return '⚽ 运动';
    if (category.startsWith('custom_')) {
        return decodeURIComponent(category.substring(7));
    }
    return '📋 其他';
}

function getCategoryClass(category) {
    if (category === 'study') return 'study';
    if (category === 'life') return 'life';
    if (category === 'sport') return 'sport';
    return 'custom';
}

function getCharacterClass(category) {
    if (category === 'study') return 'character-book';
    if (category === 'life') return 'character-house';
    if (category === 'sport') return 'character-ball';
    return 'character-star';
}

function completeGameTask(taskId, taskPoints, dateStr, isPast) {
    const isCompleted = Storage.checkTaskCompleted(taskId, dateStr);
    
    if (isCompleted) {
        showToast('这个任务已经完成过了！');
        return;
    }
    
    showConfirmModal(`确定要完成这个任务吗？完成后将获得 ${taskPoints} 金币！`, () => {
        Storage.completeTask(taskId, taskPoints, dateStr);
        renderAll();
        
        showCoinAnimation();
        
        if (isPast) {
            showToast(`补打卡成功！获得 ${taskPoints} 金币 🪙`);
        } else {
            showToast(`太棒了！获得 ${taskPoints} 金币 🪙`);
        }
    });
}

const ALL_WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6];

function isExemptAllDays(task) {
    return Array.isArray(task.exemptDays) && ALL_WEEK_DAYS.every(d => task.exemptDays.includes(d));
}

// 点击未完成时检查前一日状态（从前一天起向前找，跳过免除日）：
// - 遇到已完成（含免除日完成）→ 终止累计，返回 completed
// - 免除日未完成/未点击 → 忽略，继续往前
// - 普通日已点击未完成 → 读取该日的天数标记，返回 failed
// - 普通日未点击 → 返回 unclicked（弹窗询问是否继续）
function getPrevFailMark(taskId, dateStr, exemptDays) {
    let checkDate = new Date(dateStr);
    checkDate.setDate(checkDate.getDate() - 1);
    
    for (let i = 0; i < 365; i++) {
        const checkDateStr = Storage.formatDate(checkDate);
        const dayOfWeek = checkDate.getDay();
        
        // 已完成（含免除日完成）→ 终止累计
        if (Storage.checkTaskCompleted(taskId, checkDateStr)) {
            return { type: 'completed', dayNum: 0, dateStr: checkDateStr };
        }
        
        // 免除日未完成/未点击 → 忽略
        if (exemptDays && exemptDays.includes(dayOfWeek)) {
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
        }
        
        // 普通日已点击未完成 → 读取天数标记累加
        if (Storage.checkTaskFailed(taskId, checkDateStr)) {
            return { type: 'failed', dayNum: Storage.getFailDayNum(taskId, checkDateStr) || 1, dateStr: checkDateStr };
        }
        
        // 普通日未点击 → 弹窗询问
        return { type: 'unclicked', dayNum: 0, dateStr: checkDateStr };
    }
    
    return { type: 'none', dayNum: 0, dateStr: Storage.formatDate(checkDate) };
}

function calculateFailPenalty(consecutiveDays) {
    if (consecutiveDays <= 0) return 0;
    if (consecutiveDays <= 2) return 10;
    
    // Day 3: 20, Day 4: 20, Day 5: 40, Day 6: 40, Day 7: 80...
    // Doubles every 3rd day starting from day 3
    let penalty = 10;
    let multiplier = 1;
    
    for (let day = 3; day <= consecutiveDays; day++) {
        if (day === 3) {
            multiplier = 2;
        } else if ((day - 3) % 2 === 0 && day > 3) {
            multiplier *= 2;
        }
    }
    
    return penalty * multiplier;
}

function failGameTask(taskId, dateStr, isPast, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const tasks = Storage.loadData('kids_tracker_tasks') || [];
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
        showToast('任务不存在！');
        return;
    }
    
    if (!task.isMustDo) {
        showToast('只有必做任务才能标记未完成！');
        return;
    }
    
    const isCompleted = Storage.checkTaskCompleted(taskId, dateStr);
    if (isCompleted) {
        showToast('任务已完成，不能标记未完成！');
        return;
    }
    
    const isFailed = Storage.checkTaskFailed(taskId, dateStr);
    if (isFailed) {
        showToast('该日期已标记为未完成！');
        return;
    }
    
    // 执行标记：扣分并存储天数标记（dayNum 为 null 表示不计入累计）
    const doFail = (penalty, dayNum) => {
        Storage.failTask(taskId, dateStr, dayNum);
        
        // Deduct points
        const currentPoints = Storage.loadData('kids_tracker_points') || 0;
        const newPoints = currentPoints - penalty;
        Storage.saveData('kids_tracker_points', newPoints);
        
        // Add history
        Storage.addHistory('penalty', `必做任务未完成: ${task.name} -${penalty}`, -penalty);
        
        // Check if points became negative
        const wasNegative = Storage.getNegativeFlag();
        if (newPoints < 0 && !wasNegative) {
            Storage.setNegativeFlag(true);
            showConfirmModal('⚠️ 金币首次变成负数！请注意及时完成任务赚取金币！', () => {}, '知道了');
        } else if (newPoints >= 0 && wasNegative) {
            Storage.setNegativeFlag(false);
            showConfirmModal('🎉 金币已恢复为正数！继续加油！', () => {}, '太好了');
        }
        
        renderAll();
        showToast(dayNum ? `标记未完成（第 ${dayNum} 天），扣除 ${penalty} 金币 💸` : `标记未完成，扣除 ${penalty} 金币 💸`);
    };
    
    // 第一步：点击当天是免除日 → 无需理会其他日数据，只扣10分
    const exemptAll = isExemptAllDays(task);
    const isExemptToday = task.exemptDays && task.exemptDays.includes(new Date(dateStr).getDay());
    if (exemptAll || isExemptToday) {
        const msg = exemptAll
            ? '确定要标记为未完成吗？将扣除 10 金币！\n（此任务不累计连续未做天数）'
            : '确定要标记为未完成吗？将扣除 10 金币！\n（今日为免除日，不计入累计天数）';
        showConfirmModal(msg, () => doFail(10, null));
        return;
    }
    
    // 第二步：检查前一天（跳过免除日）的未完成天数标记
    const prev = getPrevFailMark(taskId, dateStr, task.exemptDays);
    
    // 前一日非免除日且未点击 → 询问是否继续（继续=当昨日已完成，记第1天；取消=回去修改前一日）
    if (prev.type === 'unclicked') {
        showConfirmModal(
            `⚠️ 前一日（${prev.dateStr}）非免除日且未点击，是否继续？\n继续将把前一日当做已完成，本日记为未完成第 1 天，扣除 10 金币。`,
            () => doFail(10, 1),
            '继续标记（第1天）',
            '取消，回去修改前一日',
            () => goToTaskDate(dateStr, -1)
        );
        return;
    }
    
    // 前一日已完成/无记录 → 第1天；前一日已点击未完成 → 其标记 +1
    const dayNum = prev.dayNum + 1;
    const penalty = calculateFailPenalty(dayNum);
    const msg = prev.type === 'failed'
        ? `确定要标记为未完成吗？前一日为未完成第 ${prev.dayNum} 天，本日记为第 ${dayNum} 天，将扣除 ${penalty} 金币！`
        : `确定要标记为未完成吗？本日记为未完成第 1 天，将扣除 ${penalty} 金币！`;
    showConfirmModal(msg, () => doFail(penalty, dayNum));
}

// 跳转到 dateStr 的前后 days 天（用于"回去前一日修改状态"）
function goToTaskDate(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    selectedDate = d;
    document.getElementById('selectedDate').value = Storage.formatDate(d);
    renderAll();
}

function showCoinAnimation() {
    const animation = document.getElementById('coinAnimation');
    animation.textContent = '';
    animation.style.left = '50%';
    animation.style.top = '50%';
    
    animation.style.animation = 'none';
    animation.offsetHeight;
    animation.style.animation = 'coinFly 1s ease-out forwards';
}

function renderCalendar() {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    
    document.getElementById('calendarTitle').textContent = `${year}年${month + 1}月`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const monthStats = Storage.getCalendarMonthStats(year, month);
    const todayStr = Storage.getTodayString();
    const selectedStr = Storage.formatDate(selectedDate);
    
    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';
    
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const prevMonth = month - 1;
        const prevYear = prevMonth < 0 ? year - 1 : year;
        const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day other-month';
        dayEl.textContent = day;
        calendarDays.appendChild(dayEl);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const stats = monthStats[dateStr];
        
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        
        if (dateStr === todayStr) {
            dayEl.classList.add('today');
        }
        
        if (dateStr === selectedStr) {
            dayEl.classList.add('selected');
        }
        
        if (stats) {
            dayEl.classList.add(stats.status);
        }
        
        dayEl.textContent = i;
        dayEl.onclick = () => selectCalendarDate(year, month, i);
        
        calendarDays.appendChild(dayEl);
    }
    
    const remainingDays = 42 - (firstDay + daysInMonth);
    for (let i = 1; i <= remainingDays; i++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day other-month';
        dayEl.textContent = i;
        calendarDays.appendChild(dayEl);
    }
    
    renderSelectedDateInfo();
}

function selectCalendarDate(year, month, day) {
    selectedDate = new Date(year, month, day);
    document.getElementById('selectedDate').value = Storage.formatDate(selectedDate);
    renderAll();
}

function renderSelectedDateInfo() {
    const dateStr = Storage.formatDate(selectedDate);
    const stats = Storage.getDateStats(dateStr);
    const todayStr = Storage.getTodayString();
    const history = Storage.loadData('kids_tracker_history') || [];
    
    const dayHistory = history.filter(item => {
        return item.time && item.time.includes(dateStr.substring(5));
    });
    
    let penaltyText = '';
    if (dayHistory.length > 0) {
        const penalties = dayHistory.filter(item => item.type === 'penalty');
        if (penalties.length > 0) {
            penaltyText = `
                <div style="font-size: 12px; color: #FF6B6B; margin-top: 10px;">
                    ⚠️ 扣分记录：${penalties.map(p => p.title.replace('扣分: ', '')).join('；')}
                </div>
            `;
        }
    }
    
    const infoDiv = document.getElementById('selectedDateInfo');
    
    let statusText = '';
    if (dateStr === todayStr) {
        statusText = '今天';
    } else if (dateStr < todayStr) {
        statusText = '已过去';
    } else {
        statusText = '未来';
    }
    
    infoDiv.innerHTML = `
        <div style="font-size: 14px; color: #8B4513; margin-bottom: 10px;">📅 ${dateStr} (${statusText})</div>
        <div style="font-size: 12px; color: #333;">
            完成任务: <span style="color: #4CAF50; font-weight: bold;">${stats.completed}</span> / ${stats.total}
        </div>
        <div style="font-size: 10px; color: #666; margin-top: 5px;">
            ${stats.completed === stats.total && stats.total > 0 ? '🎉 全部完成！' : ''}
        </div>
        ${penaltyText}
    `;
}

let shopManagementMode = false;

function renderShop() {
    const rewards = Storage.loadData('kids_tracker_rewards') || [];
    const coins = Storage.loadData('kids_tracker_points') || 0;
    
    const shopItems = document.getElementById('shopItems');
    shopItems.innerHTML = '';
    
    if (rewards.length === 0) {
        shopItems.innerHTML = `
            <div class="empty-state" style="grid-column: span 2;">
                <div class="empty-emoji">🎁</div>
                <p>商店还没有道具！</p>
            </div>
        `;
        return;
    }
    
    rewards.forEach(reward => {
        const canBuy = coins >= reward.points;
        const item = document.createElement('div');
        item.className = 'shop-item';
        
        const rewardType = reward.type || 'permanent';
        const typeLabel = rewardType === 'one-time' ? '⏳ 一次性' : '🔄 永久性';
        
        if (shopManagementMode) {
            item.innerHTML = `
                <div style="font-size: 40px; margin-bottom: 10px;">${reward.emoji}</div>
                <div class="shop-item-name">${reward.name}</div>
                <div class="shop-item-type">${typeLabel}</div>
                <div class="shop-item-price">${reward.points} <span class="inline-coin"></span></div>
                <button class="delete-btn" onclick="deleteShopReward('${reward.id}', '${reward.name}')">删除</button>
            `;
        } else {
            item.innerHTML = `
                <div style="font-size: 40px; margin-bottom: 10px;">${reward.emoji}</div>
                <div class="shop-item-name">${reward.name}</div>
                <div class="shop-item-type">${typeLabel}</div>
                <div class="shop-item-price">${reward.points} <span class="inline-coin"></span></div>
                <button class="buy-btn ${canBuy ? '' : 'disabled'}" 
                    onclick="buyReward('${reward.id}', '${reward.name}', ${reward.points}, '${rewardType}')"
                    ${!canBuy ? 'disabled' : ''}>
                    ${canBuy ? '购买' : '金币不足'}
                </button>
            `;
        }
        shopItems.appendChild(item);
    });
}

function toggleShopManagement() {
    shopManagementMode = !shopManagementMode;
    const btn = document.querySelector('.manage-items-btn');
    if (shopManagementMode) {
        btn.textContent = '✓ 退出管理';
        btn.style.background = 'linear-gradient(180deg, #4CAF50 0%, #2E7D32 100%)';
    } else {
        btn.textContent = '✏️ 管理商品';
        btn.style.background = 'linear-gradient(180deg, #FF9800 0%, #F57C00 100%)';
    }
    renderShop();
}

function deleteShopReward(rewardId, rewardName) {
    showConfirmModal(`确定要删除「${rewardName}」吗？`, () => {
        Storage.deleteReward(rewardId);
        renderShop();
        showToast('道具删除成功！🗑️');
    });
}

function renderStats() {
    const stats = Storage.getTotalStats();
    const history = Storage.loadData('kids_tracker_history') || [];
    
    document.getElementById('totalStars').textContent = stats.totalCompleted;
    document.getElementById('totalEarned').textContent = stats.totalEarned;
    document.getElementById('totalSpent').textContent = stats.totalSpent;
    document.getElementById('maxStreak').textContent = stats.maxStreak;
    
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';
    
    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <div class="empty-emoji">📊</div>
                <p>暂无记录</p>
            </div>
        `;
        return;
    }
    
    history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = `history-item ${item.type}`;
        let pointsClass = '';
        if (item.type === 'penalty') {
            pointsClass = 'penalty';
        }
        historyItem.innerHTML = `
            <div class="history-info">
                <span class="history-title">${item.title}</span>
                <span class="history-time">${item.time}</span>
            </div>
            <span class="history-points ${pointsClass}">${item.type === 'earn' ? '+' : ''}${item.points}</span>
        `;
        historyList.appendChild(historyItem);
    });
}

function setupEventListeners() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            const tab = e.currentTarget.dataset.tab;
            e.currentTarget.classList.add('active');
            document.getElementById(`${tab}-tab`).classList.add('active');
        });
    });
    
    document.getElementById('addRewardForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('rewardName').value;
        const points = parseInt(document.getElementById('rewardPoints').value);
        const type = document.getElementById('rewardType').value;
        
        Storage.addReward({ name, points, type });
        closeAddRewardModal();
        renderShop();
        showToast('商品添加成功！🎁');
    });

    document.getElementById('addTaskForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('taskName').value;
        let category = document.getElementById('taskCategory').value;
        const customCategoryName = document.getElementById('customCategoryName').value;
        const points = parseInt(document.getElementById('taskPoints').value);
        const hasTimer = document.getElementById('taskTimer').value === 'yes';
        const timerDuration = hasTimer ? parseInt(document.getElementById('taskTimerDuration').value) : 0;
        const isMustDo = document.getElementById('taskIsMustDo').value === 'yes';
        
        let exemptDays = [];
        if (isMustDo) {
            const checkboxes = document.querySelectorAll('input[name="exemptDay"]:checked');
            exemptDays = Array.from(checkboxes).map(cb => parseInt(cb.value));
        }
        
        if (category === 'custom' && customCategoryName) {
            category = 'custom_' + encodeURIComponent(customCategoryName);
        }
        
        Storage.addTask({ name, category, points, hasTimer, timerDuration, isMustDo, exemptDays });
        document.getElementById('addTaskForm').reset();
        document.getElementById('customCategoryDiv').style.display = 'none';
        document.getElementById('timerDurationDiv').style.display = 'none';
        document.getElementById('exemptDaysDiv').style.display = 'none';
        renderManageTaskList();
        showToast('任务添加成功！✅');
    });

    document.getElementById('penaltyForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const reason = document.getElementById('penaltyReason').value;
        const points = parseInt(document.getElementById('penaltyPoints').value);
        
        const coins = Storage.loadData('kids_tracker_points') || 0;
        if (coins < points) {
            showToast('金币不足！');
            return;
        }
        
        showConfirmModal(`确定要扣除 ${points} 金币吗？理由：${reason}`, () => {
            Storage.deductPoints(reason, points);
            closePenaltyModal();
            renderAll();
            showToast(`已扣除 ${points} 金币！`);
        });
    });
    
    document.getElementById('editTaskForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const taskId = document.getElementById('editTaskId').value;
        const name = document.getElementById('editTaskName').value;
        let category = document.getElementById('editTaskCategory').value;
        const customCategoryName = document.getElementById('editCustomCategoryName').value;
        const points = parseInt(document.getElementById('editTaskPoints').value);
        const hasTimer = document.getElementById('editTaskTimer').value === 'yes';
        const timerDuration = hasTimer ? parseInt(document.getElementById('editTaskTimerDuration').value) : 0;
        const isMustDo = document.getElementById('editTaskIsMustDo').value === 'yes';
        
        let exemptDays = [];
        if (isMustDo) {
            const checkboxes = document.querySelectorAll('input[name="editExemptDay"]:checked');
            exemptDays = Array.from(checkboxes).map(cb => parseInt(cb.value));
        }
        
        if (category === 'custom' && customCategoryName) {
            category = 'custom_' + encodeURIComponent(customCategoryName);
        }
        
        Storage.updateTask(taskId, { name, category, points, hasTimer, timerDuration, isMustDo, exemptDays });
        closeEditTaskModal();
        renderManageTaskList();
        renderAll();
        showToast('任务修改成功！✅');
    });
    
    document.getElementById('bonusForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const reason = document.getElementById('bonusReason').value;
        const points = parseInt(document.getElementById('bonusPoints').value);
        
        showConfirmModal(`确定要奖励 ${points} 金币吗？理由：${reason}`, () => {
            Storage.addPoints(points);
            Storage.addHistory('earn', `奖励 ${points} 金币：${reason}`, points);
            closeBonusModal();
            renderAll();
            showCoinAnimation();
            showToast(`已奖励 ${points} 金币！`);
        });
    });
}

function onCategoryChange() {
    const category = document.getElementById('taskCategory').value;
    const customDiv = document.getElementById('customCategoryDiv');
    customDiv.style.display = category === 'custom' ? 'block' : 'none';
}

function onTimerChange() {
    const hasTimer = document.getElementById('taskTimer').value === 'yes';
    const timerDiv = document.getElementById('timerDurationDiv');
    timerDiv.style.display = hasTimer ? 'block' : 'none';
}

function onMustDoChange() {
    const isMustDo = document.getElementById('taskIsMustDo').value === 'yes';
    const exemptDiv = document.getElementById('exemptDaysDiv');
    exemptDiv.style.display = isMustDo ? 'block' : 'none';
}

function onEditCategoryChange() {
    const category = document.getElementById('editTaskCategory').value;
    const customDiv = document.getElementById('editCustomCategoryDiv');
    customDiv.style.display = category === 'custom' ? 'block' : 'none';
}

function onEditTimerChange() {
    const hasTimer = document.getElementById('editTaskTimer').value === 'yes';
    const timerDiv = document.getElementById('editTimerDurationDiv');
    timerDiv.style.display = hasTimer ? 'block' : 'none';
}

function onEditMustDoChange() {
    const isMustDo = document.getElementById('editTaskIsMustDo').value === 'yes';
    const exemptDiv = document.getElementById('editExemptDaysDiv');
    exemptDiv.style.display = isMustDo ? 'block' : 'none';
}

function onExemptAllChange(allId, dayName) {
    const checked = document.getElementById(allId).checked;
    document.querySelectorAll(`input[name="${dayName}"]`).forEach(cb => cb.checked = checked);
}

function onExemptDayChange(allId, dayName) {
    const checkboxes = document.querySelectorAll(`input[name="${dayName}"]`);
    document.getElementById(allId).checked = Array.from(checkboxes).every(cb => cb.checked);
}

function changeDate(days) {
    selectedDate.setDate(selectedDate.getDate() + days);
    document.getElementById('selectedDate').value = Storage.formatDate(selectedDate);
    renderAll();
}

function onDateChange() {
    const dateStr = document.getElementById('selectedDate').value;
    if (dateStr) {
        selectedDate = new Date(dateStr);
        renderAll();
    }
}

function goToToday() {
    selectedDate = new Date();
    document.getElementById('selectedDate').value = Storage.getTodayString();
    renderAll();
}

function changeMonth(months) {
    calendarDate.setMonth(calendarDate.getMonth() + months);
    renderCalendar();
}

function buyReward(rewardId, rewardName, rewardPoints, rewardType) {
    const coins = Storage.loadData('kids_tracker_points') || 0;
    
    if (coins < rewardPoints) {
        showToast('金币不足，继续加油！💪');
        return;
    }
    
    showConfirmModal(`确定要花费 ${rewardPoints} 金币购买「${rewardName}」吗？`, () => {
        Storage.redeemReward(rewardId, rewardName, rewardPoints, rewardType);
        renderAll();
        showToast('购买成功！🎉');
    });
}

function showAddRewardModal() {
    document.getElementById('addRewardModal').classList.add('show');
    document.getElementById('addRewardForm').reset();
}

function closeAddRewardModal() {
    document.getElementById('addRewardModal').classList.remove('show');
}

function showBonusModal() {
    document.getElementById('bonusModal').classList.add('show');
    document.getElementById('bonusForm').reset();
}

function closeBonusModal() {
    document.getElementById('bonusModal').classList.remove('show');
}

function showPenaltyModal() {
    document.getElementById('penaltyModal').classList.add('show');
    document.getElementById('penaltyForm').reset();
}

function closePenaltyModal() {
    document.getElementById('penaltyModal').classList.remove('show');
}

let confirmCallback = null;
let confirmCancelCallback = null;

function showConfirmModal(message, callback, btnText, cancelText, cancelCallback) {
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmModal').classList.add('show');
    confirmCallback = callback;
    
    const btn = document.getElementById('confirmActionBtn');
    btn.textContent = btnText || '确定';
    btn.onclick = () => {
        if (confirmCallback) {
            confirmCallback();
        }
        closeConfirmModal();
    };
    
    const cancelBtn = document.getElementById('confirmCancelBtn');
    cancelBtn.textContent = cancelText || '取消';
    confirmCancelCallback = cancelCallback || null;
}

function onConfirmCancel() {
    const cb = confirmCancelCallback;
    closeConfirmModal();
    if (cb) {
        cb();
    }
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('show');
    confirmCallback = null;
    confirmCancelCallback = null;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.innerHTML = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

const timers = {};
const timerStates = {};

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function startTimer(taskId, totalSeconds, event) {
    event.stopPropagation();
    
    if (timers[taskId]) {
        clearInterval(timers[taskId]);
    }
    
    const display = document.getElementById(`timer-display-${taskId}`);
    const startBtn = document.querySelector(`#timer-${taskId} .start-btn`);
    const pauseBtn = document.querySelector(`#timer-${taskId} .pause-btn`);
    const resetBtn = document.querySelector(`#timer-${taskId} .reset-btn`);
    const finishBtn = document.querySelector(`#timer-${taskId} .finish-btn`);
    
    let remaining = timerStates[taskId] && timerStates[taskId].remaining > 0 
        ? timerStates[taskId].remaining 
        : totalSeconds;
    
    timerStates[taskId] = { remaining, totalSeconds };
    
    startBtn.style.display = 'none';
    pauseBtn.style.display = 'inline-block';
    finishBtn.style.display = 'inline-block';
    
    timers[taskId] = setInterval(() => {
        remaining--;
        timerStates[taskId].remaining = remaining;
        display.textContent = formatTime(remaining);
        
        if (remaining <= 0) {
            clearInterval(timers[taskId]);
            timers[taskId] = null;
            display.textContent = '时间到！';
            pauseBtn.style.display = 'none';
            finishBtn.style.display = 'inline-block';
            showToast('时间到！');
            setTimeout(() => {
                finishTimerAndComplete(taskId, taskPoints, Storage.formatDate(selectedDate), false, null);
            }, 500);
        }
    }, 1000);
}

function pauseTimer(taskId, event) {
    event.stopPropagation();
    
    if (timers[taskId]) {
        clearInterval(timers[taskId]);
        timers[taskId] = null;
    }
    
    const startBtn = document.querySelector(`#timer-${taskId} .start-btn`);
    const pauseBtn = document.querySelector(`#timer-${taskId} .pause-btn`);
    
    startBtn.style.display = 'inline-block';
    pauseBtn.style.display = 'none';
}

function resetTimer(taskId, totalSeconds, event) {
    event.stopPropagation();
    
    if (timers[taskId]) {
        clearInterval(timers[taskId]);
        timers[taskId] = null;
    }
    
    const display = document.getElementById(`timer-display-${taskId}`);
    const startBtn = document.querySelector(`#timer-${taskId} .start-btn`);
    const pauseBtn = document.querySelector(`#timer-${taskId} .pause-btn`);
    const finishBtn = document.querySelector(`#timer-${taskId} .finish-btn`);
    
    display.textContent = formatTime(totalSeconds);
    timerStates[taskId] = { remaining: totalSeconds, totalSeconds };
    
    startBtn.style.display = 'inline-block';
    pauseBtn.style.display = 'none';
    finishBtn.style.display = 'none';
}

function finishTimerAndComplete(taskId, taskPoints, dateStr, isPast, event) {
    if (event) {
        event.stopPropagation();
    }
    
    if (timers[taskId]) {
        clearInterval(timers[taskId]);
        timers[taskId] = null;
    }
    
    showConfirmModal(`确定要完成这个任务吗？完成后将获得 ${taskPoints} 金币！`, () => {
        Storage.completeTask(taskId, taskPoints, dateStr);
        renderAll();
        showCoinAnimation();
        
        if (isPast) {
            showToast(`补打卡成功！获得 ${taskPoints} 金币 🪙`);
        } else {
            showToast(`太棒了！获得 ${taskPoints} 金币 🪙`);
        }
    });
}

function showManageTasksModal() {
    document.getElementById('manageTasksModal').classList.add('show');
    renderManageTaskList();
}

function closeManageTasksModal() {
    document.getElementById('manageTasksModal').classList.remove('show');
    renderAll();
}

function renderManageTaskList() {
    const tasks = Storage.loadData('kids_tracker_tasks') || [];
    const taskList = document.getElementById('manageTaskList');
    
    taskList.innerHTML = '';
    
    if (tasks.length === 0) {
        taskList.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">暂无任务</div>';
        return;
    }
    
    tasks.forEach(task => {
        const categoryText = getCategoryText(task.category);
        const item = document.createElement('div');
        item.className = 'manage-task-item';
        
        let mustDoTag = '';
        if (task.isMustDo) {
            mustDoTag = '<span class="must-do-tag">🔴 必做</span>';
        }
        
        item.innerHTML = `
            <div class="task-info">
                <div class="task-name">${task.name} ${mustDoTag}</div>
                <div class="task-meta">${categoryText} · +${task.points} 🪙</div>
            </div>
            <div class="task-actions-manage">
                <button class="edit-btn" onclick="editTask('${task.id}')">编辑</button>
                <button class="delete-btn" onclick="deleteTask('${task.id}')">删除</button>
            </div>
        `;
        taskList.appendChild(item);
    });
}

function editTask(taskId) {
    const tasks = Storage.loadData('kids_tracker_tasks') || [];
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
        showToast('任务不存在！');
        return;
    }
    
    document.getElementById('editTaskId').value = task.id;
    document.getElementById('editTaskName').value = task.name;
    document.getElementById('editTaskCategory').value = task.category.startsWith('custom_') ? 'custom' : task.category;
    document.getElementById('editCustomCategoryName').value = task.category.startsWith('custom_') ? decodeURIComponent(task.category.substring(7)) : '';
    document.getElementById('editTaskPoints').value = task.points;
    document.getElementById('editTaskTimer').value = task.hasTimer ? 'yes' : 'no';
    document.getElementById('editTaskTimerDuration').value = task.timerDuration || 30;
    document.getElementById('editTaskIsMustDo').value = task.isMustDo ? 'yes' : 'no';
    
    // Set exempt days
    const exemptCheckboxes = document.querySelectorAll('input[name="editExemptDay"]');
    exemptCheckboxes.forEach(cb => {
        cb.checked = task.exemptDays && task.exemptDays.includes(parseInt(cb.value));
    });
    onExemptDayChange('editExemptAll', 'editExemptDay');
    
    // Show/hide conditional fields
    onEditCategoryChange();
    onEditTimerChange();
    onEditMustDoChange();
    
    document.getElementById('editTaskModal').classList.add('show');
}

function closeEditTaskModal() {
    document.getElementById('editTaskModal').classList.remove('show');
    document.getElementById('editTaskForm').reset();
}

function deleteTask(taskId) {
    showConfirmModal('确定要删除这个任务吗？', () => {
        Storage.deleteTask(taskId);
        renderManageTaskList();
        showToast('任务删除成功！🗑️');
    });
}

function getWeekRange() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    return {
        start: formatDate(monday),
        end: formatDate(sunday),
        key: `${formatDate(monday)}-${formatDate(sunday)}`
    };
}

function calculateChallengeProgress() {
    const weekRange = getWeekRange();
    const tasks = Storage.loadData('kids_tracker_tasks') || [];
    const completedTasks = Storage.loadData('kids_tracker_completed_tasks') || {};
    const history = Storage.loadData('kids_tracker_history') || [];
    
    let weeklyCoins = 0;
    let sportDays = 0;
    let completeDays = 0;
    
    const startDate = new Date(weekRange.start);
    const endDate = new Date(weekRange.end);
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const dateStr = Storage.formatDate(currentDate);
        const dateMatchStr = dateStr.substring(5).replace('-', '/');
        
        history.forEach(item => {
            if (item.time && item.time.includes(dateMatchStr) && item.type === 'earn') {
                weeklyCoins += item.points;
            }
        });
        
        const dayCompleted = completedTasks[dateStr] || [];
        
        const sportTasks = tasks.filter(t => t.category === 'sport');
        const sportCompleted = sportTasks.every(st => dayCompleted.includes(st.id));
        if (sportTasks.length > 0 && sportCompleted) {
            sportDays++;
        }
        
        const allCompleted = tasks.length > 0 && tasks.every(t => dayCompleted.includes(t.id));
        if (allCompleted) {
            completeDays++;
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return {
        coins: weeklyCoins,
        sportDays,
        completeDays,
        weekKey: weekRange.key
    };
}

function checkWeekReset() {
    const progress = Storage.getChallengeProgress();
    const weekRange = getWeekRange();
    
    if (progress.lastWeek !== weekRange.key) {
        progress.coins = 0;
        progress.sportDays = 0;
        progress.completeDays = 0;
        progress.lastWeek = weekRange.key;
        progress.coinsRewardGiven = false;
        progress.sportRewardGiven = false;
        progress.completeRewardGiven = false;
        Storage.saveChallengeProgress(progress);
        
        checkAndAwardChallenges();
    }
}

function checkAndAwardChallenges() {
    const progress = Storage.getChallengeProgress();
    const currentProgress = calculateChallengeProgress();
    
    progress.coins = currentProgress.coins;
    progress.sportDays = currentProgress.sportDays;
    progress.completeDays = currentProgress.completeDays;
    
    let diamondsEarned = 0;
    
    if (progress.coins >= 400 && !progress.coinsRewardGiven) {
        diamondsEarned += 1;
        progress.coinsRewardGiven = true;
    }
    if (progress.sportDays >= 7 && !progress.sportRewardGiven) {
        diamondsEarned += 1;
        progress.sportRewardGiven = true;
    }
    if (progress.completeDays >= 7 && !progress.completeRewardGiven) {
        diamondsEarned += 3;
        progress.completeRewardGiven = true;
    }
    
    if (diamondsEarned > 0) {
        Storage.addDiamonds(diamondsEarned);
        Storage.addHistory('earn', `挑战奖励 +${diamondsEarned} 💎`, diamondsEarned);
        showToast(`🎉 恭喜！挑战达成，获得 ${diamondsEarned} 钻石！`);
    }
    
    Storage.saveChallengeProgress(progress);
}

function renderChallenge() {
    checkWeekReset();
    checkAndAwardChallenges();
    
    const weekRange = getWeekRange();
    document.getElementById('currentWeekRange').textContent = `${weekRange.start} ~ ${weekRange.end}`;
    
    const diamonds = Storage.getDiamonds();
    document.getElementById('totalDiamonds').textContent = diamonds;
    document.getElementById('rouletteDiamonds').textContent = diamonds;
    
    const tickets = Storage.getRouletteTickets();
    document.getElementById('rouletteTickets').textContent = tickets;
    
    const progress = calculateChallengeProgress();
    
    const coinsProgress = Math.min((progress.coins / 400) * 100, 100);
    document.getElementById('coinsProgress').style.width = `${coinsProgress}%`;
    document.getElementById('coinsCurrent').textContent = progress.coins;
    document.getElementById('coinsStatus').textContent = progress.coins >= 400 ? '✅ 已完成' : '🔄 进行中';
    document.getElementById('coinsStatus').className = `challenge-status ${progress.coins >= 400 ? 'completed' : 'in-progress'}`;
    
    const sportProgress = Math.min((progress.sportDays / 7) * 100, 100);
    document.getElementById('sportProgress').style.width = `${sportProgress}%`;
    document.getElementById('sportCurrent').textContent = progress.sportDays;
    document.getElementById('sportStatus').textContent = progress.sportDays >= 7 ? '✅ 已完成' : '🔄 进行中';
    document.getElementById('sportStatus').className = `challenge-status ${progress.sportDays >= 7 ? 'completed' : 'in-progress'}`;
    
    const completeProgress = Math.min((progress.completeDays / 7) * 100, 100);
    document.getElementById('completeProgress').style.width = `${completeProgress}%`;
    document.getElementById('completeCurrent').textContent = progress.completeDays;
    document.getElementById('completeStatus').textContent = progress.completeDays >= 7 ? '✅ 已完成' : '🔄 进行中';
    document.getElementById('completeStatus').className = `challenge-status ${progress.completeDays >= 7 ? 'completed' : 'in-progress'}`;
    
    const rouletteBtn = document.querySelector('.roulette-play-btn');
    rouletteBtn.disabled = tickets < 1;
    rouletteBtn.className = `roulette-play-btn ${tickets < 1 ? 'disabled' : ''}`;
}

function buyRouletteTicket() {
    const diamonds = Storage.getDiamonds();
    if (diamonds < 3) {
        showToast('钻石不足！需要 3 钻石兑换一次转盘机会 💎');
        return;
    }
    
    showConfirmModal('确定要花费 3 钻石兑换一次转盘机会吗？', () => {
        Storage.spendDiamonds(3);
        Storage.addRouletteTickets(1);
        Storage.addHistory('spend', '兑换转盘机会 -3 💎', -3);
        renderChallenge();
        showToast('兑换成功！获得一次转盘机会 🎰');
    });
}

let diamondSecretClicks = 0;
let diamondSecretTimer = null;

function diamondSecretClick(e) {
    e.stopPropagation();
    diamondSecretClicks++;
    if (diamondSecretTimer) clearTimeout(diamondSecretTimer);
    diamondSecretTimer = setTimeout(() => { diamondSecretClicks = 0; }, 1500);
    if (diamondSecretClicks >= 3) {
        diamondSecretClicks = 0;
        openAdminModal();
    }
}

function openAdminModal() {
    const pwd = localStorage.getItem('kids_tracker_admin_pwd');
    const step1 = document.getElementById('adminStep1');
    const step2 = document.getElementById('adminStep2');
    const pwdTitle = document.getElementById('adminPwdTitle');
    const pwdInput = document.getElementById('adminPwdInput');
    
    step1.style.display = 'block';
    step2.style.display = 'none';
    pwdInput.value = '';
    pwdInput.type = 'password';
    
    if (pwd) {
        pwdTitle.textContent = '请输入6位数字密码';
    } else {
        pwdTitle.textContent = '首次使用，请设置6位数字密码';
    }
    
    document.getElementById('adminModal').classList.add('show');
    setTimeout(() => pwdInput.focus(), 100);
}

function closeAdminModal() {
    document.getElementById('adminModal').classList.remove('show');
}

function adminSubmitPwd() {
    const input = document.getElementById('adminPwdInput').value.trim();
    const pwd = localStorage.getItem('kids_tracker_admin_pwd');
    
    if (!/^\d{6}$/.test(input)) {
        showToast('请输入6位数字密码');
        return;
    }
    
    if (!pwd) {
        localStorage.setItem('kids_tracker_admin_pwd', input);
        showToast('密码设置成功');
        showAdminStep2();
    } else if (input === pwd) {
        showAdminStep2();
    } else {
        showToast('密码错误，请重试');
        document.getElementById('adminPwdInput').value = '';
    }
}

function showAdminStep2() {
    document.getElementById('adminStep1').style.display = 'none';
    document.getElementById('adminStep2').style.display = 'block';
    document.getElementById('adminCurrentDiamonds').textContent = Storage.getDiamonds();
    document.getElementById('adminDiamondInput').value = '';
}

function adminSetDiamonds() {
    const val = document.getElementById('adminDiamondInput').value.trim();
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0) {
        showToast('请输入有效的钻石数量');
        return;
    }
    Storage.saveData('kids_tracker_diamonds', num);
    renderChallenge();
    showToast(`钻石已修改为 ${num} 💎`);
    closeAdminModal();
}

function showRouletteModal() {
    const tickets = Storage.getRouletteTickets();
    if (tickets < 1) {
        showToast('转盘次数不足！请先兑换 💎');
        return;
    }
    
    drawRoulette();
    
    document.getElementById('rouletteModal').classList.add('show');
    document.getElementById('rouletteWheel').style.transform = 'rotate(0deg)';
}

function closeRouletteModal() {
    document.getElementById('rouletteModal').classList.remove('show');
}

function updateRouletteReward(index, text) {
    Storage.saveRouletteReward(index, text);
    drawRoulette();
    showToast('奖励已保存！');
}

function showEditRewardsModal() {
    const rewards = Storage.getRouletteRewards();
    const modal = document.getElementById('editRewardsModal');
    const container = document.getElementById('editRewardsContainer');
    
    container.innerHTML = '';
    
    rewards.forEach((reward, index) => {
        if (index === 0 || index === 1 || index === 4) {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.marginBottom = '10px';
            div.innerHTML = `
                <span style="width: 60px; font-weight: bold;">${reward}</span>
                <span style="color: #666; font-size: 14px;">(固定项)</span>
            `;
            container.appendChild(div);
        } else {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.gap = '10px';
            div.style.marginBottom = '10px';
            div.innerHTML = `
                <span style="width: 40px; font-weight: bold;">#${index + 1}</span>
                <input type="text" value="${reward}" onchange="updateRouletteReward(${index}, this.value)" 
                       style="flex: 1; padding: 8px; border: 2px solid #8B4513; border-radius: 8px; font-size: 16px;">
            `;
            container.appendChild(div);
        }
    });
    
    modal.classList.add('show');
}

function closeEditRewardsModal() {
    document.getElementById('editRewardsModal').classList.remove('show');
}

let isSpinning = false;
let hasCompletedFirstSpin = false;
let currentAngle = 0;
let spinSpeed = 0;
let spinAnimationId = null;

const ROULETTE_COLORS = [
    '#4CAF50',
    '#2196F3',
    '#FF9800',
    '#9C27B0',
    '#FF6B6B',
    '#00BCD4',
    '#FFD700',
    '#E91E63'
];

function drawRoulette() {
    const canvas = document.getElementById('rouletteCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2 - 4;
    const sectorAngle = (2 * Math.PI) / 8;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const rewards = Storage.getRouletteRewards();
    
    for (let i = 0; i < 8; i++) {
              const startAngle = i * (Math.PI / 4) - Math.PI / 2;
              const endAngle = startAngle + Math.PI / 4;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        
        const gradient = ctx.createLinearGradient(centerX, centerY, centerX + radius, centerY + radius);
        gradient.addColorStop(0, ROULETTE_COLORS[i]);
        gradient.addColorStop(1, adjustColor(ROULETTE_COLORS[i], -30));
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        const textAngle = startAngle + sectorAngle / 2;
        const textRadius = radius * 0.6;
        const textX = centerX + Math.cos(textAngle) * textRadius;
        const textY = centerY + Math.sin(textAngle) * textRadius;
        
        ctx.save();
        ctx.translate(textX, textY);
        ctx.rotate(textAngle + Math.PI / 2);
        
        ctx.fillStyle = i === 6 ? '#8B4513' : '#fff';
        ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        let reward = rewards[i];
        reward = reward.replace('🔄', '');
        
        const maxCharsPerLine = 4;
        const lines = [];
        for (let j = 0; j < reward.length; j += maxCharsPerLine) {
            lines.push(reward.substring(j, j + maxCharsPerLine));
        }
        
        lines.forEach((line, idx) => {
            ctx.fillText(line, 0, idx * 22 - (lines.length - 1) * 11);
        });
        
        ctx.restore();
    }
}

function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function spinRoulette() {
    if (isSpinning) return;
    
    if (spinAnimationId) {
        cancelAnimationFrame(spinAnimationId);
        spinAnimationId = null;
    }
    
    const tickets = Storage.getRouletteTickets();
    if (tickets < 1) {
        showToast('转盘次数不足！请先兑换 💎');
        return;
    }
    
    const rewards = Storage.getRouletteRewards();
    const emptyRewards = rewards.filter((r, i) => i >= 2 && r.trim() === '请点击输入');
    if (emptyRewards.length > 0 && !hasCompletedFirstSpin) {
        showConfirmModal('请先完成所有自定义奖励项目的输入！', () => {});
        return;
    }
    
    isSpinning = true;
    const spinBtn = document.querySelector('.roulette-spin-btn');
    spinBtn.disabled = true;
    
    Storage.spendRouletteTicket();
    document.getElementById('rouletteTickets').textContent = Storage.getRouletteTickets();
    
    const sectorAngle = 45;
    const extraSpins = 8 + Math.floor(Math.random() * 10);
    
    const array = new Uint32Array(2);
    crypto.getRandomValues(array);
    const randomStartAngle = (array[0] / 0x100000000) * 360;
    const randomOffset = (array[1] / 0x100000000) * sectorAngle;
    
    currentAngle = randomStartAngle;
    
    const totalRotation = (360 * extraSpins) + randomOffset;
    const targetAngle = currentAngle + totalRotation;
    
    const totalDuration = 5000 + Math.random() * 2000;
    const startTime = Date.now();
    
    spinAnimationId = requestAnimationFrame(function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / totalDuration, 1);
        
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const currentTargetAngle = currentAngle + (targetAngle - currentAngle) * easeOutCubic;
        
        const wheel = document.getElementById('rouletteWheel');
        wheel.style.transition = 'none';
        wheel.style.transform = `rotate(${currentTargetAngle}deg)`;
        
        if (progress < 1) {
            spinAnimationId = requestAnimationFrame(animate);
        } else {
            currentAngle = targetAngle;
            
            const normalizedAngle = ((currentAngle % 360) + 360) % 360;
            const adjustedAngle = (normalizedAngle + 0.5) % 360;
            let rewardIndex = Math.floor(-adjustedAngle / sectorAngle);
            rewardIndex = ((rewardIndex % 8) + 8) % 8;
            
            isSpinning = false;
            spinBtn.disabled = false;
            hasCompletedFirstSpin = true;
            
            const reward = rewards[rewardIndex];
            
            if (reward === '🔄再来一次' || reward === '再来一次') {
                Storage.addRouletteTickets(1);
                document.getElementById('rouletteTickets').textContent = Storage.getRouletteTickets();
                showFireworks();
                showConfirmModal('🎉 恭喜！获得再来一次机会！', () => {
                    showToast('可以免费再转一次！');
                });
            } else if (reward.includes('20金币')) {
                Storage.addPoints(20);
                Storage.addHistory('earn', '转盘奖励 +20 金币', 20);
                showCoinAnimation();
                showFireworks();
                showConfirmModal('🎉 恭喜！获得 20 金币！', () => {
                    showToast('金币已到账！');
                });
            } else if (reward.includes('10金币')) {
                Storage.addPoints(10);
                Storage.addHistory('earn', '转盘奖励 +10 金币', 10);
                showCoinAnimation();
                showFireworks();
                showConfirmModal('🎉 恭喜！获得 10 金币！', () => {
                    showToast('金币已到账！');
                });
            } else {
                showFireworks();
                showConfirmModal(`🎉 恭喜！你获得了「${reward}」！\n\n请手动兑现奖励。`, () => {
                    showToast('奖励已记录，请手动领取！');
                });
            }
            
            renderAll();
        }
    });
}

function showFireworks() {
    const colors = ['#FFD700', '#FF6B6B', '#4CAF50', '#2196F3', '#9C27B0', '#FF9800'];
    
    for (let i = 0; i < 20; i++) {
        const firework = document.createElement('div');
        firework.className = 'firework';
        firework.style.left = `${Math.random() * 100}%`;
        firework.style.top = `${Math.random() * 60 + 20}%`;
        firework.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        firework.style.animationDelay = `${Math.random() * 0.5}s`;
        firework.style.animationDuration = `${0.8 + Math.random() * 0.4}s`;
        firework.style.width = `${4 + Math.random() * 6}px`;
        firework.style.height = firework.style.width;
        document.body.appendChild(firework);
        
        setTimeout(() => {
            firework.remove();
        }, 1500);
    }
}

document.addEventListener('DOMContentLoaded', initApp);