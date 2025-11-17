/**
 * Pomodoro Timer Logic
 * Manages timer state, cycles, history, and auto-mode for ADHD-friendly focus sessions
 */

export class PomodoroTimer {
	constructor() {
		// DOM Elements
		this.timerDisplay = document.getElementById('timerDisplay');
		this.timerLabel = document.getElementById('timerLabel');
		this.startBtn = document.getElementById('startBtn');
		this.resetBtn = document.getElementById('resetBtn');
		this.skipBtn = document.getElementById('skipBtn');
		this.sessionBadge = document.getElementById('sessionBadge');
		this.timerProgress = document.querySelector('.timer-progress');
		this.timerContainer = document.querySelector('.timer-container');
		this.focusImage = document.getElementById('focusImage');
		this.cycleDots = document.getElementById('cycleDots');
		this.cycleInfo = document.getElementById('cycleInfo');
		this.autoModeCheckbox = document.getElementById('autoMode');
		this.historyList = document.getElementById('historyList');
		this.totalPomodorosEl = document.getElementById('totalPomodoros');
		this.totalMinutesEl = document.getElementById('totalMinutes');
		this.currentStreakEl = document.getElementById('currentStreak');
		this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
		this.modeBtns = document.querySelectorAll('.mode-btn');
		
		// Timer State Configuration
		this.sessions = {
			'pomodoro': { minutes: 25, label: 'Pomodoro', icon: '', type: 'work' },
			'long-focus': { minutes: 50, label: 'Focus Largo', icon: '', type: 'work' },
			'short-break': { minutes: 5, label: 'Descanso Corto', icon: '', type: 'break' },
			'long-break': { minutes: 15, label: 'Descanso Largo', icon: '', type: 'break' },
			'refocus-2': { minutes: 2, label: 'Reenfoque Rápido', icon: '', type: 'work' }
		};
		
		// Current session state
		this.currentSession = 'pomodoro';
		this.totalSeconds = this.sessions[this.currentSession].minutes * 60;
		this.remainingSeconds = this.totalSeconds;
		this.isRunning = false;
		this.intervalId = null;
		
		// Cycle tracking for 4-pomodoro cycles
		this.pomodorosInCycle = 0;
		this.totalPomodoros = 0;
		this.currentStreak = 0;
		
		// Audio elements
		this.alarmSound = new Audio('/audio/Alarm Clock.mp3');
		this.beepSound = new Audio('/audio/Beep Short .mp3');
		
		// Available images
		this.images = ['/image/01.jpg', '/image/02.jpg', '/image/03.jpg'];
		
		// Circle SVG configuration
		this.circumference = 2 * Math.PI * 90;
		this.timerProgress.style.strokeDasharray = `${this.circumference} ${this.circumference}`;
		
		// History from localStorage
		this.history = this.loadHistory();
		
		this.init();
	}
	
	/**
	 * Initialize event listeners and UI
	 */
	init() {
		this.startBtn.addEventListener('click', () => this.toggleTimer());
		this.resetBtn.addEventListener('click', () => this.resetTimer());
		this.skipBtn.addEventListener('click', () => this.skipSession());
		this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
		
		this.modeBtns.forEach(btn => {
			btn.addEventListener('click', () => {
				if (!this.isRunning) {
					const mode = btn.dataset.mode;
					this.changeMode(mode, btn);
				}
			});
		});
		
		this.updateDisplay();
		this.updateProgress();
		this.updateUI();
		this.updateCycleIndicator();
		this.renderHistory();
		this.changeImage();
	}
	
	/**
	 * Change the current session mode
	 */
	changeMode(mode, btn) {
		this.modeBtns.forEach(b => b.classList.remove('active'));
		btn.classList.add('active');
		
		this.currentSession = mode;
		this.totalSeconds = this.sessions[mode].minutes * 60;
		this.remainingSeconds = this.totalSeconds;
		
		this.beepSound.play().catch(() => {});
		
		this.updateDisplay();
		this.updateProgress();
		this.updateUI();
		this.changeImage();
	}
	
	/**
	 * Toggle between play and pause
	 */
	toggleTimer() {
		if (this.isRunning) {
			this.pauseTimer();
		} else {
			this.startTimer();
		}
	}
	
