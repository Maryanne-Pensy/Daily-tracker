const express = require('express');
const authMiddleware = require('../middleware/auth');
const storage = require('../services/storage');
const { generateAiRoast, shredExcuseWithAi, isGeminiConfigured } = require('../services/gemini');

const router = express.Router();

function getTodayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

const BLOCK_NAMES = [
  "Research 3 clients",
  "Write 3 email samples",
  "Editing pass",
  "Send outreach",
  "Content — script + edit",
  "Trade IQ (PROTECTED)"
];

const ROAST_PROFILES = {
  sergeant: {
    name: "Drill Sergeant Stone",
    title: "Hardcore Bootcamp Commander",
    avatar: "🪖",
    tone: "SCREAMING MILITARY DRILL"
  },
  mom: {
    name: "Auntie Ling",
    title: "High-Expectations Disappointed Parent",
    avatar: "👵",
    tone: "HEAVY GUILT & DISAPPOINTMENT"
  },
  wallstreet: {
    name: "Rex Sterling",
    title: "Ruthless Wall Street Closer",
    avatar: "💼",
    tone: "HIGH-STAKES HUSTLE & SHOUTING"
  },
  ramsay: {
    name: "Chef Gordon",
    title: "Furious Kitchen Tyrant",
    avatar: "🍳",
    tone: "SAVAGE CULINARY ROASTS"
  }
};

