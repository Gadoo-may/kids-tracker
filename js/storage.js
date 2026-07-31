const STORAGE_KEYS = {
    CHARACTERS: 'kids_tracker_characters',
    CURRENT_CHARACTER: 'kids_tracker_current_character',
    POINTS: 'kids_tracker_points',
    TASKS: 'kids_tracker_tasks',
    REWARDS: 'kids_tracker_rewards',
    HISTORY: 'kids_tracker_history',
    COMPLETED_TASKS: 'kids_tracker_completed_tasks',
    STREAK: 'kids_tracker_streak',
    MAX_STREAK: 'kids_tracker_max_streak',
    DIAMONDS: 'kids_tracker_diamonds',
    CHALLENGE_PROGRESS: 'kids_tracker_challenge_progress',
    ROULETTE_TICKETS: 'kids_tracker_roulette_tickets',
    ROULETTE_REWARDS: 'kids_tracker_roulette_rewards'
};

const CHARACTER_AVATARS = [
    '🦸', '🦹', '🧙', '🧝', '👸', '🤴', '🧛', '👻',
    '🐱', '🐶', '🐰', '🦊', '🐼', '🦁', '🐸', '🐵'
];

const DEFAULT_DATA = {
    points: 0,
    tasks: [],
    rewards: [
        {
            id: '1',
            name: '超级蘑菇',
            points: 50,
            emoji: '🍄'
        },
        {
            id: '2',
            name: '火焰花',
            points: 30,
            emoji: '🌺'
        },
        {
            id: '3',
            name: '星星',
            points: 100,
            emoji: '⭐'
        },
        {
            id: '4',
            name: '金币',
            points: 200,
            emoji: '🪙'
        },
        {
            id: '5',
            name: '1UP',
            points: 40,
            emoji: '❤️'
        },
        {
            id: '6',
            name: '飞行帽',
            points: 150,
            emoji: '🧢'
        }
    ],
    history: [],
    completedTasks: {},
    streak: {
        current: 0,
        lastDate: null
    },
    maxStreak: 0
};

let currentCharacterId = null;

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getTodayString() {
    const now = new Date();
    return formatDate(now);
}

function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getCharacterKey(key, characterId) {
    const id = characterId || currentCharacterId;
    if (!id) return key;
    return `${id}_${key}`;
}

function loadData(key, characterId) {
    try {
        const data = localStorage.getItem(getCharacterKey(key, characterId));
        if (data) {
            return JSON.parse(data);
        }
        return null;
    } catch (e) {
        console.error('Failed to load data:', e);
        return null;
    }
}

function saveData(key, value) {
    try {
        localStorage.setItem(getCharacterKey(key), JSON.stringify(value));
        return true;
    } catch (e) {
        console.error('Failed to save data:', e);
        return false;
    }
}

function loadCharacters() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.CHARACTERS);
        if (data) {
            return JSON.parse(data);
        }
        return [];
    } catch (e) {
        console.error('Failed to load characters:', e);
        return [];
    }
}

function saveCharacters(characters) {
    try {
        localStorage.setItem(STORAGE_KEYS.CHARACTERS, JSON.stringify(characters));
        return true;
    } catch (e) {
        console.error('Failed to save characters:', e);
        return false;
    }
}

function createCharacter(name, avatar) {
    const characters = loadCharacters();
    const newCharacter = {
        id: generateId(),
        name,
        avatar,
        createdAt: Date.now(),
        lastPlayed: Date.now()
    };
    characters.push(newCharacter);
    saveCharacters(characters);
    return newCharacter;
}

function deleteCharacter(characterId) {
    const characters = loadCharacters();
    const updatedCharacters = characters.filter(c => c.id !== characterId);
    saveCharacters(updatedCharacters);
    
    if (currentCharacterId === characterId) {
        currentCharacterId = null;
        localStorage.removeItem(STORAGE_KEYS.CURRENT_CHARACTER);
    }
    
    return updatedCharacters;
}

function setCurrentCharacter(characterId) {
    currentCharacterId = characterId;
    localStorage.setItem(STORAGE_KEYS.CURRENT_CHARACTER, characterId);
    
    const characters = loadCharacters();
    const character = characters.find(c => c.id === characterId);
    if (character) {
        character.lastPlayed = Date.now();
        saveCharacters(characters);
    }
}

