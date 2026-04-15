// ========== DOM ELEMENTS ==========
const timerDisplay = document.getElementById('timerDisplay');
const phaseLabel = document.getElementById('phaseLabel');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const skipBtn = document.getElementById('skipBtn');
const cycleCountSpan = document.getElementById('cycleCount');
const totalCyclesSpan = document.getElementById('totalCycles');
const statusBadge = document.getElementById('statusBadge');
const progressRing = document.getElementById('progressRing');

// Task elements
const currentTaskSpan = document.getElementById('currentTask');
const newTaskInput = document.getElementById('newTaskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');

// Settings elements
const workMinutesInput = document.getElementById('workMinutes');
const breakMinutesInput = document.getElementById('breakMinutes');
const longBreakMinutesInput = document.getElementById('longBreakMinutes');
const cyclesToLongBreakInput = document.getElementById('cyclesToLongBreak');

// Toggle elements
const toggleTasks = document.getElementById('toggleTasks');
const toggleSettings = document.getElementById('toggleSettings');
const toggleInfo = document.getElementById('toggleInfo');
const taskContent = document.getElementById('taskContent');
const settingsContent = document.getElementById('settingsContent');
const infoContent = document.getElementById('infoContent');

// ========== TIMER STATE ==========
let timerInterval = null;
let isRunning = false;
let currentPhase = 'work'; // 'work', 'break', 'longBreak'
let timeLeftSeconds = 25 * 60;
let totalSecondsForCurrentPhase = 25 * 60;

// CYCLE TRACKING - FIXED
let pomodorosCompleted = 0;      // Total work sessions completed ever
let pomodorosSinceLastLongBreak = 0;  // Work sessions since last long break

// ========== HELPER FUNCTIONS ==========
function getWorkSeconds() { 
    return workMinutesInput.valueAsNumber * 60; 
}

function getBreakSeconds() { 
    return breakMinutesInput.valueAsNumber * 60; 
}

function getLongBreakSeconds() { 
    return longBreakMinutesInput.valueAsNumber * 60; 
}

function getCyclesToLongBreak() { 
    return cyclesToLongBreakInput.valueAsNumber; 
}

function updateCycleDisplay() {
    // Show: "X / Y" where X is pomodoros since last long break, Y is cycles needed
    cycleCountSpan.textContent = pomodorosSinceLastLongBreak;
    totalCyclesSpan.textContent = getCyclesToLongBreak();
}

function updateProgressRing() {
    if (totalSecondsForCurrentPhase <= 0) return;
    const circumference = 974;
    const progress = timeLeftSeconds / totalSecondsForCurrentPhase;
    const offset = circumference * (1 - progress);
    progressRing.style.strokeDasharray = `${circumference}`;
    progressRing.style.strokeDashoffset = `${offset}`;
}

function updateDisplay() {
    const mins = Math.floor(timeLeftSeconds / 60);
    const secs = timeLeftSeconds % 60;
    timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    // Update phase label and style
    if (currentPhase === 'work') {
        phaseLabel.textContent = 'FOCUS';
        phaseLabel.style.color = '#a8c0ff';
    } else if (currentPhase === 'break') {
        phaseLabel.textContent = 'BREAK';
        phaseLabel.style.color = '#c084fc';
    } else {
        phaseLabel.textContent = 'LONG BREAK';
        phaseLabel.style.color = '#fbbf24';
    }
    
    updateProgressRing();
}

function sendNotification(title, body) {
    if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '🍅' });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
    playBeep();
}

function playBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.frequency.value = 880;
        gainNode.gain.value = 0.2;
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5);
        oscillator.stop(audioCtx.currentTime + 0.3);
    } catch(e) { 
        console.log('Audio not supported'); 
    }
}

