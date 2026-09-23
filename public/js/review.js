let R = null; // payload from /api/review

const $ = id => document.getElementById(id);

async function initReviewPage() {
  const profile = await API.checkAuth(true);
  if (!profile) return;

  renderNavbar('review');
  await loadWeek();
  setupEvents();

  if (window.HarshCoachWidget) {
    await window.HarshCoachWidget.init();
  }
}

async function loadWeek(date) {
  try {
    R = await API.get('/api/review' + (date ? `?date=${date}` : ''));
    if (R) render();
  } catch (err) {
    API.showToast('Failed to load the weekly review.');
  }
}

function shiftWeek(days) {
  const d = new Date(R.weekStart + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  loadWeek(d.toISOString().slice(0, 10));
}

const facts = rows => `<ul class="facts">${rows.map(([label, value]) =>
  `<li><span>${label}</span><b>${API.esc(value)}</b></li>`).join('')}</ul>`;

const answer = (field, label, placeholder = '', rows = 2) => `
  <label class="field-label">${label}</label>
  <textarea rows="${rows}" data-field="${field}" placeholder="${placeholder}">${API.esc(R.answers[field] || '')}</textarea>`;

function render() {
  const s = R.stats;
  const range = `${API.fmtDate(R.weekStart, { month: 'short', day: 'numeric' })} – ${API.fmtDate(R.weekEnd, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  $('weekLabel').textContent = (R.isCurrentWeek ? 'This week · ' : 'Week of ') + range;
  $('nextWeek').disabled = R.isCurrentWeek;

  $('reviewBody').innerHTML = `
    <section class="os-section primary">
      <p class="big-q">What moved the needle this week?</p>
      <textarea rows="3" data-field="needleMoved" placeholder="The 1–3 things that actually got Slotly closer to revenue">${API.esc(R.answers.needleMoved || '')}</textarea>
      ${s.slotly.needleList.length ? `<details style="margin-top:8px;"><summary class="small mono muted">Needle actions logged this week (${s.slotly.needleList.length})</summary>
        <ul class="small">${s.slotly.needleList.map(t => `<li>${API.esc(t)}</li>`).join('')}</ul></details>` : ''}
    </section>

    <section class="os-section">
      <div class="section-head"><span class="section-label">🔥 Slotly</span></div>
      ${facts([
        ['Days the product moved', s.slotly.productDays],
        ['Build actions', s.slotly.buildActions],
        ['Customer / validation actions', s.slotly.customerActions],
        ['Clinics first contacted this week', s.slotly.contactedThisWeek],
        ['Conversations (clinics contacted this week)', s.slotly.conversationsThisWeek],
        ['Demos booked (total)', s.slotly.pipeline.demosBooked],
        ['Trials (total)', s.slotly.pipeline.trials],
        ['Paying clinics', s.slotly.pipeline.paying]
      ])}
      ${answer('biggestCustomerLearning', 'Biggest customer learning', 'What did a clinic tell you that changes what you build or say?')}
    </section>

    <section class="os-section">
      <div class="section-head"><span class="section-label">🎥 Digital products</span></div>
      ${facts([
        ['Videos posted', `${s.products.videosPosted} / ${s.products.videoTarget}`],
        ['Videos planned for next week', s.products.videosPlanned],
        ['Days with product work', s.products.productWorkDays],
        ['Products worked on', s.products.productsTouched.join(', ') || '—'],
        ['Slotly marketing posts', s.products.slotlyPostsPosted]
      ])}
      ${answer('bestContent', 'Best-performing content', 'Which video worked, and why?')}
      ${answer('sales', 'Sales (if any)', 'e.g. 3 × Cybersecurity Guide', 1)}
    </section>

    <section class="os-section">
      <div class="section-head"><span class="section-label">🗓️ TradeIQ</span></div>
      ${facts([
        ['Weekend sessions', `${s.tradeiq.sessions} / 2`],
        ['Milestone', s.tradeiq.milestone || '—'],
        ['Milestone progress', s.tradeiq.progress + '%']
      ])}
      ${answer('tradeiqNotes', 'Progress notes', 'What got built? What\'s next weekend?')}
    </section>

    <section class="os-section">
      <div class="section-head"><span class="section-label">🧠 Learning</span></div>
      ${facts([
        ['Days with learning', s.learning.learningDays],
        ['Key lessons saved', s.learning.lessonsAdded],
        [`${s.learning.name} modules`, `${s.learning.modulesCompleted} / ${s.learning.totalModules || '?'}`]
      ])}
      ${answer('mostUsefulLesson', 'Most useful lesson', 'And where will you apply it?')}
    </section>

    <section class="os-section">
      <div class="section-head"><span class="section-label">🎯 Focus</span></div>
      ${facts([
        ['New ideas added', s.focus.newIdeas],
        ['Ideas in the parking lot', s.focus.parkedTotal],
        ['Weekdays Slotly moved', `${s.focus.slotlyWeekdays} / ${s.focus.weekdaysLogged} logged`]
      ])}
      <label class="field-label">Did I stay focused?</label>
      <select data-field="stayedFocused">${API.options([['', '—'], ['yes', 'Yes'], ['mostly', 'Mostly'], ['no', 'No']], R.answers.stayedFocused || '')}</select>
    </section>

    <section class="os-section primary">
      <p class="big-q">What is the ONE most important outcome for next week?</p>
      <textarea rows="2" data-field="nextWeekOutcome" placeholder="e.g. First clinic starts a paid trial">${API.esc(R.answers.nextWeekOutcome || '')}</textarea>
      <div class="small muted mono" style="margin-top:6px;">This shows at the top of Today all next week.</div>
    </section>`;
}

function setupEvents() {
  $('prevWeek').addEventListener('click', () => shiftWeek(-7));
  $('nextWeek').addEventListener('click', () => shiftWeek(7));
  API.bindAutosave($('reviewBody'), async (field, value) => {
    const res = await API.put('/api/review', { weekStart: R.weekStart, [field]: value }).catch(() => null);
    if (!res) return API.showToast('Could not save.');
    R.answers[field] = value;
  });
}

initReviewPage();
