let currentCoachData = null;

async function initCoachRoom() {
  const profile = await API.checkAuth(true);
  if (!profile) return;

  renderNavbar('coach');
  await loadAssessment();

  if (window.HarshCoachWidget) {
    await window.HarshCoachWidget.init();
  }

  setupEventListeners();
}

async function loadAssessment() {
  try {
    const data = await API.request('/api/coach/assessment');
    if (!data) return;
    currentCoachData = data;
    renderCoachRoom(data);
  } catch (err) {
    API.showToast('Failed to load coach assessment.');
  }
}

function renderCoachRoom(data) {
  // Update header
  if (data.profile) {
    document.getElementById('coachRoomAvatar').textContent = data.profile.avatar;
    document.getElementById('coachRoomName').textContent = data.profile.name;
    document.getElementById('coachRoomTitle').textContent = `${data.profile.title} · ${data.profile.tone}`;
  }

  // Update Anger Gauge
  const angerLabels = ['0 - CALM / PROUD ✅', '1 - SUSPICIOUS 👀', '2 - IRRITATED ⚠️', '3 - ANGRY SHOUTING 🔥', '4 - MAXIMUM RAGE MELTDOWN 😡'];
  const angerText = document.getElementById('angerLevelText');
  const angerFill = document.getElementById('angerGaugeFill');
  const progressText = document.getElementById('progressSummaryText');

  angerText.textContent = angerLabels[data.angerLevel] || 'LEVEL 3';
  angerFill.className = `anger-gauge-fill level-${data.angerLevel}`;
  progressText.textContent = `${data.completedCount} of ${data.totalBlocks} blocks finished today`;

  // Update Hero Roast
  const hero = document.getElementById('roastHero');
  hero.className = `drill-room-hero anger-${data.angerLevel}`;

  document.getElementById('roastHeadline').textContent = data.headline;
  document.getElementById('roastBody').textContent = data.roast;
  document.getElementById('actionText').textContent = data.actionPrompt || 'Start Block 1 now.';

  // Highlight active personality
  document.querySelectorAll('.personality-card').forEach(card => {
    if (card.getAttribute('data-personality') === data.personality) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
}

function yellAloudCurrentRoast() {
  if (!currentCoachData) return;
  if (!('speechSynthesis' in window)) {
    API.showToast('Browser text-to-speech audio not supported.');
    return;
  }

  window.speechSynthesis.cancel();
  const text = currentCoachData.audioShout || currentCoachData.headline;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.pitch = 1.18;
  utterance.rate = 1.1;
  utterance.volume = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Male') || v.name.includes('David') || v.name.includes('Google')));
  if (voice) utterance.voice = voice;

  window.speechSynthesis.speak(utterance);
  API.showToast(`📢 SHOUTING: "${text}"`);
}

async function demolishExcuse() {
  const input = document.getElementById('excuseInput');
  const excuse = input.value.trim();

  if (!excuse) {
    API.showToast('Please type an excuse for the Coach to dismantle!');
    return;
  }

  try {
    const res = await API.request('/api/coach/shred-excuse', {
      method: 'POST',
      body: JSON.stringify({ excuse })
    });

    if (res) {
      const resultBox = document.getElementById('shredResult');
      document.getElementById('shredQuote').textContent = `COACH RAGE: ${res.rageQuote}`;
      document.getElementById('shredText').textContent = res.shredded;
      resultBox.classList.add('show');

      // Voice shout shredded excuse
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(res.shredded);
        utterance.pitch = 1.15;
        utterance.rate = 1.1;
        window.speechSynthesis.speak(utterance);
      }
    }
  } catch (err) {
    API.showToast('Failed to shred excuse.');
  }
}

async function setPersonality(personality) {
  try {
    const res = await API.request('/api/auth/settings', {
      method: 'PUT',
      body: JSON.stringify({ coachSettings: { personality } })
    });

    if (res && res.success) {
      API.showToast(`Coach personality switched to ${personality.toUpperCase()}!`);
      await loadAssessment();
      if (window.HarshCoachWidget) {
        await window.HarshCoachWidget.refreshAssessment(true);
      }
    }
  } catch (err) {
    API.showToast('Failed to switch personality.');
  }
}

function setupEventListeners() {
  document.getElementById('roomYellBtn').addEventListener('click', yellAloudCurrentRoast);
  document.getElementById('refreshRoastBtn').addEventListener('click', loadAssessment);
  document.getElementById('shredBtn').addEventListener('click', demolishExcuse);

  document.getElementById('excuseInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') demolishExcuse();
  });

  // Quick excuse pills
  document.querySelectorAll('.quick-excuse-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.getElementById('excuseInput').value = pill.getAttribute('data-excuse');
      demolishExcuse();
    });
  });

  // Personality cards
  document.querySelectorAll('.personality-card').forEach(card => {
    card.addEventListener('click', () => {
      const p = card.getAttribute('data-personality');
      setPersonality(p);
    });
  });
}

initCoachRoom();