// ========== CORE TIMER LOGIC - COMPLETELY FIXED ==========
function switchToNextPhase() {
    if (currentPhase === 'work') {
        // WORK SESSION JUST FINISHED
        pomodorosCompleted++;
        pomodorosSinceLastLongBreak++;
        
        console.log(`Pomodoro completed! Total: ${pomodorosCompleted}, Since last long break: ${pomodorosSinceLastLongBreak}`);
        
        // Check if we need a LONG BREAK
        const cyclesNeeded = getCyclesToLongBreak();
        
        if (pomodorosSinceLastLongBreak >= cyclesNeeded) {
            // TIME FOR LONG BREAK
            currentPhase = 'longBreak';
            timeLeftSeconds = getLongBreakSeconds();
            totalSecondsForCurrentPhase = getLongBreakSeconds();
            sendNotification('🎉 Long Break Time!', `You've completed ${cyclesNeeded} pomodoros! Take a ${longBreakMinutesInput.valueAsNumber} minute break.`);
            
            // RESET the counter after long break
            pomodorosSinceLastLongBreak = 0;
        } else {
            // Regular short break
            currentPhase = 'break';
            timeLeftSeconds = getBreakSeconds();
            totalSecondsForCurrentPhase = getBreakSeconds();
            sendNotification('✅ Break Time!', `Take a ${breakMinutesInput.valueAsNumber} minute break. ${cyclesNeeded - pomodorosSinceLastLongBreak} more until long break.`);
        }
        
        // Update the cycle display
        updateCycleDisplay();
        
    } else {
        // BREAK or LONG BREAK finished - go back to WORK
        currentPhase = 'work';
        timeLeftSeconds = getWorkSeconds();
        totalSecondsForCurrentPhase = getWorkSeconds();
        
        const cyclesNeeded = getCyclesToLongBreak();
        const remaining = cyclesNeeded - pomodorosSinceLastLongBreak;
        sendNotification('🍅 Focus Time!', `Get back to work! ${remaining} pomodoros until long break.`);
    }
    
    updateDisplay();
    saveToLocalStorage();
}

function tick() {
    if (!isRunning) return;
    
    if (timeLeftSeconds <= 0) {
        switchToNextPhase();
    } else {
        timeLeftSeconds--;
        updateDisplay();
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    isRunning = true;
    timerInterval = setInterval(tick, 1000);
    startBtn.style.display = 'none';
    pauseBtn.style.display = 'flex';
    statusBadge.innerHTML = '● Running';
    statusBadge.style.color = '#4ade80';
    document.querySelector('.timer-card')?.classList.add('active');
    saveToLocalStorage();
}

function pauseTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isRunning = false;
    startBtn.style.display = 'flex';
    pauseBtn.style.display = 'none';
    statusBadge.innerHTML = '⏸ Paused';
    statusBadge.style.color = '#fbbf24';
    document.querySelector('.timer-card')?.classList.remove('active');
    saveToLocalStorage();
}

function resetTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    isRunning = false;
    currentPhase = 'work';
    pomodorosCompleted = 0;
    pomodorosSinceLastLongBreak = 0;
    timeLeftSeconds = getWorkSeconds();
    totalSecondsForCurrentPhase = getWorkSeconds();
    
    updateCycleDisplay();
    startBtn.style.display = 'flex';
    pauseBtn.style.display = 'none';
    statusBadge.innerHTML = '● Auto Mode';
    statusBadge.style.color = '#a8c0ff';
    document.querySelector('.timer-card')?.classList.remove('active');
    updateDisplay();
    saveToLocalStorage();
}

function skipPhase() {
    // Stop current timer
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        isRunning = false;
    }
    
    // Move to next phase
    switchToNextPhase();
    
    // Restart timer if it was running before
    if (startBtn.style.display === 'none') {
        startTimer();
    }
    
    saveToLocalStorage();
}