function generateFallbackRoast(completedCount, total, personality, streakCount) {
  const hour = new Date().getHours();
  let angerLevel = 1;

  if (completedCount === 0) {
    angerLevel = hour >= 16 ? 4 : (hour >= 11 ? 3 : 2);
  } else if (completedCount <= 2) {
    angerLevel = hour >= 17 ? 3 : 2;
  } else if (completedCount <= 5) {
    angerLevel = 1;
  } else {
    angerLevel = 0;
  }

  if (personality === 'sergeant') {
    if (completedCount === 0) {
      return {
        angerLevel: 4,
        headline: "DROP EVERYTHING! 0 OUT OF 6 COMPLETED AND THE DAY IS SLIPPING AWAY?!",
        roast: "WHAT IN THE WORLD IS HAPPENING HERE?! You have checked ZERO blocks! Are you running a charity for laziness?! Step 1: Research 3 clients. You haven't even opened a single store! STOP OVERTHINKING AND MOVE YOUR FINGERS!",
        audioShout: "ZERO BLOCKS?! ARE YOU SERIOUS?! GET OFF SOCIAL MEDIA AND OPEN BLOCK ONE RIGHT NOW!",
        actionPrompt: "Complete Block 1: Research 3 clients immediately."
      };
    } else if (completedCount <= 2) {
      return {
        angerLevel: 2,
        headline: `ONLY ${completedCount} BLOCKS DONE?! THAT'S A WARMUP, NOT A VICTORY!`,
        roast: `You did ${completedCount} blocks and you think you can relax?! Look at the rest of the sheet! Where are the 3 email samples?! Who is going to pitch them, your grandmother?! Pick up the pace!`,
        audioShout: `ONLY ${completedCount} BLOCKS?! KEEP PUSHING, WE ARE NOT DONE YET!`,
        actionPrompt: "Move to Block 2 or 3: Draft your email samples."
      };
    } else if (completedCount <= 5) {
      return {
        angerLevel: 1,
        headline: `${completedCount} OF 6 DOWN — DO NOT CHOKE AT THE FINISH LINE!`,
        roast: "You are close. Very close. But 'almost' pays zero bills! If you skip Block 6 (Trade IQ), remember it is PROTECTED! Finish this entire day!",
        audioShout: "ALMOST THERE! DO NOT QUIT ON THE LAST BLOCK! FINISH STRONG!",
        actionPrompt: "Complete the remaining blocks to lock in today's streak!"
      };
    } else {
      return {
        angerLevel: 0,
        headline: "ALL 6 BLOCKS COMPLETED! MISSION ACCOMPLISHED, SOLDIER!",
        roast: `Streak is locked at ${streakCount} days! Outstanding discipline! Tomorrow morning at 0800, the battlefield resets. Good work today.`,
        audioShout: "OUTSTANDING WORK! ALL SIX BLOCKS FINISHED! TOMORROW WE DO IT AGAIN!",
        actionPrompt: "Well done. Protect your streak again tomorrow."
      };
    }
  }

  if (personality === 'mom') {
    if (completedCount === 0) {
      return {
        angerLevel: 4,
        headline: "Auntie Ling is sighing so loud the neighbors can hear it.",
        roast: "0 blocks?! Cousin Timmy already closed three high-ticket clients, built a software company, and bought his mother a condo, and you are sitting here with an empty sheet?! Why you make your mother worry like this?! Go research three stores right now!",
        audioShout: "ZERO BLOCKS?! Why you procrastinate?! Cousin Timmy already finished his whole day!",
        actionPrompt: "Make Auntie proud: check off Block 1."
      };
    } else {
      return {
        angerLevel: completedCount === 6 ? 0 : 2,
        headline: completedCount === 6 ? "All 6 blocks done! That's my boy/girl!" : "Keep going!",
        roast: completedCount === 6 ? `Streak is ${streakCount}! Good job, but tomorrow must be even better!` : "Only a few blocks done. Keep working!",
        audioShout: completedCount === 6 ? "Good job! Now eat some fruit and rest!" : "Don't stop halfway!",
        actionPrompt: "Finish the sheet."
      };
    }
  }

  if (personality === 'wallstreet') {
    if (completedCount === 0) {
      return {
        angerLevel: 4,
        headline: "COFFEE IS FOR CLOSERS! YOU HAVE ZERO CHECKMARKS ON THE BOARD!",
        roast: "Every minute you sit here not pitching clients, your competitors are eating your lunch! 0 blocks?! You don't have a copywriting business, you have an expensive desk hobby! SEND THE OUTREACH!",
        audioShout: "ZERO BLOCKS?! COFFEE IS FOR CLOSERS! GET THOSE PITCHES OUT!",
        actionPrompt: "Open your outreach sheet and send 3 cold emails."
      };
    } else {
      return {
        angerLevel: completedCount === 6 ? 0 : 2,
        headline: completedCount === 6 ? "PROFITABLE DAY! NOW DOUBLE IT!" : `${completedCount}/6 — KEEP DIALING!`,
        roast: completedCount === 6 ? "Great execution. Now let's turn those pitches into monthly retainers." : "Good progress, but volume is king. Finish the remaining blocks!",
        audioShout: completedCount === 6 ? "Boom! Day complete! That's how we close deals!" : "Keep grinding!",
        actionPrompt: "Keep momentum going."
      };
    }
  }

  if (personality === 'ramsay') {
    if (completedCount === 0) {
      return {
        angerLevel: 4,
        headline: "LOOK AT THIS SHEET! IT'S RAW! THERE IS NOTHING ON IT!",
        roast: "WAKE UP! You haven't done a single block! Your email copy is so raw it's still being typed by monkeys! Research 3 clients right now you doughnut! MOVE!",
        audioShout: "WAKE UP! THERE IS NOTHING DONE! YOU ARE WASTING TIME!",
        actionPrompt: "Stop being an idiot sandwich. Start Block 1."
      };
    } else {
      return {
        angerLevel: completedCount === 6 ? 0 : 2,
        headline: completedCount === 6 ? "FINALLY, SOME GOOD DISCIPLINE!" : "STILL NOT FINISHED!",
        roast: completedCount === 6 ? "Delicious. All 6 blocks served clean. Take 10 minutes, then get ready for tomorrow." : "You've only plated half the meal! Finish the rest of the sheet!",
        audioShout: completedCount === 6 ? "Spot on! That is how you do it!" : "Back to work! Don't leave it half-done!",
        actionPrompt: "Finish the plate."
      };
    }
  }

  return {
    angerLevel: 3,
    headline: "GET TO WORK!",
    roast: "Zero progress recorded. Start working on Block 1 now!",
    audioShout: "GET TO WORK!",
    actionPrompt: "Check your first block."
  };
}

