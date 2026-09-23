// Starting data for a Builder OS account. Everything here is editable in the app.

// Slotly marketing: 30 days -> booked demo calls (not views).
// Each phase has its own goal and closing CTA; "note" flags posts that need real material.
const SLOTLY_PHASES = [
  {
    name: 'Relatability',
    goal: 'Show them their own day. They should think "that\'s literally me."',
    cta: "Does this sound like your clinic? Comment SYSTEM and I'll DM you.",
    posts: [
      ['reel', "POV: A client texts you at 11pm asking to reschedule and you're scrolling through 40 WhatsApp chats to find her file"],
      ['carousel', 'I counted how many apps one practitioner uses to run her clinic. It was 7.'],
      ['reel', '"You have your own business" vs. what that actually looks like at 9am on a Tuesday'],
      ['carousel', "Things I've heard practitioners say they have to remember, word for word", "Needs real quotes from your DMs or calls. Don't invent them."],
      ['reel', 'The exact moment a client asks "what did we do last time?" and you go quiet for 3 seconds too long'],
      ['carousel', 'What a "day off" actually looks like when you run your own clinic'],
      ['reel', "The day you realize you're not running a side hustle anymore. You're running a business with no systems."]
    ]
  },
  {
    name: 'The real problems',
    goal: 'Name what it costs them: lost bookings, no-shows, missing notes.',
    cta: "Does this sound like your clinic? Comment SYSTEM and I'll DM you.",
    posts: [
      ['carousel', "What actually happens when a client's appointment lives only in a WhatsApp message from 3 weeks ago"],
      ['reel', `"It's in here somewhere": searching your own phone for a client's allergy note`],
      ['carousel', '5 things I watched a practitioner dig through her phone to find', "Best with real footage from a practitioner you've spoken to."],
      ['reel', 'The client who "definitely confirmed" but never actually did'],
      ['carousel', 'Everything that has to happen behind one appointment that takes 2 seconds to book'],
      ['reel', 'I asked a practitioner what one no-show cost her that week. Her answer surprised me.', 'Needs a real answer. Ask this on your calls in week 1.'],
      ['carousel', "It's not that you need more apps. It's that none of your apps talk to each other."]
    ]
  },
  {
    name: 'Education and building',
    goal: "Show that you're building this with practitioners, not guessing.",
    cta: "I'm talking to 10 practitioners this month about how they run bookings. Link in bio to grab 15 minutes.",
    posts: [
      ['reel', "Why I'm building Slotly (and the conversation that made me start)"],
      ['carousel', 'What I think a clinic system actually needs to do, based on what I keep hearing, not what I assumed'],
      ['reel', "I almost didn't add buffer time between appointments until a practitioner told me why it mattered", 'Use a feature a practitioner really asked you about.'],
      ['carousel', 'What should happen the second a client books, and what usually happens instead'],
      ['reel', 'A feature I built, then scrapped, because a practitioner told me it was useless', 'Only post if it really happened. Otherwise swap in another real story from your calls.'],
      ['carousel', `Why "what did we do last time?" shouldn't be a hard question to answer`],
      ['reel', 'Building consent forms taught me how much trust clients put in their practitioner']
    ]
  },
  {
    name: 'Product and solution',
    goal: 'Show Slotly working. Real screens, no polish needed.',
    cta: 'Want to see it set up for your clinic? Book a free demo, link in bio.',
    posts: [
      ['reel', 'A real walkthrough, from booking to treatment note, no cuts, no polish'],
      ['carousel', 'Everything currently living in 7 different apps, now in one screen'],
      ['reel', "I recreated a real practitioner's WhatsApp chaos, then showed her the Slotly version", 'Needs a practitioner willing to take part. Line this up in week 2.'],
      ['carousel', 'Before: 40 unread chats. After: one dashboard. (Real screenshots, blurred where needed.)'],
      ['reel', "What a client's booking looks like end to end", 'Film with an early user if you have one by now; otherwise film it yourself.'],
      ['carousel', "The Slotly workflow, explained the way I'd explain it to my mum"]
    ]
  },
  {
    name: 'Trust and positioning',
    goal: 'Be honest about who you are, who it\'s for, and what you learned.',
    cta: 'Want to see it set up for your clinic? Book a free demo, link in bio.',
    posts: [
      ['reel', 'The real reason I started building this (not the pitch-deck version)'],
      ['carousel', "Who Slotly is for, and honestly, who it's not for yet"],
      ['reel', '30 days in. What I got wrong, what surprised me, what\'s next.']
    ]
  }
];

// Flattened: [{ day, contentType, title, cta, notes }]
const SLOTLY_30_DAY_PLAN = SLOTLY_PHASES.flatMap(phase => phase.posts.map(([contentType, title, note]) => ({
  contentType,
  title,
  cta: phase.cta,
  notes: `${phase.name}: ${phase.goal}` + (note ? `\n⚠️ ${note}` : '')
}))).map((post, i) => ({ day: i + 1, ...post }));

const DEFAULT_SLOTLY_CHECKLIST = [
  { label: 'Push Slotly product forward', tag: 'product' },
  { label: 'Contact / follow up with potential clinics', tag: 'customers' },
  { label: 'Respond to all Slotly conversations', tag: 'customers' },
  { label: 'Record customer feedback / learning', tag: 'customers' }
];

const TRADEIQ_CHECKLIST = {
  saturday: ['Build', 'Test', 'Fix', 'Review'],
  sunday: ['Build', 'Test', 'Plan next weekend']
};

const DEFAULT_PROJECTS = [
  {
    key: 'slotly', kind: 'main', status: 'active', name: 'Slotly',
    description: 'SaaS for aesthetic practitioners and small/private clinics: appointments, client records, treatments, deposits, calendars and reminders.',
    milestone: 'Finish launch-critical features and get the first paying clinic',
    progress: 85
  },
  {
    key: 'tradeiq', kind: 'weekend', status: 'active', name: 'TradeIQ',
    description: 'AI-powered trading journal and trading coach SaaS. Weekend project.',
    milestone: '', progress: 0
  },
  {
    key: '', kind: 'parked', status: 'parked', name: 'Gym / Salon / Barbershop Management System',
    description: 'Management software for gyms, salons and barbershops.',
    whyInteresting: 'Similar booking/client-record problems to Slotly — could reuse a lot.',
    potentialCustomer: 'Gym, salon and barbershop owners',
    nextStep: 'Revisit after Slotly has paying clinics'
  }
];

const DEFAULT_PRODUCTS = [
  {
    name: 'Cybersecurity Guide', category: 'Cybersecurity', version: 'V1', status: 'v1',
    description: 'Practical cybersecurity guide.', launchStatus: 'V1 done'
  }
];

const DEFAULT_LEARNING = [
  {
    name: 'Copywriting Course',
    notes: 'Supporting skill: learn copywriting and apply it to selling my own products (Slotly, digital products).'
  }
];

module.exports = {
  SLOTLY_30_DAY_PLAN,
  DEFAULT_SLOTLY_CHECKLIST,
  TRADEIQ_CHECKLIST,
  DEFAULT_PROJECTS,
  DEFAULT_PRODUCTS,
  DEFAULT_LEARNING
};