// ========== TASK FUNCTIONS ==========
function loadTasks() {
    const tasks = JSON.parse(localStorage.getItem('focusflow_tasks') || '[]');
    const currentTask = localStorage.getItem('focusflow_currentTask') || 'No task selected';
    currentTaskSpan.textContent = currentTask;
    
    taskList.innerHTML = '';
    tasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${escapeHtml(task)}</span>
            <div class="task-actions">
                <button class="select-task" data-task="${escapeHtml(task)}">✓</button>
                <button class="delete-task" data-index="${index}">✗</button>
            </div>
        `;
        taskList.appendChild(li);
    });
    
    document.querySelectorAll('.select-task').forEach(btn => {
        btn.addEventListener('click', () => {
            currentTaskSpan.textContent = btn.dataset.task;
            localStorage.setItem('focusflow_currentTask', btn.dataset.task);
        });
    });
    
    document.querySelectorAll('.delete-task').forEach(btn => {
        btn.addEventListener('click', () => {
            const tasks = JSON.parse(localStorage.getItem('focusflow_tasks') || '[]');
            tasks.splice(parseInt(btn.dataset.index), 1);
            localStorage.setItem('focusflow_tasks', JSON.stringify(tasks));
            loadTasks();
        });
    });
}

function addTask() {
    const task = newTaskInput.value.trim();
    if (task) {
        const tasks = JSON.parse(localStorage.getItem('focusflow_tasks') || '[]');
        tasks.push(task);
        localStorage.setItem('focusflow_tasks', JSON.stringify(tasks));
        newTaskInput.value = '';
        loadTasks();
    }
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========== SETTINGS FUNCTIONS ==========
function updateSettings() {
    if (!isRunning) {
        if (currentPhase === 'work') {
            timeLeftSeconds = getWorkSeconds();
            totalSecondsForCurrentPhase = getWorkSeconds();
        } else if (currentPhase === 'break') {
            timeLeftSeconds = getBreakSeconds();
            totalSecondsForCurrentPhase = getBreakSeconds();
        } else if (currentPhase === 'longBreak') {
            timeLeftSeconds = getLongBreakSeconds();
            totalSecondsForCurrentPhase = getLongBreakSeconds();
        }
        updateDisplay();
    }
    updateCycleDisplay();
    saveToLocalStorage();
}

// ========== TOGGLE FUNCTIONS ==========
function toggleSection(content, btn) {
    if (!content || !btn) return;
    content.classList.toggle('collapsed');
    btn.classList.toggle('rotated');
    localStorage.setItem(`focusflow_${content.id}_collapsed`, content.classList.contains('collapsed'));
}

function loadToggleStates() {
    const tasksCollapsed = localStorage.getItem('focusflow_taskContent_collapsed') === 'true';
    if (tasksCollapsed && taskContent && toggleTasks) {
        taskContent.classList.add('collapsed');
        toggleTasks.classList.add('rotated');
    }
    
    const settingsCollapsed = localStorage.getItem('focusflow_settingsContent_collapsed') === 'true';
    if (settingsCollapsed && settingsContent && toggleSettings) {
        settingsContent.classList.add('collapsed');
        toggleSettings.classList.add('rotated');
    }
    
    const infoCollapsed = localStorage.getItem('focusflow_infoContent_collapsed') === 'true';
    if (infoCollapsed && infoContent && toggleInfo) {
        infoContent.classList.add('collapsed');
        toggleInfo.classList.add('rotated');
    }
}

// ========== PERSISTENCE ==========
function saveToLocalStorage() {
    const state = {
        currentPhase,
        pomodorosCompleted,
        pomodorosSinceLastLongBreak,
        timeLeftSeconds,
        totalSecondsForCurrentPhase,
        workMinutes: workMinutesInput.value,
        breakMinutes: breakMinutesInput.value,
        longBreakMinutes: longBreakMinutesInput.value,
        cyclesToLongBreak: cyclesToLongBreakInput.value,
        isRunning: false
    };
    localStorage.setItem('focusflow_timerState', JSON.stringify(state));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('focusflow_timerState');
    if (saved) {
        try {
            const state = JSON.parse(saved);
            currentPhase = state.currentPhase || 'work';
            pomodorosCompleted = state.pomodorosCompleted || 0;
            pomodorosSinceLastLongBreak = state.pomodorosSinceLastLongBreak || 0;
            timeLeftSeconds = state.timeLeftSeconds || getWorkSeconds();
            totalSecondsForCurrentPhase = state.totalSecondsForCurrentPhase || getWorkSeconds();
            workMinutesInput.value = state.workMinutes || 25;
            breakMinutesInput.value = state.breakMinutes || 5;
            longBreakMinutesInput.value = state.longBreakMinutes || 15;
            cyclesToLongBreakInput.value = state.cyclesToLongBreak || 4;
            
            updateCycleDisplay();
            updateDisplay();
        } catch(e) {
            console.log('Error loading saved state');
        }
    }
}

// ========== QUICK TASK CHIPS ==========
function initQuickTasks() {
    const chips = document.querySelectorAll('.chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            const task = chip.getAttribute('data-task');
            if (task) {
                currentTaskSpan.textContent = task;
                localStorage.setItem('focusflow_currentTask', task);
            }
        });
    });
}

// ========== EVENT LISTENERS ==========
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);
skipBtn.addEventListener('click', skipPhase);

addTaskBtn.addEventListener('click', addTask);
newTaskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});

workMinutesInput.addEventListener('change', updateSettings);
breakMinutesInput.addEventListener('change', updateSettings);
longBreakMinutesInput.addEventListener('change', updateSettings);
cyclesToLongBreakInput.addEventListener('change', () => {
    updateCycleDisplay();
    updateSettings();
});

if (toggleTasks && taskContent) {
    toggleTasks.addEventListener('click', () => toggleSection(taskContent, toggleTasks));
}
if (toggleSettings && settingsContent) {
    toggleSettings.addEventListener('click', () => toggleSection(settingsContent, toggleSettings));
}
if (toggleInfo && infoContent) {
    toggleInfo.addEventListener('click', () => toggleSection(infoContent, toggleInfo));
}

// ========== INITIALIZATION ==========
function init() {
    loadFromLocalStorage();
    loadTasks();
    loadToggleStates();
    updateCycleDisplay();
    updateDisplay();
    initQuickTasks();
    
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Start the app
init();