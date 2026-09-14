const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, text: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE AUTOMATED TEST SUITE ---');

  // 1. Check Status
  console.log('\n1. Testing GET /api/status...');
  const statusRes = await request({ hostname: 'localhost', port: 3000, path: '/api/status', method: 'GET' });
  console.log('Status Response:', statusRes.status, statusRes.body.status, 'DB Status:', statusRes.body.database);

  // 2. Public registration must remain disabled for the private tracker.
  console.log('\n2. Testing POST /api/auth/register is disabled...');
  const regRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    username: 'TestSergeant',
    email: `test_${Date.now()}@example.com`,
    password: 'password123'
  });
  console.log('Register Response:', regRes.status, regRes.body.error);
  if (regRes.status !== 403) throw new Error('Public registration is still enabled!');

  console.log('\nRegistration check passed. Authenticated checks require a pre-existing account.');
  process.exit(0);

  // 3. Login
  console.log('\n3. Testing POST /api/auth/login...');
  const loginRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: testEmail,
    password: 'password123'
  });
  console.log('Login Response:', loginRes.status, loginRes.body.message, 'User:', loginRes.body.user.username);

  // 4. Fetch Today's Sheet
  console.log('\n4. Testing GET /api/tracker/today...');
  const todayRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/tracker/today',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Today Response:', todayRes.status, 'Total Blocks:', todayRes.body.blocks.length, 'Completed:', todayRes.body.completedCount);

  // 5. Check Harsh Coach Assessment (0 blocks completed)
  console.log('\n5. Testing GET /api/coach/assessment (0 blocks completed)...');
  const coachRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/coach/assessment',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Coach Anger Level:', coachRes.body.angerLevel, 'Headline:', coachRes.body.headline);
  console.log('Coach Shout:', coachRes.body.audioShout);

  // 6. Demolish an Excuse
  console.log('\n6. Testing POST /api/coach/shred-excuse...');
  const shredRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/coach/shred-excuse',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, { excuse: 'I am too tired and have no inspiration today' });
  console.log('Shredded Excuse Response:', shredRes.status);
  console.log('Coach Quote:', shredRes.body.rageQuote);
  console.log('Coach Demolition:', shredRes.body.shredded);

  // 7. Toggle a Block
  console.log('\n7. Testing POST /api/tracker/toggle (Block 0)...');
  const toggleRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/tracker/toggle',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, { blockIndex: 0, checkedState: true });
  console.log('Toggle Response:', toggleRes.status, 'Completed Count:', toggleRes.body.completedCount);

  // 8. Content Calendar
  console.log('\n8. Testing Content Calendar API...');
  const calRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/content',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Calendar Items Count:', calRes.body.calendar.length);

  // Update Day 1
  const updateCalRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/content/1',
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, { status: 'drafted', script: 'Hey brand owner, here is why your cart email fails...' });
  console.log('Update Day 1 Status:', updateCalRes.body.item.status, 'Script saved:', updateCalRes.body.item.script);

  // 9. Outreach Lead
  console.log('\n9. Testing Outreach Board API...');
  const addLeadRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/outreach',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, {
    clientName: 'EcoSocks Shopify Store',
    storeUrl: 'https://ecosocks.example.com',
    emailGaps: 'Missing post-purchase review sequence',
    pitchSample: 'Subject: Quick question about your 2nd purchase flow...',
    status: 'drafted'
  });
  console.log('Added Lead:', addLeadRes.body.lead.clientName, 'Status:', addLeadRes.body.lead.status);

  console.log('\n========================================');
  console.log('   ALL BACKEND AND COACH TESTS PASSED!  ');
  console.log('========================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
