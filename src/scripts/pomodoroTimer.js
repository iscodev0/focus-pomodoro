/**
 * Pomodoro Timer Logic
 * Manages timer state, cycles, history, and auto-mode for ADHD-friendly focus sessions
 * Uses Web Workers for accurate background timing
 */
import TimerWorker from './timer.worker.js?worker';

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
		
		// Settings Elements
		this.settingsBtn = document.getElementById('settingsBtn');
		this.settingsModal = document.getElementById('settingsModal');
		this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
		this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
		this.pomodoroTimeInput = document.getElementById('pomodoroTime');
		this.shortBreakTimeInput = document.getElementById('shortBreakTime');
		this.longBreakTimeInput = document.getElementById('longBreakTime');
		this.autoStartBreaksInput = document.getElementById('autoStartBreaks');
		this.autoStartPomodorosInput = document.getElementById('autoStartPomodoros');
		this.volumeSlider = document.getElementById('volumeSlider');

		// Default Settings
		this.settings = {
			pomodoro: 25,
			shortBreak: 5,
			longBreak: 15,
			autoStartBreaks: false,
			autoStartPomodoros: false,
			volume: 50
		};
		
		// Load saved settings
		this.loadSettings();

		// Timer State Configuration
		this.sessions = {
			'pomodoro': { minutes: this.settings.pomodoro, label: 'Pomodoro', icon: '', type: 'work' },
			'long-focus': { minutes: 50, label: 'Focus Largo', icon: '', type: 'work' },
			'short-break': { minutes: this.settings.shortBreak, label: 'Descanso Corto', icon: '', type: 'break' },
			'long-break': { minutes: this.settings.longBreak, label: 'Descanso Largo', icon: '', type: 'break' },
			'refocus-2': { minutes: 2, label: 'Reenfoque Rápido', icon: '', type: 'work' }
		};
		
		// Current session state
		this.currentSession = 'pomodoro';
		this.totalSeconds = this.sessions[this.currentSession].minutes * 60;
		this.remainingSeconds = this.totalSeconds;
		this.isRunning = false;
		
		// Worker
		this.worker = new TimerWorker();
		this.worker.onmessage = this.handleWorkerMessage.bind(this);
		
		// Cycle tracking for 4-pomodoro cycles
		this.pomodorosInCycle = 0;
		this.totalPomodoros = 0;
		this.currentStreak = 0;
		
		// Audio elements
		this.alarmSound = new Audio('/audio/Alarm Clock.mp3');
		this.beepSound = new Audio('/audio/Beep Short .mp3');
		this.updateVolume();
		
		// Available images
		this.images = ['/image/01.jpg', '/image/02.jpg', '/image/03.jpg'];
		
		// Circle SVG configuration
		this.circumference = 2 * Math.PI * 90;
		if (this.timerProgress) {
			this.timerProgress.style.strokeDasharray = `${this.circumference} ${this.circumference}`;
		}
		
		// History from localStorage
		this.history = this.loadHistory();
		
		this.init();
	}
	
	/**
	 * Initialize event listeners and UI
	 */
	init() {
		if (this.startBtn) this.startBtn.addEventListener('click', () => this.toggleTimer());
		if (this.resetBtn) this.resetBtn.addEventListener('click', () => this.resetTimer());
		if (this.skipBtn) this.skipBtn.addEventListener('click', () => this.skipSession());
		if (this.clearHistoryBtn) this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
		
		// Settings Events
		if (this.settingsBtn) this.settingsBtn.addEventListener('click', () => this.openSettings());
		if (this.closeSettingsBtn) this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
		if (this.saveSettingsBtn) this.saveSettingsBtn.addEventListener('click', () => this.saveSettingsFromModal());
		if (this.settingsModal) {
			this.settingsModal.addEventListener('click', (e) => {
				if (e.target === this.settingsModal) this.closeSettings();
			});
		}
		if (this.volumeSlider) {
			this.volumeSlider.addEventListener('input', () => {
				this.settings.volume = this.volumeSlider.value;
				this.updateVolume();
			});
			this.volumeSlider.addEventListener('change', () => {
				this.saveSettings(); // Save when dragging stops
			});
		}

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
	 * Handle messages from Web Worker
	 */
	handleWorkerMessage(e) {
		const { type } = e.data;
		if (type === 'TICK') {
			this.remainingSeconds--;
			
			if (this.remainingSeconds <= 0) {
				this.sessionComplete();
			} else {
				this.updateDisplay();
				this.updateProgress();
			}
		}
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
		
		this.playBeep();
		
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
		
		this.worker.postMessage({ type: 'START' });
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
		
		this.worker.postMessage({ type: 'PAUSE' });
	}
	
	/**
	 * Reset the current session
	 */
	resetTimer() {
		this.isRunning = false;
		this.startBtn.classList.remove('running');
		this.startBtn.querySelector('.btn-icon').textContent = '';
		this.startBtn.querySelector('.btn-text').textContent = 'Iniciar';
		
		this.worker.postMessage({ type: 'RESET' });
		
		this.remainingSeconds = this.totalSeconds;
		this.updateDisplay();
		this.updateProgress();
		this.updateUI();
		
		this.playBeep();
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
		this.worker.postMessage({ type: 'RESET' });
		
		this.remainingSeconds = 0;
		this.updateDisplay();
		this.updateProgress();
		
		// Play completion sound
		this.playAlarm();
		
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
		
		// Auto-start next session logic
		let autoStart = false;
		const isWork = this.sessions[this.currentSession].type === 'work';
		
		if (isWork && this.settings.autoStartBreaks) {
			autoStart = true;
		} else if (!isWork && this.settings.autoStartPomodoros) {
			autoStart = true;
		} else if (this.autoModeCheckbox && this.autoModeCheckbox.checked) {
			// Fallback to the simple auto mode toggle if settings not used
			autoStart = true;
		}
		
		if (autoStart) {
			setTimeout(() => {
				this.startNextSession();
			}, 3000);
		} else {
			setTimeout(() => {
				this.setupNextSession(); // Just setup, don't start
			}, 3000);
		}
	}
	
	setupNextSession() {
		this.prepareNextSession();
		this.updateDisplay();
		this.updateProgress();
		this.updateUI();
		this.updateCycleIndicator();
		this.changeImage();
	}

	startNextSession() {
		this.prepareNextSession();
		this.updateDisplay();
		this.updateProgress();
		this.updateUI();
		this.updateCycleIndicator();
		this.changeImage();
		
		// Auto-start
		this.startTimer();
	}
	
	prepareNextSession() {
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
		} else {
			nextSession = 'pomodoro'; // Default fallback
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
	}

	/**
	 * Change the focus illustration
	 */
	changeImage() {
		if (!this.focusImage) return;
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
		if (!this.timerDisplay) return;
		const minutes = Math.floor(this.remainingSeconds / 60);
		const seconds = this.remainingSeconds % 60;
		this.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	}
	
	/**
	 * Update circular progress indicator
	 */
	updateProgress() {
		if (!this.timerProgress) return;
		const progress = this.remainingSeconds / this.totalSeconds;
		const offset = this.circumference * (1 - progress);
		this.timerProgress.style.strokeDashoffset = offset;
	}
	
	/**
	 * Update UI elements (badge, colors, labels)
	 */
	updateUI() {
		if (!this.sessionBadge) return;
		const session = this.sessions[this.currentSession];
		this.sessionBadge.textContent = session.label;
		
		// Update badge and progress color
		this.sessionBadge.className = 'session-badge';
		if (this.timerProgress) this.timerProgress.className = 'timer-progress';
		
		if (this.currentSession === 'short-break' || this.currentSession === 'long-break') {
			this.sessionBadge.classList.add(this.currentSession === 'long-break' ? 'long-break' : 'break');
			if (this.timerProgress) this.timerProgress.classList.add(this.currentSession === 'long-break' ? 'long-break' : 'break');
		} else if (this.currentSession === 'long-focus') {
			this.sessionBadge.classList.add('long-focus');
			if (this.timerProgress) this.timerProgress.classList.add('long-focus');
		}
		
		if (!this.isRunning && this.timerLabel) {
			this.timerLabel.textContent = `Presiona iniciar para ${session.label.toLowerCase()}`;
		}
	}
	
	/**
	 * Update the cycle indicator dots
	 */
	updateCycleIndicator() {
		if (!this.cycleDots) return;
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
		
		if (this.cycleInfo) this.cycleInfo.textContent = `${this.pomodorosInCycle} de 4 pomodoros`;
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
		if (!this.historyList) return;
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
		
		if (this.totalPomodorosEl) this.totalPomodorosEl.textContent = workSessions.length;
		if (this.totalMinutesEl) this.totalMinutesEl.textContent = totalMinutes;
		if (this.currentStreakEl) this.currentStreakEl.textContent = this.currentStreak;
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

	// --- Settings Methods ---

	loadSettings() {
		const saved = localStorage.getItem('pomodoro-settings');
		if (saved) {
			this.settings = { ...this.settings, ...JSON.parse(saved) };
		}
		this.applySettingsToUI();
	}

	saveSettings() {
		localStorage.setItem('pomodoro-settings', JSON.stringify(this.settings));
	}

	applySettingsToUI() {
		if (this.pomodoroTimeInput) this.pomodoroTimeInput.value = this.settings.pomodoro;
		if (this.shortBreakTimeInput) this.shortBreakTimeInput.value = this.settings.shortBreak;
		if (this.longBreakTimeInput) this.longBreakTimeInput.value = this.settings.longBreak;
		if (this.autoStartBreaksInput) this.autoStartBreaksInput.checked = this.settings.autoStartBreaks;
		if (this.autoStartPomodorosInput) this.autoStartPomodorosInput.checked = this.settings.autoStartPomodoros;
		if (this.volumeSlider) this.volumeSlider.value = this.settings.volume;
		
		this.updateVolume();
	}

	openSettings() {
		this.settingsModal.classList.add('open');
	}

	closeSettings() {
		this.settingsModal.classList.remove('open');
	}

	saveSettingsFromModal() {
		this.settings.pomodoro = parseInt(this.pomodoroTimeInput.value);
		this.settings.shortBreak = parseInt(this.shortBreakTimeInput.value);
		this.settings.longBreak = parseInt(this.longBreakTimeInput.value);
		this.settings.autoStartBreaks = this.autoStartBreaksInput.checked;
		this.settings.autoStartPomodoros = this.autoStartPomodorosInput.checked;
		// volume is saved on input
		
		this.saveSettings();
		this.closeSettings();
		
		// Update session times
		this.sessions['pomodoro'].minutes = this.settings.pomodoro;
		this.sessions['short-break'].minutes = this.settings.shortBreak;
		this.sessions['long-break'].minutes = this.settings.longBreak;
		
		// If timer is not running, update current session time
		if (!this.isRunning) {
			this.totalSeconds = this.sessions[this.currentSession].minutes * 60;
			this.remainingSeconds = this.totalSeconds;
			this.updateDisplay();
			this.updateProgress();
		}
	}

	updateVolume() {
		const volume = this.settings.volume / 100;
		if (this.alarmSound) this.alarmSound.volume = volume;
		if (this.beepSound) this.beepSound.volume = volume;
	}

	playBeep() {
		if (this.beepSound) {
			this.beepSound.currentTime = 0;
			this.beepSound.play().catch(() => {});
		}
	}

	playAlarm() {
		if (this.alarmSound) {
			this.alarmSound.currentTime = 0;
			this.alarmSound.play().catch(() => {});
		}
	}
}
