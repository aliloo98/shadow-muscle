class ShadowMuscle {
    constructor() {
        this.currentLevel = 1;
        this.currentXP = 0;
        this.stats = { force: 1, endurance: 1, mental: 1, discipline: 1, aura: 1 };
        this.dailyMissions = [];
        this.customMissions = JSON.parse(localStorage.getItem('customMissions')) || [];
        this.missionStreak = parseInt(localStorage.getItem('missionStreak')) || 0;
        this.lastMissionDay = localStorage.getItem('lastMissionDay') || null;
        
        // Système de tracking d'exercices
        this.exercisesThisWeek = JSON.parse(localStorage.getItem('exercisesThisWeek')) || { pushups: 0, squats: 0, other: 0, week: this.getISOWeekNumber() };
        this.exercisesThisMonth = JSON.parse(localStorage.getItem('exercisesThisMonth')) || { pushups: 0, squats: 0, other: 0, month: new Date().getMonth() };
        this.weeklyMissions = [];
        this.monthlyMissions = [];
        this.completedWeeklyMissions = JSON.parse(localStorage.getItem('completedWeeklyMissions')) || {};
        this.completedMonthlyMissions = JSON.parse(localStorage.getItem('completedMonthlyMissions')) || {};
        
        this.init();
    }

    init() {
        this.loadData();
        this.registerSW();
        this.updateUI();
        this.generateDailyMissions();
        this.generateWeeklyMissions();
        this.generateMonthlyMissions();
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
        
        // Charger le tracking d'exercices
        const weekData = JSON.parse(localStorage.getItem('exercisesThisWeek'));
        const currentWeek = this.getISOWeekNumber();
        this.exercisesThisWeek = (weekData && weekData.week === currentWeek) ? weekData : { pushups: 0, squats: 0, other: 0, week: currentWeek };
        
        const monthData = JSON.parse(localStorage.getItem('exercisesThisMonth'));
        const currentMonth = new Date().getMonth();
        this.exercisesThisMonth = (monthData && monthData.month === currentMonth) ? monthData : { pushups: 0, squats: 0, other: 0, month: currentMonth };
        
        this.completedWeeklyMissions = JSON.parse(localStorage.getItem('completedWeeklyMissions')) || {};
        this.completedMonthlyMissions = JSON.parse(localStorage.getItem('completedMonthlyMissions')) || {};
        // Notifications flag
        this.notificationsEnabled = localStorage.getItem('notificationsEnabled') === '1';
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
        localStorage.setItem('exercisesThisWeek', JSON.stringify(this.exercisesThisWeek));
        localStorage.setItem('exercisesThisMonth', JSON.stringify(this.exercisesThisMonth));
        localStorage.setItem('completedWeeklyMissions', JSON.stringify(this.completedWeeklyMissions));
        localStorage.setItem('completedMonthlyMissions', JSON.stringify(this.completedMonthlyMissions));
    }

    getXpForLevel(level) {
        return 400 + (level * 100);
    }

    getRank(level) {
        if (level >= 81) return 'S - Légende du Bodyweight';
        if (level >= 51) return 'A - Maître';
        if (level >= 31) return 'B - Expert';
        if (level >= 16) return 'C - Avancé';
        if (level >= 6) return 'D - Intermédiaire';
        return 'E - Débutant';
    }

    getRankBounds(level) {
        if (level >= 81) return { rank: 'S', minLevel: 81, maxLevel: Infinity };
        if (level >= 51) return { rank: 'A', minLevel: 51, maxLevel: 80 };
        if (level >= 31) return { rank: 'B', minLevel: 31, maxLevel: 50 };
        if (level >= 16) return { rank: 'C', minLevel: 16, maxLevel: 30 };
        if (level >= 6) return { rank: 'D', minLevel: 6, maxLevel: 15 };
        return { rank: 'E', minLevel: 1, maxLevel: 5 };
    }

    getLevelUpMessage(level) {
        const messages = {
            6: "🔥 Passage au Rang D - Tu entres dans le sérieux de l'entraînement.",
            16: "⚡ Passage au Rang C - Ta puissance devient remarquable.",
            31: "💪 Passage au Rang B - Tu joins les experts du bodyweight.",
            51: "🏆 Passage au Rang A - Tu es un Maître de ton corps.",
            81: "👑 Passage au Rang S - Tu es une Légende du Bodyweight!"
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

    getExercisesByRank(level) {
        // Retourner les exercices basés sur le rang actuel
        if (level >= 81) {
            // Rang S (Légende) - Niv. 81+
            return [
                { name: '10 pompes d\'un bras', xp: 500, boost: { force: 10 }, category: 'Force' },
                { name: '50 squats pistol d\'une jambe', xp: 550, boost: { endurance: 10 }, category: 'Endurance' },
                { name: '180 sec hollow body hold', xp: 600, boost: { mental: 10 }, category: 'Mental' },
                { name: 'Défi légendaire complet', xp: 700, boost: { force: 5, endurance: 5, mental: 5, discipline: 5, aura: 5 }, category: 'Complet' }
            ];
        } else if (level >= 51) {
            // Rang A (Maître) - Niv. 51-80
            return [
                { name: '20 pompes archer', xp: 300, boost: { force: 6 }, category: 'Force' },
                { name: '100 squats pistol', xp: 320, boost: { endurance: 6 }, category: 'Endurance' },
                { name: '120 sec hollow body hold', xp: 280, boost: { mental: 5 }, category: 'Mental' },
                { name: '30 handstand push-ups (mur)', xp: 250, boost: { force: 5 }, category: 'Force' },
                { name: '50 pistol squats alternés', xp: 220, boost: { endurance: 4 }, category: 'Endurance' }
            ];
        } else if (level >= 31) {
            // Rang B (Expert) - Niv. 31-50
            return [
                { name: '40 pompes claquées', xp: 200, boost: { force: 4 }, category: 'Force' },
                { name: '50 pistol squats alternés', xp: 220, boost: { endurance: 4 }, category: 'Endurance' },
                { name: '90 sec planche + mouvements', xp: 180, boost: { mental: 3 }, category: 'Mental' },
                { name: '30 handstand push-ups (mur)', xp: 250, boost: { force: 5 }, category: 'Force' },
                { name: '40 fentes alternées', xp: 130, boost: { endurance: 2 }, category: 'Endurance' }
            ];
        } else if (level >= 16) {
            // Rang C (Avancé) - Niv. 16-30
            return [
                { name: '30 pompes diamant', xp: 150, boost: { force: 3 }, category: 'Force' },
                { name: '100 squats jump', xp: 170, boost: { endurance: 3 }, category: 'Endurance' },
                { name: '60 sec planche variations', xp: 120, boost: { mental: 2 }, category: 'Mental' },
                { name: '50 dips sur chaise', xp: 140, boost: { force: 3 }, category: 'Force' },
                { name: '40 fentes alternées', xp: 130, boost: { endurance: 2 }, category: 'Endurance' }
            ];
        } else if (level >= 6) {
            // Rang D (Intermédiaire) - Niv. 6-15
            return [
                { name: '50 pompes (3 séries)', xp: 100, boost: { force: 2 }, category: 'Force' },
                { name: '75 squats', xp: 110, boost: { endurance: 2 }, category: 'Endurance' },
                { name: '45 sec planche', xp: 80, boost: { mental: 1 }, category: 'Mental' },
                { name: '30 mountain climbers', xp: 90, boost: { force: 2 }, category: 'Force' },
                { name: '20 burpees', xp: 120, boost: { endurance: 2 }, category: 'Endurance' }
            ];
        } else {
            // Rang E (Débutant) - Niv. 1-5
            return [
                { name: '20 pompes (genoux si besoin)', xp: 50, boost: { force: 1 }, category: 'Force' },
                { name: '30 squats', xp: 60, boost: { endurance: 1 }, category: 'Endurance' },
                { name: '20 sec planche', xp: 40, boost: { mental: 1 }, category: 'Mental' },
                { name: 'Étirements 5 min', xp: 30, boost: { discipline: 1 }, category: 'Discipline' }
            ];
        }
    }

    generateDailyMissions() {
        // Générer à partir des exercices du rang actuel
        const exercises = this.getExercisesByRank(this.currentLevel);
        
        // Sélectionner 3 missions aléatoires du rang
        this.dailyMissions = exercises.sort(() => Math.random() - 0.5).slice(0, 3);
        this.updateMissionsUI();
    }

    // Retourne le numéro ISO de la semaine (lundi = début de semaine)
    getISOWeekNumber() {
        const date = new Date();
        const target = new Date(date.valueOf());
        const dayNr = (date.getDay() + 6) % 7; // Lundi=0, Dimanche=6
        target.setDate(target.getDate() - dayNr + 3);
        const firstThursday = new Date(target.getFullYear(), 0, 4);
        const diff = target - firstThursday;
        return 1 + Math.round(diff / 86400000 / 7);
    }

    generateWeeklyMissions() {
        this.weeklyMissions = [
            { 
                name: 'Compléter 5 jours d\'entraînement', 
                xp: 500, 
                boost: { force: 1, endurance: 1, mental: 1, discipline: 1, aura: 1 },
                progress: this.missionStreak,
                goal: 5,
                id: 'weekly-5days'
            },
            { 
                name: 'Total 100 pompes cette semaine', 
                xp: 200, 
                boost: { force: 2 },
                progress: this.getTotalPushupWeek(),
                goal: 100,
                id: 'weekly-pushups'
            },
            { 
                name: 'Total 200 squats cette semaine', 
                xp: 250, 
                boost: { endurance: 2 },
                progress: this.getTotalSquatsWeek(),
                goal: 200,
                id: 'weekly-squats'
            }
        ];
    }

    generateMonthlyMissions() {
        // Mensuels demandés: streak 7 jours et streak 30 jours
        this.monthlyMissions = [
            { 
                name: 'Maintenir un streak de 7 jours', 
                xp: 800, 
                boost: { mental: 3 },
                progress: Math.min(this.missionStreak, 7),
                goal: 7,
                id: 'monthly-streak-7'
            },
            { 
                name: 'Maintenir un streak de 30 jours', 
                xp: 3000, 
                boost: { force: 10, endurance: 10, mental: 10, discipline: 10, aura: 10 },
                progress: Math.min(this.missionStreak, 30),
                goal: 30,
                id: 'monthly-streak-30',
                badge: '🏆 Discipliné'
            }
        ];
    }

    getTotalPushupWeek() {
        // Total de pompes cette semaine (simulation, à tracker dans completeMission)
        return this.exercisesThisWeek.pushups || 0;
    }

    getTotalSquatsWeek() {
        // Total de squats cette semaine
        return this.exercisesThisWeek.squats || 0;
    }

    completeWeeklyMission(missionId) {
        const mission = this.weeklyMissions.find(m => m.id === missionId);
        if (mission && mission.progress >= mission.goal) {
            if (!this.completedWeeklyMissions[missionId]) {
                this.completedWeeklyMissions[missionId] = true;
                this.addXP(mission.xp, mission.boost);
                this.showMissionCompleted({ name: '✓ Mission Hebdo: ' + mission.name });
                this.saveData();
            }
        }
    }

    completeMonthlyMission(missionId) {
        const mission = this.monthlyMissions.find(m => m.id === missionId);
        if (mission && mission.progress >= mission.goal) {
            if (!this.completedMonthlyMissions[missionId]) {
                this.completedMonthlyMissions[missionId] = true;
                this.addXP(mission.xp, mission.boost);
                this.showMissionCompleted({ name: '✓ Défi Mensuel: ' + mission.name + ' ' + mission.badge });
                this.saveData();
            }
        }
    }

    updateWeeklyMissions() {
        this.generateWeeklyMissions();
        // Vérifier automatiquement les missions complétées
        this.weeklyMissions.forEach(mission => {
            if (mission.progress >= mission.goal) {
                this.completeWeeklyMission(mission.id);
            }
        });
    }

    updateMonthlyMissions() {
        this.generateMonthlyMissions();
        // Vérifier automatiquement les missions complétées
        this.monthlyMissions.forEach(mission => {
            if (mission.progress >= mission.goal) {
                this.completeMonthlyMission(mission.id);
            }
        });
    }

    updateDaily() {
        const lastDaily = localStorage.getItem('lastDaily');
        const today = new Date().toDateString();
        const lastStreakDay = localStorage.getItem('lastStreakDay');
        
        if (lastDaily !== today) {
            this.generateDailyMissions();
            localStorage.setItem('lastDaily', today);
        }
        
        // Vérifier si la semaine a changé
        const weekData = JSON.parse(localStorage.getItem('exercisesThisWeek'));
        const currentWeek = this.getISOWeekNumber();
        if (!weekData || weekData.week !== currentWeek) {
            this.exercisesThisWeek = { pushups: 0, squats: 0, other: 0, week: currentWeek };
            this.completedWeeklyMissions = {};
            this.saveData();
            this.sendSystemNotification('Missions hebdomadaires réinitialisées', 'Les objectifs hebdomadaires ont été réinitialisés pour la nouvelle semaine.', { tag: 'weekly-reset' });
        }
        
        // Vérifier si le mois a changé
        const monthData = JSON.parse(localStorage.getItem('exercisesThisMonth'));
        const currentMonth = new Date().getMonth();
        if (!monthData || monthData.month !== currentMonth) {
            this.exercisesThisMonth = { pushups: 0, squats: 0, other: 0, month: currentMonth };
            this.completedMonthlyMissions = {};
            this.saveData();
            this.sendSystemNotification('Défis mensuels réinitialisés', 'Les défis mensuels ont été réinitialisés pour le nouveau mois.', { tag: 'monthly-reset' });
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
            
            // Tracker les exercices (détecter le type à partir du nom)
            this.trackExercise(mission.name);
            
            // Vérifier si toutes les missions quotidiennes sont complétées
            if (isDaily && this.allDailyMissionsCompleted()) {
                this.missionStreak += 1;
                this.showStreakNotification();
                localStorage.setItem('lastStreakDay', new Date().toDateString());
            }
            
            // Mettre à jour automatiquement les missions hebdomadaires et mensuelles
            this.updateWeeklyMissions();
            this.updateMonthlyMissions();
            
            // Créer une animation de complétion
            this.showMissionCompleted(mission);
            this.updateMissionsUI();
            this.saveData();
        }
    }

    trackExercise(exerciseName) {
        const name = exerciseName.toLowerCase();
        
        // Détecter les pompes
        if (name.includes('pompe')) {
            const match = name.match(/(\d+)/);
            const count = match ? parseInt(match[1]) : 10;
            this.exercisesThisWeek.pushups += count;
            this.exercisesThisMonth.pushups += count;
        }
        
        // Détecter les squats
        if (name.includes('squat')) {
            const match = name.match(/(\d+)/);
            const count = match ? parseInt(match[1]) : 15;
            this.exercisesThisWeek.squats += count;
            this.exercisesThisMonth.squats += count;
        }
        
        // Autres exercices
        if (name.includes('burpee') || name.includes('mountain climber') || name.includes('dip') || name.includes('fente')) {
            this.exercisesThisWeek.other += 10;
            this.exercisesThisMonth.other += 10;
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
        // System notification
        this.sendSystemNotification('Streak +1 !', `🔥 Streak: ${this.missionStreak} jours`, { tag: 'streak' });
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
        // System notification
        this.sendSystemNotification('Streak interrompu', '💔 Ton streak est tombée. Reviens plus fort !', { tag: 'streak-broken' });
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
        // System notification
        const title = mission.name ? `Mission complétée` : 'Mission';
        const body = mission.name ? `${mission.name} — +${mission.xp || 0} XP` : 'Mission complétée';
        this.sendSystemNotification(title, body, { tag: 'mission-completed' });
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
        
        // Mettre à jour les missions
        this.updateMissionsUI();
    }

    updateMissionsUI() {
        const dailyDiv = document.getElementById('dailyMissions');
        dailyDiv.innerHTML = this.dailyMissions.map((m, i) => `
            <div class="mission ${m.done ? 'done' : ''}">
                <span>${m.name} <span class="xp-badge">+${m.xp} XP</span></span>
                <button onclick="app.completeMission(${i}, true)" class="mission-btn">${m.done ? '✓ Fait' : 'Compléter'}</button>
            </div>
        `).join('');

        const weeklyDiv = document.getElementById('weeklyMissions');
        weeklyDiv.innerHTML = this.weeklyMissions.map((m, i) => {
            const isCompleted = this.completedWeeklyMissions[m.id];
            return `
            <div class="mission ${isCompleted ? 'done' : ''}">
                <span>${m.name} <span class="xp-badge">+${m.xp} XP</span></span>
                <div class="mission-progress" style="font-size: 0.85em; color: #7fff00; margin: 4px 0;">${m.progress}/${m.goal}</div>
                <button onclick="app.completeWeeklyMission('${m.id}')" class="mission-btn ${isCompleted ? 'disabled' : ''}" ${isCompleted ? 'disabled' : ''}>${isCompleted ? '✓ Complétée' : 'Compléter'}</button>
            </div>
        `}).join('');

        const monthlyDiv = document.getElementById('monthlyMissions');
        monthlyDiv.innerHTML = this.monthlyMissions.map((m, i) => {
            const isCompleted = this.completedMonthlyMissions[m.id];
            return `
            <div class="mission ${isCompleted ? 'done' : ''}">
                <span>${m.name} <span class="xp-badge">+${m.xp} XP</span></span>
                ${m.badge ? `<div style="font-size: 0.85em; color: #ff7a18; margin: 4px 0;">${m.badge}</div>` : ''}
                <div class="mission-progress" style="font-size: 0.85em; color: #b700ff; margin: 4px 0;">${m.progress}/${m.goal}</div>
                <button onclick="app.completeMonthlyMission('${m.id}')" class="mission-btn ${isCompleted ? 'disabled' : ''}" ${isCompleted ? 'disabled' : ''}>${isCompleted ? '✓ Complétée' : 'Compléter'}</button>
            </div>
        `}).join('');

        const customDiv = document.getElementById('customMissions');
        customDiv.innerHTML = this.customMissions.map((m, i) => `
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
            localStorage.setItem('notificationsEnabled', '1');
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

    // Envoie une notification système (Service Worker si dispo, sinon Notification API)
    async sendSystemNotification(title, body, options = {}) {
        try {
            if (!('Notification' in window)) return;
            if (Notification.permission !== 'granted') return;

            // Prioriser Service Worker notifications lorsque disponible
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                const registration = await navigator.serviceWorker.ready;
                registration.showNotification(title, Object.assign({ body, tag: options.tag || title, icon: './icon-192.png', badge: './icon-192.png' }, options));
                return;
            }

            // Fallback direct
            new Notification(title, Object.assign({ body, icon: './icon-192.png', tag: options.tag || title }, options));
        } catch (e) {
            console.error('sendSystemNotification error', e);
        }
    }
}

const app = new ShadowMuscle();