	/**
	 * Start the timer countdown
	 */
	startTimer() {
		this.isRunning = true;
		this.startBtn.classList.add('running');
		this.startBtn.querySelector('.btn-icon').textContent = '';
		this.startBtn.querySelector('.btn-text').textContent = 'Pausar';
		this.timerLabel.textContent = 'Enfocado... ¡Tú puedes!';
		
		this.intervalId = setInterval(() => {
			this.remainingSeconds--;
			
			if (this.remainingSeconds <= 0) {
				this.sessionComplete();
			} else {
				this.updateDisplay();
				this.updateProgress();
			}
		}, 1000);
	}
	
	/**
	 * Pause the timer
	 */
	pauseTimer() {
		this.isRunning = false;
		this.startBtn.classList.remove('running');
		this.startBtn.querySelector('.btn-icon').textContent = '';
		this.startBtn.querySelector('.btn-text').textContent = 'Continuar';
		this.timerLabel.textContent = 'En pausa';
		
		clearInterval(this.intervalId);
	}
	
	/**
	 * Reset the current session
	 */
	resetTimer() {
		this.isRunning = false;
		this.startBtn.classList.remove('running');
		this.startBtn.querySelector('.btn-icon').textContent = '';
		this.startBtn.querySelector('.btn-text').textContent = 'Iniciar';
		
		clearInterval(this.intervalId);
		
		this.remainingSeconds = this.totalSeconds;
		this.updateDisplay();
		this.updateProgress();
		this.updateUI();
		
		this.beepSound.play().catch(() => {});
	}
	
	/**
	 * Skip to next session
	 */
	skipSession() {
		if (!this.isRunning) {
			this.sessionComplete();
		}
	}
	
	/**
	 * Handle session completion
	 */
	sessionComplete() {
		this.isRunning = false;
		clearInterval(this.intervalId);
		
		this.remainingSeconds = 0;
		this.updateDisplay();
		this.updateProgress();
		
		// Play completion sound
		this.alarmSound.play().catch(() => {});
		
		// Add to history
		this.addToHistory(this.currentSession);
		
		// Pulse animation
		this.timerContainer.classList.add('pulse');
		setTimeout(() => {
			this.timerContainer.classList.remove('pulse');
		}, 500);
		
		// Update cycle tracking
		if (this.sessions[this.currentSession].type === 'work') {
			if (this.currentSession === 'pomodoro') {
				this.pomodorosInCycle++;
				this.totalPomodoros++;
				this.currentStreak++;
			}
		}
		
		this.timerLabel.textContent = '¡Completado! ';
		this.startBtn.classList.remove('running');
		this.startBtn.querySelector('.btn-icon').textContent = '';
		this.startBtn.querySelector('.btn-text').textContent = 'Iniciar';
		
		// Update stats
		this.updateStats();
		this.updateCycleIndicator();
		
		// Auto-start next session if enabled
		if (this.autoModeCheckbox.checked) {
			setTimeout(() => {
				this.startNextSession();
			}, 3000);
		} else {
			setTimeout(() => {
				this.remainingSeconds = this.totalSeconds;
				this.updateDisplay();
				this.updateProgress();
				this.updateUI();
			}, 3000);
		}
	}
	
	/**
	 * Start the next session in the cycle
	 */
	startNextSession() {
		let nextSession;
		
		if (this.currentSession === 'pomodoro') {
			// After pomodoro, take a break
			if (this.pomodorosInCycle >= 4) {
				// Long break after 4 pomodoros
				nextSession = 'long-break';
				this.pomodorosInCycle = 0;
			} else {
				// Short break
				nextSession = 'short-break';
			}
		} else if (this.currentSession === 'short-break' || this.currentSession === 'long-break') {
			// After break, back to pomodoro
			nextSession = 'pomodoro';
		} else if (this.currentSession === 'long-focus') {
			// After long focus, take long break
			nextSession = 'long-break';
		} else if (this.currentSession === 'refocus-2') {
			// After a short refocus, start a normal pomodoro
			nextSession = 'pomodoro';
		}
		
		// Update active button
		this.modeBtns.forEach(btn => {
			btn.classList.remove('active');
			if (btn.dataset.mode === 'pomodoro') {
				btn.classList.add('active');
			}
		});
		
		this.currentSession = nextSession;
		this.totalSeconds = this.sessions[nextSession].minutes * 60;
		this.remainingSeconds = this.totalSeconds;
		
		this.updateDisplay();
		this.updateProgress();
		this.updateUI();
		this.updateCycleIndicator();
		this.changeImage();
		
		// Auto-start
		this.startTimer();
	}
	