function getCurrentCharacter() {
    if (!currentCharacterId) {
        currentCharacterId = localStorage.getItem(STORAGE_KEYS.CURRENT_CHARACTER);
    }
    
    if (currentCharacterId) {
        const characters = loadCharacters();
        return characters.find(c => c.id === currentCharacterId);
    }
    return null;
}

function initData() {
    let points = loadData(STORAGE_KEYS.POINTS);
    let tasks = loadData(STORAGE_KEYS.TASKS);
    let rewards = loadData(STORAGE_KEYS.REWARDS);
    let history = loadData(STORAGE_KEYS.HISTORY);
    let completedTasks = loadData(STORAGE_KEYS.COMPLETED_TASKS);
    let streak = loadData(STORAGE_KEYS.STREAK);
    let maxStreak = loadData(STORAGE_KEYS.MAX_STREAK);

    if (points === null) {
        points = DEFAULT_DATA.points;
        saveData(STORAGE_KEYS.POINTS, points);
    }

    if (tasks === null) {
        tasks = [];
        saveData(STORAGE_KEYS.TASKS, tasks);
    }

    if (rewards === null) {
        rewards = [];
        saveData(STORAGE_KEYS.REWARDS, rewards);
    }

    if (history === null) {
        history = DEFAULT_DATA.history;
        saveData(STORAGE_KEYS.HISTORY, history);
    }

    if (completedTasks === null) {
        completedTasks = DEFAULT_DATA.completedTasks;
        saveData(STORAGE_KEYS.COMPLETED_TASKS, completedTasks);
    }

    if (streak === null) {
        streak = DEFAULT_DATA.streak;
        saveData(STORAGE_KEYS.STREAK, streak);
    }

    if (maxStreak === null) {
        maxStreak = DEFAULT_DATA.maxStreak;
        saveData(STORAGE_KEYS.MAX_STREAK, maxStreak);
    }

    let diamonds = loadData(STORAGE_KEYS.DIAMONDS);
    if (diamonds === null) {
        diamonds = 0;
        saveData(STORAGE_KEYS.DIAMONDS, diamonds);
    }

    updateStreak();

    return {
        points,
        tasks,
        rewards,
        history,
        completedTasks,
        streak,
        maxStreak
    };
}

function updateStreak() {
    const streak = loadData(STORAGE_KEYS.STREAK);
    const today = getTodayString();

    if (!streak.lastDate) {
        streak.current = 0;
        saveData(STORAGE_KEYS.STREAK, streak);
        return;
    }

    const lastDate = new Date(streak.lastDate);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
        streak.current++;
        streak.lastDate = today;
        saveData(STORAGE_KEYS.STREAK, streak);
        updateMaxStreak(streak.current);
    } else if (diffDays > 1) {
        streak.current = 0;
        saveData(STORAGE_KEYS.STREAK, streak);
    }
}

function updateMaxStreak(currentStreak) {
    const maxStreak = loadData(STORAGE_KEYS.MAX_STREAK) || 0;
    if (currentStreak > maxStreak) {
        saveData(STORAGE_KEYS.MAX_STREAK, currentStreak);
    }
}

function checkTaskCompleted(taskId, dateStr) {
    const completedTasks = loadData(STORAGE_KEYS.COMPLETED_TASKS);
    
    if (!completedTasks[dateStr]) {
        return false;
    }

    return completedTasks[dateStr].includes(taskId);
}

function completeTask(taskId, taskPoints, dateStr) {
    const completedTasks = loadData(STORAGE_KEYS.COMPLETED_TASKS);
    
    if (!completedTasks[dateStr]) {
        completedTasks[dateStr] = [];
    }

    if (completedTasks[dateStr].includes(taskId)) {
        return false;
    }

    completedTasks[dateStr].push(taskId);
    saveData(STORAGE_KEYS.COMPLETED_TASKS, completedTasks);

    addPoints(taskPoints);
    
    const today = getTodayString();
    if (dateStr === today) {
        addHistory('earn', `完成任务 +${taskPoints}`, taskPoints);
        updateStreakAfterCompletion();
    } else {
        addHistory('earn', `补打卡 +${taskPoints}`, taskPoints);
    }

    return true;
}

