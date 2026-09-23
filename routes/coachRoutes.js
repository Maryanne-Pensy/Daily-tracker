const express = require('express');
const authMiddleware = require('../middleware/auth');
const storage = require('../services/storage');
const { buildToday } = require('../services/today');
const { generateAiRoast, shredExcuseWithAi, isGeminiConfigured } = require('../services/gemini');

const router = express.Router();

const ROAST_PROFILES = {
  sergeant: {
    name: "Drill Sergeant Stone",
    title: "Bootcamp Commander",
    avatar: "🪖",
    tone: "LOUD, SHORT, NO EXCUSES",
    signoff: "Move, soldier."
  },
  mom: {
    name: "Auntie Ling",
    title: "High-Expectations Auntie",
    avatar: "👵",
    tone: "WARM BUT RELENTLESS",
    signoff: "Auntie believes in you. Now go."
  },
  wallstreet: {
    name: "Rex Sterling",
    title: "Ruthless Closer",
    avatar: "💼",
    tone: "REVENUE-FOCUSED HUSTLE",
    signoff: "Revenue doesn't wait."
  },
  ramsay: {
    name: "Chef Gordon",
    title: "Kitchen Commander",
    avatar: "🍳",
    tone: "FIERY BUT FAIR",
    signoff: "Now get back in the kitchen."
  }
};

// Pull the facts the coach reacts to out of today's state.
function coachState(t) {
  const s = t.score;
  return {
    dayType: t.dayType,
    phase: t.phase,
    hour: t.hour,
    mission: (t.day.mission || '').trim(),
    slotlyMoved: s.slotlyProduct || s.slotlyCustomers,
    slotlyProduct: s.slotlyProduct,
    slotlyCustomers: s.slotlyCustomers,
    tradeiqSession: s.tradeiq,
    tradeiqTouchedOnWeekday: t.tradeiqTouchedOnWeekday,
    videosPosted: t.videosPosted,
    videoTarget: t.videoTarget,
    productWork: Boolean(t.day.productWork),
    learningDone: Boolean(t.day.learningDone),
    ideasThisWeek: t.ideasThisWeek,
    followUpsDue: t.slotlyStats.followUpsDue,
    points: s.points,
    max: s.max,
    streak: t.streak.count
  };
}

function pickSituation(st) {
  const weekday = st.dayType === 'weekday';
  if (st.points >= st.max) return 'win';
  if (weekday && st.tradeiqTouchedOnWeekday && !st.slotlyMoved) return 'tradeiq_escape';
  if (st.ideasThisWeek >= 2 && !st.slotlyMoved) return 'idea_hopping';
  if (weekday && !st.slotlyMoved) return 'slotly';
  if (!weekday && !st.tradeiqSession) return 'weekend';
  if (st.videosPosted < st.videoTarget && (st.phase !== 'main' || st.hour >= 15)) return 'videos';
  if (st.followUpsDue > 0) return 'followups';
  if (!st.learningDone) return 'learning';
  return 'progress';
}