function fallbackShred(excuse) {
  const clean = excuse.toLowerCase();
  if (clean.includes('tired') || clean.includes('sleepy') || clean.includes('exhausted')) {
    return {
      shredded: "TIRED?! You think clients pay for energy, or do they pay for results?! Drink a glass of cold water, wash your face, and do just 15 minutes of Block 1! Once you start, the fatigue vanishes. NO EXCUSES!",
      rageQuote: "FATIGUE IS A MENTAL ILLUSION CREATED BY PROCRASTINATION!"
    };
  }
  if (clean.includes('time') || clean.includes('busy') || clean.includes('later')) {
    return {
      shredded: "NO TIME?! You had time to type this excuse! You have the same 24 hours as everyone else cashing $5,000 retainer checks! Cut 45 minutes of doomscrolling and DO IT NOW!",
      rageQuote: "YOU DON'T LACK TIME, YOU LACK DISCIPLINE!"
    };
  }
  return {
    shredded: `"${excuse}"?! That is the most textbook self-sabotage I have ever heard! Tear that excuse up, throw it in the trash, and look at the sheet! START RIGHT NOW!`,
    rageQuote: "EVERY EXCUSE IS A REFUSAL TO GROW!"
  };
}

// GET /api/coach/assessment
router.get('/assessment', authMiddleware, async (req, res) => {
  try {
    const today = getTodayStr();
    const user = await storage.findUserById(req.user.userId);
    const progress = await storage.getTodayProgress(req.user.userId, today);
    const checked = progress.checked || [false, false, false, false, false, false];
    const completedCount = checked.filter(Boolean).length;
    const streakCount = user && user.streak ? user.streak.count : 0;
    const personality = (user && user.coachSettings && user.coachSettings.personality) || 'sergeant';
    const voiceEnabled = (user && user.coachSettings && user.coachSettings.voiceEnabled) || false;

    const incompleteBlockNames = [];
    checked.forEach((done, i) => {
      if (!done) incompleteBlockNames.push(BLOCK_NAMES[i]);
    });

    let assessment = null;
    let isAiPowered = false;

    // Try Gemini AI first if configured
    if (isGeminiConfigured()) {
      try {
        assessment = await generateAiRoast({
          completedCount,
          totalBlocks: 6,
          incompleteBlockNames,
          streakCount,
          personality,
          hour: new Date().getHours()
        });
        isAiPowered = true;
      } catch (geminiErr) {
        console.warn('[Gemini AI Fallback]', geminiErr.message);
      }
    }

    if (!assessment) {
      assessment = generateFallbackRoast(completedCount, 6, personality, streakCount);
    }

    res.json({
      ...assessment,
      completedCount,
      totalBlocks: 6,
      streakCount,
      personality,
      profile: ROAST_PROFILES[personality] || ROAST_PROFILES.sergeant,
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
    const { excuse } = req.body;
    if (!excuse || !excuse.trim()) {
      return res.status(400).json({ error: 'Enter an excuse for the coach to dismantle!' });
    }

    const user = await storage.findUserById(req.user.userId);
    const personality = (user && user.coachSettings && user.coachSettings.personality) || 'sergeant';

    let result = null;
    let isAiPowered = false;

    if (isGeminiConfigured()) {
      try {
        result = await shredExcuseWithAi(excuse, personality);
        isAiPowered = true;
      } catch (geminiErr) {
        console.warn('[Gemini Shred Fallback]', geminiErr.message);
      }
    }

    if (!result) {
      result = fallbackShred(excuse);
    }

    res.json({ ...result, isAiPowered });
  } catch (err) {
    console.error('Shred excuse error:', err);
    res.status(500).json({ error: 'Failed to shred excuse.' });
  }
});

module.exports = router;