function updateStreakAfterCompletion() {
    const streak = loadData(STORAGE_KEYS.STREAK);
    const today = getTodayString();

    if (streak.lastDate !== today) {
        streak.lastDate = today;
        if (streak.current === 0) {
            streak.current = 1;
        }
        saveData(STORAGE_KEYS.STREAK, streak);
        updateMaxStreak(streak.current);
    }
}

function addPoints(points) {
    const currentPoints = loadData(STORAGE_KEYS.POINTS) || 0;
    const newPoints = currentPoints + points;
    saveData(STORAGE_KEYS.POINTS, newPoints);
    return newPoints;
}

function spendPoints(points) {
    const currentPoints = loadData(STORAGE_KEYS.POINTS) || 0;
    
    if (currentPoints < points) {
        return false;
    }

    const newPoints = currentPoints - points;
    saveData(STORAGE_KEYS.POINTS, newPoints);
    return newPoints;
}

function redeemReward(rewardId, rewardName, rewardPoints, rewardType) {
    const result = spendPoints(rewardPoints);
    
    if (result !== false) {
        addHistory('spend', `购买商品: ${rewardName} -${rewardPoints}`, -rewardPoints);
        
        if (rewardType === 'one-time') {
            let rewards = loadData(STORAGE_KEYS.REWARDS) || [];
            rewards = rewards.filter(r => r.id !== rewardId);
            saveData(STORAGE_KEYS.REWARDS, rewards);
        }
        
        return true;
    }
    
    return false;
}

function deductPoints(reason, points) {
    const currentPoints = loadData(STORAGE_KEYS.POINTS) || 0;
    
    if (currentPoints < points) {
        return false;
    }

    const newPoints = currentPoints - points;
    saveData(STORAGE_KEYS.POINTS, newPoints);
    
    addHistory('penalty', `扣分: ${reason} -${points}`, -points);
    return newPoints;
}

function addHistory(type, title, points) {
    const history = loadData(STORAGE_KEYS.HISTORY) || [];
    const now = new Date();
    
    history.unshift({
        id: generateId(),
        type,
        title,
        points,
        time: now.toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }),
        timestamp: now.getTime()
    });

    if (history.length > 100) {
        history.pop();
    }

    saveData(STORAGE_KEYS.HISTORY, history);
}

function addTask(task) {
    const tasks = loadData(STORAGE_KEYS.TASKS) || [];
    const newTask = {
        id: generateId(),
        ...task
    };
    tasks.push(newTask);
    saveData(STORAGE_KEYS.TASKS, tasks);
    return newTask;
}

function deleteTask(taskId) {
    const tasks = loadData(STORAGE_KEYS.TASKS) || [];
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    saveData(STORAGE_KEYS.TASKS, updatedTasks);
    return updatedTasks;
}

function addReward(reward) {
    const rewards = loadData(STORAGE_KEYS.REWARDS) || [];
    const newReward = {
        id: generateId(),
        emoji: ['🍄', '🌺', '⭐', '🪙', '❤️', '🧢', '🚩', '🍩'][Math.floor(Math.random() * 8)],
        ...reward
    };
    rewards.push(newReward);
    saveData(STORAGE_KEYS.REWARDS, rewards);
    return newReward;
}

function deleteReward(rewardId) {
    const rewards = loadData(STORAGE_KEYS.REWARDS) || [];
    const updatedRewards = rewards.filter(reward => reward.id !== rewardId);
    saveData(STORAGE_KEYS.REWARDS, updatedRewards);
    return updatedRewards;
}

function getDateStats(dateStr) {
    const completedTasks = loadData(STORAGE_KEYS.COMPLETED_TASKS);
    const tasks = loadData(STORAGE_KEYS.TASKS);

    const completedToday = completedTasks[dateStr] ? completedTasks[dateStr].length : 0;
    const totalTasks = tasks ? tasks.length : 0;

    return {
        completed: completedToday,
        pending: totalTasks - completedToday,
        total: totalTasks
    };
}