function fallbackAssessment(st) {
  const situation = pickSituation(st);
  const nextVideo = Math.min(st.videosPosted + 1, st.videoTarget);
  const slotlyAnger = st.hour < 11 ? 1 : st.hour < 14 ? 2 : st.hour < 17 ? 3 : 4;
  const messages = {
    win: {
      angerLevel: 0,
      headline: "SHIPPED. THAT'S A REAL DAY.",
      roast: `Main mission moved, content shipped, learning done — ${st.points}/${st.max}. Streak: ${st.streak} day(s). Rest properly; tomorrow starts at zero and you'll do it again.`,
      audioShout: "Great day. Rest, then do it again tomorrow.",
      actionPrompt: "Write tomorrow's Slotly mission, then log off."
    },
    tradeiq_escape: {
      angerLevel: 3,
      headline: "TRADEIQ IS A WEEKEND PROJECT",
      roast: "TradeIQ is a weekend project. Don't use it to escape the uncomfortable customer work Slotly needs. It'll still be there on Saturday.",
      audioShout: "Close TradeIQ. Open Slotly.",
      actionPrompt: "Close TradeIQ and message one clinic."
    },
    idea_hopping: {
      angerLevel: 3,
      headline: "ANOTHER IDEA ISN'T THE PROBLEM",
      roast: `Another idea isn't the problem. Execution is. ${st.ideasThisWeek} new ideas this week — they're safe in the parking lot. Get back to Slotly.`,
      audioShout: "Park the idea. Ship Slotly.",
      actionPrompt: st.mission ? `Do the first step of: ${st.mission}` : "Pick one Slotly task and finish it."
    },
    slotly: {
      angerLevel: slotlyAnger,
      headline: "THE MAIN MISSION IS STILL WAITING",
      roast: st.mission
        ? `You're polishing side projects while "${st.mission}" is still sitting there. One real move — a fix, a clinic DM, a demo booked — changes today. Push Slotly forward.`
        : "No Slotly mission yet. You can't hit a target you haven't named. Write the one task that gets you closer to a paying clinic, then start it.",
      audioShout: "Push Slotly forward. Now.",
      actionPrompt: st.mission ? `Start: ${st.mission}` : "Write today's Slotly mission, then do 25 focused minutes on it."
    },
    weekend: {
      angerLevel: 1,
      headline: "WEEKEND = TRADEIQ TIME",
      roast: "It's the weekend — TradeIQ's turn. One focused session beats a week of thinking about it: build, test, fix.",
      audioShout: "TradeIQ session. Let's go.",
      actionPrompt: "Start your TradeIQ session and tick the first item."
    },
    videos: {
      angerLevel: st.videosPosted === 0 && st.hour >= 19 ? 3 : 2,
      headline: `YOU SAID ${st.videoTarget} VIDEOS TODAY`,
      roast: `You said ${st.videoTarget} videos today. ${st.videosPosted} of ${st.videoTarget} are out. Done beats perfect — ship them.`,
      audioShout: "You said two videos. Ship them.",
      actionPrompt: `Finish and post video ${nextVideo}.`
    },
    followups: {
      angerLevel: 1,
      headline: "FOLLOW-UPS ARE DUE",
      roast: `${st.followUpsDue} clinic follow-up(s) due. Most yeses come from the follow-up, not the first message.`,
      audioShout: "Send the follow-ups.",
      actionPrompt: "Open Clinics and send today's follow-ups."
    },
    learning: {
      angerLevel: 1,
      headline: "MAIN WORK MOVED — NOW 15 MINUTES OF LEARNING",
      roast: "Slotly moved. Take one copywriting lesson and apply it to a Slotly post or a product page. Learn → apply → sell.",
      audioShout: "One lesson. Apply it.",
      actionPrompt: "Do one lesson and write down one takeaway."
    },
    progress: {
      angerLevel: 1,
      headline: "GOOD — KEEP IT MOVING",
      roast: `The main mission moved today — ${st.points}/${st.max}. Finish what's left, then stop. Consistency beats heroics.`,
      audioShout: "Good. Keep going.",
      actionPrompt: "Close the next open item on Today's sheet."
    }
  };
  return { ...messages[situation], situation };
}

