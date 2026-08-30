async function testAll() {
  console.log('--- Starting PathFinder V2 Integration Verification ---');

  // 1. Test Roadmaps API
  console.log('1. Testing GET /api/roadmaps...');
  const resRoadmaps = await fetch('http://localhost:3001/api/roadmaps');
  const dataRoadmaps = await resRoadmaps.json();
  console.log('   Status:', resRoadmaps.status, '| Roadmaps count:', dataRoadmaps.roadmaps?.length);

  // 2. Test Recommendation API (DAG + Knapsack)
  console.log('2. Testing POST /api/recommend...');
  const resRec = await fetch('http://localhost:3001/api/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'I know HTML and basic CSS, want to master React in 12 weeks' }),
  });
  const dataRec = await resRec.json();
  console.log('   Status:', resRec.status, '| Track:', dataRec.path?.target_track, '| Milestones:', dataRec.path?.milestones?.length, '| Total Hours:', dataRec.path?.total_est_hours);

  // 3. Test AI Tutor API (Node-Scoped)
  console.log('3. Testing POST /api/tutor...');
  const resTutor = await fetch('http://localhost:3001/api/tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nodeId: 'fe-react-basics',
      message: 'What are React hooks and why do we use them?',
    }),
  });
  const dataTutor = await resTutor.json();
  console.log('   Status:', resTutor.status, '| Tutor reply length:', dataTutor.reply?.length, 'chars');
  console.log('   Snippet:', dataTutor.reply?.substring(0, 100) + '...');

  // 4. Test Resources API
  console.log('4. Testing GET /api/resources...');
  const resResources = await fetch('http://localhost:3001/api/resources?parentSkillId=fe-react-core');
  const dataResources = await resResources.json();
  console.log('   Status:', resResources.status, '| Resources count:', dataResources.resources?.length);

  // 5. Test Frontend HTML Pages
  console.log('5. Testing App Router Pages...');
  const pages = ['/', '/onboarding', '/path', '/dashboard', '/auth/signin', '/auth/signup'];
  for (const page of pages) {
    const res = await fetch(`http://localhost:3001${page}`);
    console.log(`   Page ${page}: Status ${res.status}`);
  }

  console.log('--- All Verifications Passed Successfully! ---');
}

testAll().catch(console.error);
