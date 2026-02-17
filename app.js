/**
 * SHADOW MUSCLE - SYSTEM ENGINE v4.1
 * Corrections: IDs alignés, logique complète
 */
class ShadowMuscle {
  constructor() {
    this.initData();
    this.init();
  }

  initData() {
    const saved = localStorage.getItem('shadow_muscle_save');
    if (saved) {
      this.data = JSON.parse(saved);
      if (!this.data.customMissions) this.data.customMissions = [];
      if (!this.data.completedDaily) this.data.completedDaily = [];
    } else {
      this.data = {
        level: 1,
        xp: 0,
        stats: { force: 10, endurance: 10, mental: 10, discipline: 10, aura: 10 },
        streak: 0,
        lastDate: null,
        badges: [],
        history: [],
        customMissions: [],
        completedDaily: []
      };
    }

    this.BADGES_DB = [
      { id: 'first_step', name: 'Éveil', desc: 'Première mission complétée', icon: '⚔️', type: 'mission', req: 1 },
      { id: 'bronze_rank', name: 'Rank E', desc: 'Niveau 5', icon: '🥉', type: 'level', req: 5 },
      { id: 'silver_rank', name: 'Rank C', desc: 'Niveau 15', icon: '🥈', type: 'level', req: 15 },
      { id: 'gold_rank', name: 'Rank A', desc: 'Niveau 30', icon: '🥇', type: 'level', req: 30 },
      { id: 'shadow_lord', name: 'Monarque', desc: 'Niveau 50', icon: '👑', type: 'level', req: 50 },
      { id: 'consistent', name: 'Régularité', desc: '7 jours de suite', icon: '🔥', type: 'streak', req: 7 }
    ];

    this.DAILY_MISSIONS = [
      { id: 'd1', title: '50 Pompes', xp: 80, stat: 'force' },
      { id: 'd2', title: '50 Squats', xp: 80, stat: 'endurance' },
      { id: 'd3', title: '50 Abdos', xp: 70, stat: 'discipline' },
      { id: 'd4', title: 'Méditation 10min', xp: 60, stat: 'aura' },
      { id: 'd5', title: 'Lecture 20min', xp: 60, stat: 'mental' }
    ];

    this.WEEKLY_MISSIONS = [
      { id: 'w1', title: '500 pompes (semaine)', xp: 300, stat: 'force' },
      { id: 'w2', title: '500 squats (semaine)', xp: 300, stat: 'endurance' }
    ];

    this.MONTHLY_MISSIONS = [
      { id: 'm1', title: 'Streak 7 jours', xp: 800, stat: 'discipline' },
      { id: 'm2', title: 'Streak 30 jours', xp: 3000, stat: 'aura' }
    ];
  }

  init() {
    this.setupTabs();
    this.resetDaily();
    this.renderAll();
    this.setupEventListeners();
    this.checkStreak();
    this.requestNotify();
    console.log("System: Arise. 💀");
  }

  setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn, .tab-panel').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(tab).classList.add('active');
      });
    });
  }

  resetDaily() {
    const today = new Date().toLocaleDateString('fr-FR');
    if (this.data.lastDate !== today) {
      this.data.completedDaily = [];
      this.save();
    }
  }

  renderAll() {
    this.renderStatus();
    this.renderMissions();
    this.renderArtefacts();
    this.renderGrimoire();
  }

  renderStatus() {
    const levelEl = document.getElementById('user-level');
    if (levelEl) levelEl.textContent = this.data.level;

    const rankEl = document.getElementById('rank');
    if (rankEl) rankEl.textContent = this.getRank();

    const streakEl = document.getElementById('streakCount');
    if (streakEl) streakEl.textContent = this.data.streak;

    const nextXP = this.data.level * 150;
    const percent = Math.min((this.data.xp / nextXP) * 100, 100);
    const progressBar = document.getElementById('xpProgress');
    if (progressBar) progressBar.style.width = percent + '%';

    const xpText = document.getElementById('xpText');
    if (xpText) xpText.textContent = `${this.data.xp} / ${nextXP} XP`;

    const statsContainer = document.getElementById('stats-container');
    if (statsContainer) {
      statsContainer.innerHTML = Object.entries(this.data.stats).map(([key, val]) =>
        `<div class="stat"><span>${key.toUpperCase()}</span><span>${val}</span></div>`
      ).join('');
    }
  }

  renderMissions() {
    this.renderMissionCategory('daily', this.DAILY_MISSIONS);
    this.renderMissionCategory('weekly', this.WEEKLY_MISSIONS);
    this.renderMissionCategory('monthly', this.MONTHLY_MISSIONS);
    this.renderMissionCategory('custom', this.data.customMissions);
  }

  renderMissionCategory(type, missions) {
    const container = document.getElementById(`missions-container-${type}`);
    if (!container) return;
    
    container.innerHTML = missions.map(m => {
      const isDone = this.data.completedDaily.includes(m.id);
      return `<div class="mission ${isDone ? 'done' : ''}">
        <span>${m.title} <span class="xp-badge">+${m.xp} XP</span></span>
        <button class="mission-btn" onclick="app.completeMission('${m.id}', '${type}')" ${isDone ? 'disabled' : ''}>
          ${isDone ? '✓' : 'COMPLÉTER'}
        </button>
      </div>`;
    }).join('');
  }

  renderArtefacts() {
    const container = document.getElementById('badges-container');
    if (!container) return;
    
    container.innerHTML = this.BADGES_DB.map(b => {
      const owned = this.data.badges.includes(b.id);
      return `<div class="badge-card ${owned ? '' : 'locked'}">
        <div class="badge-icon">${b.icon}</div>
        <div class="badge-name">${b.name}</div>
        <div class="badge-desc">${b.desc}</div>
      </div>`;
    }).join('');
  }

  renderGrimoire() {
    const container = document.getElementById('history-container');
    if (!container) return;
    
    container.innerHTML = this.data.history.slice(-20).reverse().map(h =>
      `<div class="history-day ${h.success ? 'success' : ''}">
        <span class="history-date">${h.date}</span>
        <span>${h.text}</span>
        <span style="color:var(--neon-blue)">+${h.xp} XP</span>
      </div>`
    ).join('');
  }

  completeMission(id, type) {
    const missions = type === 'daily' ? this.DAILY_MISSIONS :
                     type === 'weekly' ? this.WEEKLY_MISSIONS :
                     type === 'monthly' ? this.MONTHLY_MISSIONS :
                     this.data.customMissions;
    
    const mission = missions.find(m => m.id === id);
    if (!mission || this.data.completedDaily.includes(id)) return;

    this.data.xp += mission.xp;
    this.data.stats[mission.stat] += 2;
    this.data.completedDaily.push(id);
    
    this.addHistory(`${mission.title} accomplie`, mission.xp);
    this.checkLevelUp();
    this.checkBadges();
    this.save();
    this.renderAll();
    this.showRPMessage(`Mission accomplie ! +${mission.xp} XP, +2 ${mission.stat.toUpperCase()}`);
  }

  checkLevelUp() {
    const nextXP = this.data.level * 150;
    if (this.data.xp >= nextXP) {
      this.data.level++;
      this.data.xp -= nextXP;
      Object.keys(this.data.stats).forEach(s => this.data.stats[s] += 3);
      this.showLevelUpPopup();
      this.checkLevelUp();
    }
  }

  checkBadges() {
    this.BADGES_DB.forEach(b => {
      if (this.data.badges.includes(b.id)) return;
      let met = false;
      if (b.type === 'level' && this.data.level >= b.req) met = true;
      if (b.type === 'mission' && this.data.history.length >= b.req) met = true;
      if (b.type === 'streak' && this.data.streak >= b.req) met = true;
      
      if (met) {
        this.data.badges.push(b.id);
        this.showBadgePopup(b);
      }
    });
  }

  getRank() {
    const l = this.data.level;
    if (l >= 50) return 'Shadow Monarch';
    if (l >= 30) return 'A - Élite';
    if (l >= 15) return 'C - Chasseur';
    if (l >= 5) return 'E - Débutant';
    return 'E - Novice';
  }

  addHistory(text, xp) {
    const date = new Date().toLocaleDateString('fr-FR');
    this.data.history.push({ date, text, xp, success: true });
  }

  checkStreak() {
    const today = new Date().toLocaleDateString('fr-FR');
    if (this.data.lastDate && this.data.lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('fr-FR');
      
      if (this.data.lastDate === yesterdayStr) {
        this.data.streak++;
      } else {
        this.data.streak = 0;
      }
    }
    this.data.lastDate = today;
    this.save();
  }

  showRPMessage(msg) {
    const rpEl = document.getElementById('rpMessages');
    if (rpEl) {
      rpEl.innerHTML = `<div class="rp-message">${msg}</div>`;
      setTimeout(() => rpEl.innerHTML = '', 4000);
    }
  }

  showLevelUpPopup() {
    const popup = document.getElementById('levelUpPopup');
    const text = document.getElementById('levelUpText');
    if (popup && text) {
      text.textContent = `Niveau ${this.data.level} ! Rang: ${this.getRank()}`;
      popup.classList.remove('hidden');
    }
  }

  showBadgePopup(badge) {
    const popup = document.getElementById('badgePopup');
    const text = document.getElementById('badgePopupText');
    if (popup && text) {
      text.textContent = `${badge.icon} ${badge.name} débloqué !`;
      popup.classList.remove('hidden');
    }
  }

  setupEventListeners() {
    const closePopup = document.getElementById('closePopup');
    if (closePopup) {
      closePopup.onclick = () => {
        document.getElementById('levelUpPopup').classList.add('hidden');
      };
    }

    const closeBadgePopup = document.getElementById('closeBadgePopup');
    if (closeBadgePopup) {
      closeBadgePopup.onclick = () => {
        document.getElementById('badgePopup').classList.add('hidden');
      };
    }

    const addMission = document.getElementById('addMission');
    const newMissionInput = document.getElementById('newMission');
    if (addMission && newMissionInput) {
      addMission.onclick = () => {
        const text = newMissionInput.value.trim();
        if (!text) return;
        
        const newMission = {
          id: 'c' + Date.now(),
          title: text,
          xp: 200,
          stat: 'force'
        };
        
        this.data.customMissions.push(newMission);
        newMissionInput.value = '';
        this.save();
        this.renderAll();
      };
    }

    const enableNotifs = document.getElementById('enableNotifs');
    if (enableNotifs) {
      enableNotifs.onclick = () => this.requestNotify();
    }
  }

  requestNotify() {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  save() {
    localStorage.setItem('shadow_muscle_save', JSON.stringify(this.data));
  }
}

const app = new ShadowMuscle();