function fallbackShred(excuse) {
  const clean = excuse.toLowerCase();
  if (/tired|sleepy|exhausted|drained/.test(clean)) {
    return {
      shredded: "Tired is real — so shrink the task, don't skip it. 20 minutes on the smallest Slotly step, then decide whether to keep going. Most days you will.",
      rageQuote: "SMALLER TASK, NOT NO TASK."
    };
  }
  if (/time|busy|later/.test(clean)) {
    return {
      shredded: "You don't need more time, you need fewer priorities. Main hours are Slotly. Pick the one task that moves you toward a paying clinic and cut the rest.",
      rageQuote: "FOCUS IS SAYING NO."
    };
  }
  if (/reject|afraid|scared|fear|no one|nobody/.test(clean)) {
    return {
      shredded: "A clinic saying no costs you nothing. Not asking costs you your first paying customer. Send one message — just one — and see what happens.",
      rageQuote: "ASK. THE WORST ANSWER IS FREE."
    };
  }
  if (/idea|new project|bored/.test(clean)) {
    return {
      shredded: "New ideas feel like progress because starting is fun. Finishing is where the money is. Park it and get back to Slotly.",
      rageQuote: "PARK IT. SHIP SLOTLY."
    };
  }
  return {
    shredded: `"${excuse}" — noted. Now what's the smallest step you can still take today? Do that one thing, then check in again.`,
    rageQuote: "ONE STEP. RIGHT NOW."
  };
}

function cleanAi(result) {
  if (!result || typeof result !== 'object') return null;
  const level = Math.max(0, Math.min(4, Math.round(Number(result.angerLevel) || 0)));
  const text = k => (typeof result[k] === 'string' ? result[k] : '');
  if (!text('headline') || !text('roast')) return null;
  return {
    angerLevel: level,
    headline: text('headline'),
    roast: text('roast'),
    audioShout: text('audioShout') || text('headline'),
    actionPrompt: text('actionPrompt')
  };
}

// GET /api/coach/assessment
router.get('/assessment', authMiddleware, async (req, res) => {
  try {
    const today = await buildToday(req.user.userId);
    const user = today.user || {};
    const personality = (user.coachSettings && user.coachSettings.personality) || 'sergeant';
    const voiceEnabled = Boolean(user.coachSettings && user.coachSettings.voiceEnabled);
    const profile = ROAST_PROFILES[personality] || ROAST_PROFILES.sergeant;
    const st = coachState(today);
    const fallback = fallbackAssessment(st);

    let assessment = null;
    let isAiPowered = false;
    if (isGeminiConfigured()) {
      try {
        assessment = cleanAi(await generateAiRoast({ ...st, situation: fallback.situation, personality, profile }));
        isAiPowered = Boolean(assessment);
      } catch (geminiErr) {
        console.warn('[Gemini AI Fallback]', geminiErr.message);
      }
    }
    if (!assessment) {
      assessment = { ...fallback, roast: `${fallback.roast} ${profile.signoff}` };
    }

    res.json({
      ...assessment,
      situation: fallback.situation,
      points: st.points,
      max: st.max,
      streakCount: st.streak,
      personality,
      profile,
      voiceEnabled,
      isAiPowered
    });
  } catch (err) {
    console.error('Coach assessment error:', err);
    res.status(500).json({ error: 'Failed to generate coach assessment.' });
  }
});

// POST /api/coach/shred-excuse
router.post('/shred-excuse', authMiddleware, async (req, res) => {
  try {
    const excuse = String(req.body.excuse || '').trim().slice(0, 300);
    if (!excuse) {
      return res.status(400).json({ error: 'Enter an excuse for the coach to take apart!' });
    }

    const user = await storage.findUserById(req.user.userId);
    const personality = (user && user.coachSettings && user.coachSettings.personality) || 'sergeant';

    let result = null;
    let isAiPowered = false;
    if (isGeminiConfigured()) {
      try {
        const ai = await shredExcuseWithAi(excuse, personality);
        if (ai && typeof ai.shredded === 'string') {
          result = { shredded: ai.shredded, rageQuote: String(ai.rageQuote || '') };
          isAiPowered = true;
        }
      } catch (geminiErr) {
        console.warn('[Gemini Shred Fallback]', geminiErr.message);
      }
    }
    if (!result) result = fallbackShred(excuse);

    res.json({ ...result, isAiPowered });
  } catch (err) {
    console.error('Shred excuse error:', err);
    res.status(500).json({ error: 'Failed to shred excuse.' });
  }
});

module.exports = router;
