// Starting data for a Builder OS account. Everything here is editable in the app.

// Slotly marketing: 30 days -> booked demo calls (not views).
// Pillars rotate: Relatability, Clinic problems, Building in public, Demo, Trust.
const DEMO_CTA = "DM 'DEMO' and I'll show you Slotly with your clinic's setup";
const SLOTLY_30_DAY_PLAN = [
  ['reel', 'Relatability', "POV: it's 9pm and you're still answering booking DMs", 'If your booking system is your Instagram inbox, this one is for you.', "Follow — I'm building the fix"],
  ['carousel', 'Clinic problem', '5 ways no-shows quietly drain an aesthetics clinic', 'One no-show on a filler appointment costs more than you think.', DEMO_CTA],
  ['reel', 'Building in public', "I'm building booking software for aesthetic clinics — here's why", "Most clinic software was built for hospitals, not a two-room aesthetics studio.", 'Follow the build'],
  ['reel', 'Relatability', "Scrolling WhatsApp to find a client's last treatment", "\"Where did I write down her last units...?\"", "Comment 'RECORDS' if this is you"],
  ['reel', 'Demo', 'Booking a treatment in Slotly in under 30 seconds', 'Watch me book a lip filler appointment — deposit included — in 30 seconds.', DEMO_CTA],
  ['carousel', 'Clinic problem', "Why deposits aren't rude — they're protection", 'Clients who pay a deposit show up.', 'Save this + share it with a practitioner friend'],
  ['carousel', 'Trust', 'What clinic owners told me when I asked about their booking system', 'I asked practitioners one question. The answers surprised me.', "Practitioner? DM me — I'd love your take"],
  ['reel', 'Building in public', 'Week 1 of showing Slotly to clinics: what I learned', 'I showed Slotly to real clinics this week. Here is what they said.', 'Book a free 15-min demo — link in bio'],
  ['reel', 'Demo', 'Client records: treatment history, notes and photos in one place', "Consultation forms in a drawer? Let's fix that.", DEMO_CTA],
  ['reel', 'Relatability', "Things practitioners are tired of hearing: \"Can I just come in at 6?\"", 'Every practitioner has heard this one.', 'Follow for more clinic life'],
  ['carousel', 'Clinic problem', 'The real cost of running your clinic from Instagram DMs', 'Your inbox is not a booking system.', DEMO_CTA],
  ['reel', 'Demo', 'Automatic reminders that cut no-shows', 'This one message cuts no-shows without you lifting a finger.', DEMO_CTA],
  ['reel', 'Trust', "Why I'm building Slotly only for aesthetic clinics", 'Software for everyone ends up fitting no one.', 'Follow if you run a clinic'],
  ['carousel', 'Education', 'A simple rebooking system: get clients back every 3–4 months', 'Your best clients are the ones you already have.', 'Save this — then DM DEMO to automate it'],
  ['reel', 'Building in public', 'A clinic owner asked for this feature — so I built it', 'Real feedback, shipped this week.', 'Tell me what you want next'],
  ['reel', 'Relatability', 'Your Saturday: 3 treatments, 40 DMs, 2 no-shows', 'Sound familiar?', "Follow — I'm fixing this"],
  ['reel', 'Demo', 'Taking deposits online so your calendar is protected', 'Protect your calendar before the client even arrives.', DEMO_CTA],
  ['carousel', 'Clinic problem', "Paper consent forms vs digital records: what you're risking", 'Where are your consent forms right now?', 'Save this'],
  ['carousel', 'Trust', 'Your client data: how Slotly keeps it private', 'Client records are sensitive. Here is how I handle them.', 'DM me any questions'],
  ['reel', 'Demo', 'Full walkthrough: a day in a clinic running on Slotly', 'From first booking to aftercare — one day, one app.', 'Book a demo — link in bio'],
  ['reel', 'Relatability', "When a client asks \"what did we use last time?\"", 'Every practitioner knows this moment.', "Comment if you've been there"],
  ['carousel', 'Education', 'How to set a no-show policy clients respect (template)', 'A no-show policy only works if clients actually read it.', "Comment 'POLICY' and I'll send it"],
  ['reel', 'Building in public', "Honest update: what's working, what's not, what's next for Slotly", 'No highlight reel — the real update.', 'Follow the build'],
  ['reel', 'Demo', 'Setting up your services, prices and treatment times in 5 minutes', 'Your whole treatment menu, set up before your coffee gets cold.', DEMO_CTA],
  ['reel', 'Trust', 'What happens on a Slotly demo call (15 minutes, no pressure)', "Here's exactly what a demo looks like.", 'Book yours — link in bio'],
  ['carousel', 'Clinic problem', '4 signs your clinic has outgrown DMs and a paper diary', 'If you tick 2 of these, it is time.', DEMO_CTA],
  ['reel', 'Relatability', "Solo injector's week vs clinic owner's week", 'Same job, very different problems.', 'Follow for more'],
  ['carousel', 'Demo', "Before vs after Slotly: one clinic's week", 'Use real numbers from a testing clinic only.', 'Book a demo — link in bio'],
  ['reel', 'Trust', "Founding clinic offer: why I'm looking for my first 5 clinics", 'I want 5 clinics to shape Slotly with me.', "DM 'FOUNDING'"],
  ['reel', 'Building in public', '30 days of building Slotly in public — what clinic owners taught me', '30 days, lots of conversations, here is what I learned.', 'Book your demo — link in bio']
];

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
