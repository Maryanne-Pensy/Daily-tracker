const HarshCoachWidget = {
  coachData: null,
  speechSynth: window.speechSynthesis || null,
  isSpeaking: false,

  async init() {
    if (!API.getToken()) return;
    this.createDock();
    await this.refreshAssessment();
  },

  createDock() {
    if (document.getElementById('coachDock')) return;

    const dock = document.createElement('div');
    dock.id = 'coachDock';
    dock.className = 'coach-dock';
    dock.innerHTML = `
      <div class="coach-bubble" id="coachBubble">
        <div class="bubble-header">
          <span id="coachBubbleName">Drill Sergeant Stone</span>
          <span id="coachBubbleRage"></span>
        </div>
        <p class="bubble-text" id="coachBubbleText">Checking your progress...</p>
        <div class="bubble-actions">
          <button class="btn-bubble" id="coachVoiceBtn" title="Shout voice through speakers">📢 YELL ALOUD</button>
          <a href="/coach.html" class="btn-bubble" style="text-decoration:none;">COACH</a>
          <button class="btn-bubble" id="coachDismissBtn">✕</button>
        </div>
      </div>

      <div class="coach-avatar-btn" id="coachAvatarBtn" title="Coach">
        <span class="coach-avatar-icon" id="coachAvatarIcon">🪖</span>
        <span class="coach-rage-tag" id="coachRageTag">...</span>
      </div>
    `;

    document.body.appendChild(dock);

    // Event listeners
    document.getElementById('coachAvatarBtn').addEventListener('click', () => {
      this.toggleBubble();
    });

    document.getElementById('coachDismissBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('coachBubble').classList.remove('visible');
    });

    document.getElementById('coachVoiceBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.shoutAloud();
    });
  },

  async refreshAssessment(suppressAutoPopup = false) {
    try {
      const data = await API.request('/api/coach/assessment');
      if (!data) return;
      this.coachData = data;
      this.renderWidget(suppressAutoPopup);
    } catch (e) {
      console.warn('Failed to load coach assessment:', e);
    }
  },

  renderWidget(suppressAutoPopup) {
    const data = this.coachData;
    if (!data) return;

    const avatar = document.getElementById('coachAvatarIcon');
    const rageTag = document.getElementById('coachRageTag');
    const bubbleName = document.getElementById('coachBubbleName');
    const bubbleRage = document.getElementById('coachBubbleRage');
    const bubbleText = document.getElementById('coachBubbleText');
    const bubble = document.getElementById('coachBubble');

    if (!avatar || !rageTag) return;

    avatar.textContent = data.profile ? data.profile.avatar : '🪖';
    bubbleName.textContent = data.profile ? data.profile.name : 'Harsh Coach';

    const rageLabels = ['PROUD', 'ON TRACK', 'NUDGING', 'WORRIED', 'URGENT'];
    const currentRageLabel = rageLabels[data.angerLevel] || 'ON TRACK';
    rageTag.textContent = currentRageLabel;
    bubbleRage.textContent = currentRageLabel;
    bubbleText.textContent = data.roast;

    // Pop the bubble open when the main mission is slipping; shake only when it's urgent
    if (data.angerLevel >= 3 && !suppressAutoPopup) {
      if (data.angerLevel >= 4) {
        document.body.classList.add('shake-it');
        setTimeout(() => document.body.classList.remove('shake-it'), 450);
      }
      bubble.classList.add('visible');

      // Auto-voice if user enabled voice setting in profile
      if (data.voiceEnabled) {
        this.shoutAloud();
      }
    }
  },

  toggleBubble() {
    const bubble = document.getElementById('coachBubble');
    if (!bubble) return;
    bubble.classList.toggle('visible');
  },

  shoutAloud() {
    if (!this.speechSynth) {
      API.showToast('Text-to-speech audio is not supported in this browser.');
      return;
    }

    if (!this.coachData) return;

    // Cancel current speech if any
    this.speechSynth.cancel();

    const textToYell = this.coachData.audioShout || this.coachData.headline || "GET TO WORK!";
    const utterance = new SpeechSynthesisUtterance(textToYell);

    utterance.pitch = 1.15; // Punchy, tense pitch
    utterance.rate = 1.12;  // Urgent tempo
    utterance.volume = 1.0; // Maximum volume

    // Try finding an aggressive/deep voice
    const voices = this.speechSynth.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Male') || v.name.includes('David') || v.name.includes('Google')));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    this.speechSynth.speak(utterance);
    API.showToast(`📢 COACH SHOUTING: "${textToYell}"`);
  }
};

window.HarshCoachWidget = HarshCoachWidget;