	/**
	 * Change the focus illustration
	 */
	changeImage() {
		const randomImage = this.images[Math.floor(Math.random() * this.images.length)];
		this.focusImage.style.opacity = '0';
		setTimeout(() => {
			this.focusImage.src = randomImage;
			this.focusImage.style.opacity = '1';
		}, 250);
	}
	
	/**
	 * Update timer display
	 */
	updateDisplay() {
		const minutes = Math.floor(this.remainingSeconds / 60);
		const seconds = this.remainingSeconds % 60;
		this.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	}
	
	/**
	 * Update circular progress indicator
	 */
	updateProgress() {
		const progress = this.remainingSeconds / this.totalSeconds;
		const offset = this.circumference * (1 - progress);
		this.timerProgress.style.strokeDashoffset = offset;
	}
	
	/**
	 * Update UI elements (badge, colors, labels)
	 */
	updateUI() {
		const session = this.sessions[this.currentSession];
		this.sessionBadge.textContent = session.label;
		
		// Update badge and progress color
		this.sessionBadge.className = 'session-badge';
		this.timerProgress.className = 'timer-progress';
		
		if (this.currentSession === 'short-break' || this.currentSession === 'long-break') {
			this.sessionBadge.classList.add(this.currentSession === 'long-break' ? 'long-break' : 'break');
			this.timerProgress.classList.add(this.currentSession === 'long-break' ? 'long-break' : 'break');
		} else if (this.currentSession === 'long-focus') {
			this.sessionBadge.classList.add('long-focus');
			this.timerProgress.classList.add('long-focus');
		}
		
		if (!this.isRunning) {
			this.timerLabel.textContent = `Presiona iniciar para ${session.label.toLowerCase()}`;
		}
	}
	
	/**
	 * Update the cycle indicator dots
	 */
	updateCycleIndicator() {
		const dots = this.cycleDots.querySelectorAll('.dot');
		dots.forEach((dot, index) => {
			dot.className = 'dot';
			if (index < this.pomodorosInCycle) {
				dot.classList.add('completed');
			}
			if (index === this.pomodorosInCycle) {
				dot.classList.add('active');
			}
		});
		
		this.cycleInfo.textContent = `${this.pomodorosInCycle} de 4 pomodoros`;
	}
	
	/**
	 * Add completed session to history
	 */
	addToHistory(session) {
		const now = new Date();
		const entry = {
			session: session,
			timestamp: now.getTime(),
			duration: this.sessions[session].minutes,
			icon: this.sessions[session].icon
		};
		
		this.history.unshift(entry);
		
		// Keep only today's history
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		this.history = this.history.filter(h => h.timestamp >= today.getTime());
		
		this.saveHistory();
		this.renderHistory();
	}
	
	/**
	 * Render history list
	 */
	renderHistory() {
		if (this.history.length === 0) {
			this.historyList.innerHTML = `
				<div class="history-empty">
					<span class="empty-icon">📝</span>
					<p>Aún no has completado ninguna sesión hoy</p>
				</div>
			`;
			return;
		}
		
		this.historyList.innerHTML = this.history.map(entry => {
			const time = new Date(entry.timestamp);
			const timeStr = time.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
			
			return `
				<div class="history-item">
					<span class="history-icon">${entry.icon}</span>
					<div class="history-details">
						<div class="history-type">${this.sessions[entry.session].label}</div>
						<div class="history-time">${timeStr}</div>
					</div>
					<div class="history-duration">${entry.duration} min</div>
				</div>
			`;
		}).join('');
	}
	
	/**
	 * Update statistics
	 */
	updateStats() {
		const workSessions = this.history.filter(h => this.sessions[h.session].type === 'work');
		const totalMinutes = this.history.reduce((sum, h) => sum + h.duration, 0);
		
		this.totalPomodorosEl.textContent = workSessions.length;
		this.totalMinutesEl.textContent = totalMinutes;
		this.currentStreakEl.textContent = this.currentStreak;
	}
	
	/**
	 * Clear history
	 */
	clearHistory() {
		if (confirm('¿Estás seguro de que quieres limpiar el historial?')) {
			this.history = [];
			this.saveHistory();
			this.renderHistory();
			this.updateStats();
		}
	}
	
	/**
	 * Load history from localStorage
	 */
	loadHistory() {
		const saved = localStorage.getItem('pomodoro-history');
		if (saved) {
			return JSON.parse(saved);
		}
		return [];
	}
	
	/**
	 * Save history to localStorage
	 */
	saveHistory() {
		localStorage.setItem('pomodoro-history', JSON.stringify(this.history));
	}
}