function getCalendarMonthStats(year, month) {
    const completedTasks = loadData(STORAGE_KEYS.COMPLETED_TASKS);
    const tasks = loadData(STORAGE_KEYS.TASKS);
    const totalTasks = tasks ? tasks.length : 0;
    
    const stats = {};
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const completed = completedTasks[dateStr] ? completedTasks[dateStr].length : 0;
        
        let status = 'none';
        if (completed === totalTasks && totalTasks > 0) {
            status = 'completed';
        } else if (completed > 0) {
            status = 'partial';
        }
        
        stats[dateStr] = {
            completed,
            total: totalTasks,
            status
        };
    }
    
    return stats;
}

function getTotalStats() {
    const history = loadData(STORAGE_KEYS.HISTORY) || [];
    const maxStreak = loadData(STORAGE_KEYS.MAX_STREAK) || 0;
    
    const totalCompleted = history.filter(item => item.type === 'earn').length;
    const totalEarned = history
        .filter(item => item.type === 'earn')
        .reduce((sum, item) => sum + item.points, 0);
    const totalSpent = Math.abs(
        history
            .filter(item => item.type === 'spend')
            .reduce((sum, item) => sum + item.points, 0)
    );

    return {
        totalCompleted,
        totalEarned,
        totalSpent,
        maxStreak
    };
}

function getDiamonds() {
    return loadData(STORAGE_KEYS.DIAMONDS) || 0;
}

function addDiamonds(count) {
    const diamonds = getDiamonds();
    saveData(STORAGE_KEYS.DIAMONDS, diamonds + count);
    return diamonds + count;
}

function spendDiamonds(count) {
    const diamonds = getDiamonds();
    if (diamonds < count) {
        return false;
    }
    saveData(STORAGE_KEYS.DIAMONDS, diamonds - count);
    return diamonds - count;
}

function getChallengeProgress() {
    return loadData(STORAGE_KEYS.CHALLENGE_PROGRESS) || {
        coins: 0,
        sportDays: 0,
        completeDays: 0,
        lastWeek: '',
        coinsRewardGiven: false,
        sportRewardGiven: false,
        completeRewardGiven: false
    };
}

function saveChallengeProgress(progress) {
    saveData(STORAGE_KEYS.CHALLENGE_PROGRESS, progress);
}

function getRouletteTickets() {
    return loadData(STORAGE_KEYS.ROULETTE_TICKETS) || 0;
}

function addRouletteTickets(count) {
    const tickets = getRouletteTickets();
    saveData(STORAGE_KEYS.ROULETTE_TICKETS, tickets + count);
    return tickets + count;
}

function spendRouletteTicket() {
    const tickets = getRouletteTickets();
    if (tickets < 1) {
        return false;
    }
    saveData(STORAGE_KEYS.ROULETTE_TICKETS, tickets - 1);
    return tickets - 1;
}

function getRouletteRewards() {
    const rewards = loadData(STORAGE_KEYS.ROULETTE_REWARDS);
    if (rewards) {
        return rewards;
    }
    return ['🔄再来一次', '10金币', '20金币', '请点击输入', '10金币', '请点击输入', '请点击输入', '请点击输入'];
}

function saveRouletteReward(index, text) {
    const rewards = getRouletteRewards();
    rewards[index] = text || '请点击输入';
    saveData(STORAGE_KEYS.ROULETTE_REWARDS, rewards);
}

const Storage = {
    initData,
    loadData,
    saveData,
    generateId,
    getTodayString,
    formatDate,
    checkTaskCompleted,
    completeTask,
    addPoints,
    spendPoints,
    redeemReward,
    deductPoints,
    addHistory,
    addTask,
    deleteTask,
    addReward,
    deleteReward,
    getDateStats,
    getCalendarMonthStats,
    getTotalStats,
    updateStreak,
    loadCharacters,
    saveCharacters,
    createCharacter,
    deleteCharacter,
    setCurrentCharacter,
    getCurrentCharacter,
    CHARACTER_AVATARS,
    getDiamonds,
    addDiamonds,
    spendDiamonds,
    getChallengeProgress,
    saveChallengeProgress,
    getRouletteTickets,
    addRouletteTickets,
    spendRouletteTicket,
    getRouletteRewards,
    saveRouletteReward
};