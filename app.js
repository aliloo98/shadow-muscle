class ShadowMuscle {
    constructor() {
        this.currentLevel = 1;
        this.currentXP = 0;
        this.stats = { force: 1, endurance: 1, mental: 1, discipline: 1, aura: 1 };
        this.dailyMissions = [];
        this.customMissions = JSON.parse(localStorage.getItem('customMissions')) || [];
        this.missionStreak = parseInt(localStorage.getItem('missionStreak')) || 0;
        this.lastMissionDay = localStorage.getItem('lastMissionDay') || null;
        this.init();
    }

    init() {
        this.loadData();
        this.registerSW();
        this.updateUI();
        this.generateDailyMissions();
        this.bindEvents();
        this.updateDaily();
        this.showDailYGreeting();
    }

    registerSW() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./service-worker.js').catch(err => console.log('SW registration failed', err));
        }
    }

    loadData() {
        const saved = localStorage.getItem('shadowMuscle');
        if (saved) {
            const data = JSON.parse(saved);
            this.currentLevel = data.level || 1;
            this.currentXP = data.xp || 0;
            this.stats = { ...this.stats, ...data.stats };
            this.customMissions = data.customMissions || [];
        }
        this.missionStreak = parseInt(localStorage.getItem('missionStreak')) || 0;
        this.lastMissionDay = localStorage.getItem('lastMissionDay') || null;
    }

    saveData() {
        localStorage.setItem('shadowMuscle', JSON.stringify({
            level: this.currentLevel,
            xp: this.currentXP,
            stats: this.stats,
            customMissions: this.customMissions
        }));
        localStorage.setItem('missionStreak', this.missionStreak);
        localStorage.setItem('lastMissionDay', this.lastMissionDay);
    }

    getXpForLevel(level) {
        return 500 + (level * 150);
    }

    getRank(level) {
        if (level === 100) return 'Shadow Monarch - La Résurrection';
        if (level >= 80) return 'S - Souverain de l\'Abysse';
        if (level >= 60) return 'A - Éveillé du Pouvoir';
        if (level >= 40) return 'B - Elite de Combat';
        if (level >= 20) return 'C - Hunter Avancé';
        if (level >= 10) return 'D - Combattant Marqué';
        return 'E - Survivant Potentiel';
    }

    getLevelUpMessage(level) {
        const messages = {
            5: "Ton énergie s'accroît... L'Abysse te reconnaît.",
            10: "Tu franchis le seuil du D-Rank. Un combattant véritable émerge.",
            15: "La marque de la puissance s'enfonce en toi.",
            20: "C-Rank atteint. Tu n'es plus un simple survivant.",
            30: "Ta progression devient remarquable. Continue à grimper.",
            40: "B-Rank ! Tu joins les élites de ce monde.",
            50: "Tu dépasses les limites humaines ordinaires.",
            60: "A-Rank ! Tu es désormais un Awakened. Le pouvoir coule en toi.",
            70: "Ton aura dépasse l'entendement. L'ascension est inévitable.",
            80: "S-Rank ! Tu es un Souverain. Peu peuvent te défier.",
            90: "Approche du sommet... Shadow Monarch se fait proche.",
            100: "SHADOW MONARCH - Tu as atteint le pouvoir ultime. La Résurrection complète."
        };
        return messages[level] || `Niveau ${level} atteint ! Continue ton ascension...`;
    }

    // Message d'accueil personnalisé chaque jour
    showDailYGreeting() {
        const today = new Date().toDateString();
        const lastGreeting = localStorage.getItem('lastGreeting');
        
        if (lastGreeting === today) return; // Déjà montré aujourd'hui
        
        const dayOfWeek = new Date().getDay();
        const greetings = [
            { day: 0, msg: "Dimanche... Un jour pour se reposer et méditer. 💜", icon: "🧘" },
            { day: 1, msg: "Lundi! Le jour du GRIND commence. Montre ta force! 💪", icon: "⚡" },
            { day: 2, msg: "Mardi: Jour de discipline. Chaque muscle compte.", icon: "🔥" },
            { day: 3, msg: "Mercredi: À mi-chemin. Continue ton ascension!", icon: "🚀" },
            { day: 4, msg: "Jeudi: La fin de semaine approche. Profite de chaque moment! 🌟", icon: "✨" },
            { day: 5, msg: "Vendredi! Dernier jour avant le repos. Donne tout! 🎯", icon: "🎯" },
            { day: 6, msg: "Samedi: Le moment de rattraper ce que tu as manqué. 💯", icon: "💯" }
        ];
        
        const greeting = greetings.find(g => g.day === dayOfWeek);
        if (greeting) {
            this.showGreetingNotification(greeting.icon + " " + greeting.msg);
            localStorage.setItem('lastGreeting', today);
        }
    }

    showGreetingNotification(message) {
        const notif = document.createElement('div');
        notif.style.cssText = `
            position: fixed;
            top: 60px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, rgba(0,217,255,0.3), rgba(183,0,255,0.3));
            border: 1px solid rgba(0,217,255,0.5);
            color: #00d9ff;
            padding: 14px 20px;
            border-radius: 8px;
            font-weight: 600;
            text-align: center;
            z-index: 997;
            max-width: 90%;
            animation: slideDown 0.5s ease-out, slideUp 0.5s ease-in 4.5s forwards;
        `;
        notif.textContent = message;
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 5000);
    }

    addXP(amount, statBoost = {}) {
        this.currentXP += amount;
        let xpNeeded = this.getXpForLevel(this.currentLevel);
        Object.assign(this.stats, statBoost);
        while (this.currentXP >= xpNeeded && this.currentLevel < 100) {
            this.currentXP -= xpNeeded;
            this.currentLevel++;
            this.showLevelUp();
            xpNeeded = this.getXpForLevel(this.currentLevel);
        }
        this.updateUI();
        this.saveData();
    }

    showLevelUp() {
        const popup = document.getElementById('levelUpPopup');
        const message = this.getLevelUpMessage(this.currentLevel);
        document.getElementById('levelUpText').innerHTML = `<strong>Niveau ${this.currentLevel}</strong><br>${message}<br><br>Rang: ${this.getRank(this.currentLevel)}`;
        popup.classList.remove('hidden');
        document.getElementById('closePopup').onclick = () => popup.classList.add('hidden');
    }

    generateDailyMissions() {
        // Pool de missions variées avec difficulté progressive
        const exercises = [
            // Basique Force
            { name: '50 pompes', xp: 100, boost: { force: 1 } },
            { name: '30 pompes explosives', xp: 110, boost: { force: 2, aura: 1 } },
            { name: '100 pompes d\'une main', xp: 200, boost: { force: 3 } },
            
            // Basique Endurance
            { name: '100 squats', xp: 120, boost: { endurance: 1 } },
            { name: '50 squats profonds', xp: 140, boost: { endurance: 2, mental: 1 } },
            { name: '200 squats', xp: 180, boost: { endurance: 3 } },
            
            // Mental
            { name: '30 min méditation', xp: 80, boost: { mental: 1 } },
            { name: '1h de lecture "Solo Leveling"', xp: 120, boost: { mental: 2, discipline: 1 } },
            { name: '30 min yoga', xp: 90, boost: { mental: 1, endurance: 1 } },
            
            // Discipline & Aura
            { name: '20 min shadow boxing', xp: 150, boost: { discipline: 2, aura: 1 } },
            { name: '30 min sparring', xp: 170, boost: { discipline: 2, force: 1, aura: 2 } },
            { name: '15 min cardio intensif', xp: 130, boost: { endurance: 2, discipline: 1 } },
            
            // Combo puissant
            { name: 'Full Body Workout', xp: 250, boost: { force: 1, endurance: 1, mental: 1, discipline: 1, aura: 1 } },
            { name: 'Défi matinal', xp: 160, boost: { discipline: 2, force: 1, aura: 1 } },
        ];
        
        // Sélectionner 3 missions aléatoires
        this.dailyMissions = exercises.sort(() => Math.random() - 0.5).slice(0, 3);
        this.updateMissionsUI();
    }

    updateDaily() {
        const lastDaily = localStorage.getItem('lastDaily');
        const today = new Date().toDateString();
        const lastStreakDay = localStorage.getItem('lastStreakDay');
        
        if (lastDaily !== today) {
            this.generateDailyMissions();
            localStorage.setItem('lastDaily', today);
        }
        
        // Gérer le streak
        if (lastStreakDay !== today) {
            if (lastStreakDay === this.getPreviousDay()) {
                // C'est le lendemain du dernier jour de streak
                this.missionStreak += 1;
            } else if (lastStreakDay !== null) {
                // Un jour a été sauté, réinitialiser le streak
                if (this.missionStreak > 0) {
                    this.showStreakBrokenNotification();
                }
                this.missionStreak = 0;
            }
            localStorage.setItem('lastStreakDay', today);
            this.saveData();
        }
    }

    getPreviousDay() {
        const today = new Date();
        today.setDate(today.getDate() - 1);
        return today.toDateString();
    }

    bindEvents() {
        document.getElementById('addMission').onclick = () => {
            const input = document.getElementById('newMission');
            if (input.value) {
                const parts = input.value.split('+');
                const name = parts[0].trim();
                const boostStr = parts[1] ? parts[1].trim() : '';
                const boost = {};
                boostStr.split(',').forEach(s => {
                    const m = s.match(/(\w+):(\d+)/);
                    if (m) boost[m[1]] = parseInt(m[2]);
                });
                this.customMissions.push({ name, xp: 200, boost, done: false });
                input.value = '';
                this.updateMissionsUI();
                this.saveData();
            }
        };

        // Web Push Notifications (simple local)
        document.getElementById('enableNotifs').onclick = () => this.enableNotifications();
    }

    completeMission(index, isDaily) {
        const missions = isDaily ? this.dailyMissions : this.customMissions;
        const mission = missions[index];
        if (mission && !mission.done) {
            mission.done = true;
            this.addXP(mission.xp, mission.boost);
            
            // Vérifier si toutes les missions quotidiennes sont complétées
            if (isDaily && this.allDailyMissionsCompleted()) {
                this.missionStreak += 1;
                this.showStreakNotification();
                localStorage.setItem('lastStreakDay', new Date().toDateString());
            }
            
            // Créer une animation de complétion
            this.showMissionCompleted(mission);
            this.updateMissionsUI();
            this.saveData();
        }
    }

    allDailyMissionsCompleted() {
        return this.dailyMissions.every(m => m.done);
    }

    showStreakNotification() {
        const notif = document.createElement('div');
        notif.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #ff7a18, #ff3b30);
            color: white;
            padding: 16px 24px;
            border-radius: 10px;
            font-weight: 700;
            font-size: 1.05em;
            text-align: center;
            z-index: 998;
            box-shadow: 0 0 40px rgba(255,122,24,0.5);
            animation: streak-pop 0.5s ease-out, streak-fade 0.4s ease-in 2.5s forwards;
        `;
        notif.innerHTML = `<span style="font-size:1.3em;">🔥</span><br>STREAK +1 !<br><strong>${this.missionStreak} jours</strong>`;
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 3000);
    }

    showStreakBrokenNotification() {
        const notif = document.createElement('div');
        notif.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, rgba(255, 59, 48, 0.95), rgba(255, 122, 24, 0.95));
            color: white;
            padding: 16px 24px;
            border-radius: 10px;
            font-weight: 700;
            text-align: center;
            z-index: 998;
            box-shadow: 0 0 30px rgba(255, 59, 48, 0.5);
            animation: shake 0.5s ease-in-out;
        `;
        notif.textContent = '💔 Ton streak est tombée... Relève-toi, Combattant!';
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 4000);
    }

    showMissionCompleted(mission) {
        const msgDiv = document.createElement('div');
        msgDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, rgba(255,59,48,0.95), rgba(255,122,24,0.95));
            color: white;
            padding: 20px 30px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 1.1em;
            text-align: center;
            z-index: 999;
            box-shadow: 0 0 40px rgba(255,59,48,0.5);
            animation: slide-in 0.4s ease-out, slide-out 0.4s ease-in 1.6s forwards;
        `;
        msgDiv.textContent = `✓ ${mission.name}\nCOMPLÉTÉE!`;
        document.body.appendChild(msgDiv);
        setTimeout(() => msgDiv.remove(), 2000);
    }

    updateUI() {
        document.getElementById('currentLevel').textContent = this.currentLevel;
        document.getElementById('rank').textContent = this.getRank(this.currentLevel);
        document.getElementById('streakCount').textContent = this.missionStreak;
        
        const xpNeeded = this.getXpForLevel(this.currentLevel);
        document.getElementById('xpText').textContent = `${this.currentXP} / ${xpNeeded} XP`;
        document.getElementById('xpProgress').style.width = `${(this.currentXP / xpNeeded) * 100}%`;
        
        document.getElementById('force').textContent = this.stats.force;
        document.getElementById('endurance').textContent = this.stats.endurance;
        document.getElementById('mental').textContent = this.stats.mental;
        document.getElementById('discipline').textContent = this.stats.discipline;
        document.getElementById('aura').textContent = this.stats.aura;
    }

    updateMissionsUI() {
        const dailyDiv = document.getElementById('dailyMissions');
        dailyDiv.innerHTML = '<h3>Quotidiennes</h3>' + this.dailyMissions.map((m, i) => `
            <div class="mission ${m.done ? 'done' : ''}">
                <span>${m.name} <span class="xp-badge">+${m.xp} XP</span></span>
                <button onclick="app.completeMission(${i}, true)" class="mission-btn">${m.done ? '✓ Fait' : 'Compléter'}</button>
            </div>
        `).join('');

        const customDiv = document.getElementById('customMissions');
        customDiv.innerHTML = '<h3>Personnalisées</h3>' + this.customMissions.map((m, i) => `
            <div class="mission ${m.done ? 'done' : ''}">
                <span>${m.name} <span class="xp-badge">+${m.xp} XP</span></span>
                <button onclick="app.completeMission(${i}, false)" class="mission-btn">${m.done ? '✓ Fait' : 'Compléter'}</button>
            </div>
        `).join('');
    }

    // ===== SIMPLE LOCAL NOTIFICATIONS =====
    async enableNotifications() {
        // Vérification du support
        if (!('Notification' in window)) {
            alert('Les notifications ne sont pas supportées sur ce navigateur');
            return;
        }

        if (Notification.permission === 'denied') {
            alert('Les notifications sont bloquées. Veuillez les activer dans les paramètres du navigateur.');
            return;
        }

        try {
            // Demander la permission si nécessaire
            let permission = Notification.permission;
            if (permission === 'default') {
                permission = await Notification.requestPermission();
            }

            if (permission !== 'granted') {
                alert('Permission de notification refusée');
                return;
            }

            // Vérifier le Service Worker
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                
                // Afficher une notif locale de confirmation
                registration.showNotification('Shadow Muscle', {
                    body: 'Notifications activées avec succès ! 🔔',
                    icon: './icon-192.png',
                    badge: './icon-192.png',
                    vibrate: [200, 100, 200],
                    tag: 'shadow-muscle-welcome'
                });
            }

            // Toast de confirmation
            this.showNotificationSuccess('Notifications activées ! ✅');
        } catch (error) {
            console.error('Erreur lors de l\'activation des notifications:', error);
            alert('Erreur: ' + error.message);
        }
    }

    showNotificationSuccess(message) {
        const notif = document.createElement('div');
        notif.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(90deg, #00d9ff, #b700ff);
            color: white;
            padding: 16px 24px;
            border-radius: 10px;
            font-weight: 700;
            text-align: center;
            z-index: 998;
            box-shadow: 0 0 40px rgba(0,217,255,0.5);
            animation: slideDown 0.4s ease-out, slideUp 0.4s ease-in 2.5s forwards;
        `;
        notif.textContent = message;
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 3000);
    }
}

const app = new ShadowMuscle();
