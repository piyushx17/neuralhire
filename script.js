/* ============================================================
   NeuralHire — script.js
   Groq LLaMA 3.3 70B · Full stack recruitment screener
   ============================================================ */

'use strict';

// ─── CONFIG ────────────────────────────────────────────────
const CONFIG = {
  // PRIMARY: Groq (fast, free)
  GROQ_API_KEY: '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',
  GROQ_MODEL:   'llama-3.3-70b-versatile',

  // FALLBACK: Gemini (get free key → https://aistudio.google.com/app/apikey)
  GEMINI_API_KEY: 'AIzaSyD6KmVPG-VBViCZ0WNmKEUIAm05s9eAhvA',   // ← paste your Gemini key here if you want fallback
  GEMINI_MODEL:   'gemini-1.5-flash',

  GAS_WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbzmSLcWTcafeTRRw0Xct_-2dxppKMX8ci-mIWbOyNRsnLXh94MS-xuKnN3Mt79slgSy/exec',
  MAX_RETRIES: 2,
};

// Set PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ─── STATE ─────────────────────────────────────────────────
const state = {
  resumeText: '',
  fileName: '',
  fileSize: '',
  activeTab: 'upload',
  analysisResult: null,
  startTime: null,
  debugLogs: [],
};

// Keywords pool for animation
const KEYWORDS = {
  skill:  ['Python', 'JavaScript', 'Leadership', 'SQL', 'Problem Solving', 'Communication', 'Java', 'React', 'Node.js', 'Data Analysis', 'Project Management', 'Agile'],
  tech:   ['Machine Learning', 'REST API', 'Docker', 'AWS', 'PostgreSQL', 'TensorFlow', 'Kubernetes', 'CI/CD', 'GraphQL', 'Redis', 'Git', 'Linux'],
  tool:   ['VS Code', 'Figma', 'Jira', 'Notion', 'Slack', 'Postman', 'Tableau', 'Excel', 'MATLAB', 'Pandas', 'NumPy', 'Scikit-learn'],
};

const PROGRESS_STAGES = [
  { pct: 10, msg: 'Parsing document structure...', step: 'Document Parser' },
  { pct: 25, msg: 'Extracting candidate information...', step: 'Entity Extraction' },
  { pct: 42, msg: 'Analyzing skills & experience...', step: 'Skills Analyzer' },
  { pct: 58, msg: 'Matching against job description...', step: 'JD Matcher' },
  { pct: 72, msg: 'Running LLaMA 3.3 inference...', step: 'AI Processing' },
  { pct: 85, msg: 'Generating compatibility insights...', step: 'Insight Engine' },
  { pct: 95, msg: 'Compiling final report...', step: 'Report Builder' },
  { pct: 100, msg: 'Analysis complete!', step: 'Done' },
];

// ─── DOM REFS ───────────────────────────────────────────────
const $ = id => document.getElementById(id);
const $q = sel => document.querySelector(sel);

// ─── PARTICLE CANVAS ────────────────────────────────────────
function initParticles() {
  const canvas = $('particle-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createParticles() {
    particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.4,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      alpha: Math.random() * 0.5 + 0.1,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(167, 139, 250, ${p.alpha})`;
      ctx.fill();
    });

    // Draw connecting lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          const alpha = (1 - dist / 110) * 0.12;
          ctx.strokeStyle = `rgba(167, 139, 250, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  resize();
  createParticles();
  draw();
  window.addEventListener('resize', () => { resize(); createParticles(); });
}

// ─── SCREEN MANAGEMENT ──────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = '';
  });

  const target = $(id);
  target.style.display = 'flex';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => { target.classList.add('active'); });
  });
}

function hideScreen(id) {
  const el = $(id);
  el.classList.remove('active');
  setTimeout(() => { el.style.display = 'none'; }, 500);
}

// ─── TAB SWITCHING ───────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      state.activeTab = targetTab;

      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      $(`tab-${targetTab}`).classList.remove('hidden');

      // Reset state on switch
      if (targetTab === 'upload') {
        state.resumeText = $('resume-text').value.trim();
      }
      checkAnalyzeReady();
    });
  });
}

// ─── DRAG & DROP ─────────────────────────────────────────────
function initDragDrop() {
  const dropZone = $('drop-zone');
  const fileInput = $('file-input');

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  $('file-remove').addEventListener('click', () => {
    state.resumeText = '';
    state.fileName = '';
    fileInput.value = '';
    $('file-preview').classList.add('hidden');
    dropZone.style.display = '';
    checkAnalyzeReady();
  });
}

async function handleFile(file) {
  const allowed = ['application/pdf', 'text/plain', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  const ext = file.name.split('.').pop().toLowerCase();
  if (!['pdf', 'txt', 'doc', 'docx'].includes(ext)) {
    showToast('Unsupported file type. Use PDF, DOCX, or TXT.', 'error');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showToast('File too large. Maximum size is 10MB.', 'error');
    return;
  }

  showToast(`Reading ${file.name}...`, 'info');

  try {
    let text = '';

    if (ext === 'pdf') {
      text = await extractPdfText(file);
    } else if (ext === 'txt') {
      text = await readAsText(file);
    } else {
      // DOC/DOCX: read as text (basic extraction)
      text = await readDocxAsText(file);
    }

    if (!text || text.trim().length < 30) {
      showToast('Could not extract text. Try pasting the resume instead.', 'warning');
      return;
    }

    state.resumeText = text.trim();
    state.fileName = file.name;
    state.fileSize = formatBytes(file.size);

    $('file-name').textContent = file.name;
    $('file-size').textContent = state.fileSize;
    $('file-preview').classList.remove('hidden');
    $('drop-zone').style.display = 'none';

    showToast(`Extracted ${text.split(/\s+/).length} words from ${file.name}`, 'success');
    checkAnalyzeReady();
  } catch (err) {
    log('File read error:', err.message);
    showToast('Failed to read file. Please try paste mode.', 'error');
  }
}

async function extractPdfText(file) {
  if (typeof pdfjsLib === 'undefined') throw new Error('PDF.js not loaded');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join(' ') + '\n';
  }
  return fullText;
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

async function readDocxAsText(file) {
  // Basic docx text extraction (strips XML tags)
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
  try {
    const b64 = btoa(binary);
    // Try to decode as text first
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const text = decoder.decode(arrayBuffer);
    // Strip XML-like tags, keep content
    const stripped = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const words = stripped.split(' ').filter(w => /^[a-zA-Z0-9@.,\-()]+$/.test(w) && w.length > 1);
    return words.join(' ');
  } catch {
    throw new Error('DOCX parsing failed');
  }
}

function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── ANALYZE BUTTON STATE ────────────────────────────────────
function checkAnalyzeReady() {
  const jd = $('job-desc').value.trim();
  const hasResume = (state.activeTab === 'upload' && state.resumeText) ||
                    (state.activeTab === 'paste' && $('resume-text').value.trim().length > 30);
  const hasJD = jd.length > 20;
  $('analyze-btn').disabled = !(hasResume && hasJD);
}

// ─── MAIN ANALYZE TRIGGER ────────────────────────────────────
async function runAnalysis() {
  let resumeText = state.resumeText;
  if (state.activeTab === 'paste') {
    resumeText = $('resume-text').value.trim();
  }

  const jobDesc = $('job-desc').value.trim();

  if (!resumeText || resumeText.length < 30) {
    showToast('Resume text is too short or empty.', 'error');
    return;
  }

  if (!jobDesc || jobDesc.length < 20) {
    showToast('Please provide a job description.', 'error');
    return;
  }

  state.startTime = Date.now();
  state.debugLogs = [];

  // Transition to processing screen
  hideScreen('screen-upload');
  setTimeout(() => {
    showScreen('screen-processing');
    startProcessingAnimation();
    analyzeWithFallback(resumeText, jobDesc);
  }, 350);
}

// ─── PROCESSING ANIMATION ────────────────────────────────────
let kwInterval = null;
let progressInterval = null;

function startProcessingAnimation() {
  // Reset progress
  $('proc-fill').style.width = '0%';
  $('proc-pct').textContent = '0%';
  $('proc-status').textContent = 'Initializing AI Engine...';

  // Start floating keywords
  if (kwInterval) clearInterval(kwInterval);
  kwInterval = setInterval(spawnKeyword, 700);

  // Simulate progress stages
  let stageIndex = 0;
  let currentPct = 0;
  const totalDuration = 6000; // ms for first 95%
  const stageDelay = totalDuration / PROGRESS_STAGES.length;

  if (progressInterval) clearInterval(progressInterval);

  function advanceStage() {
    if (stageIndex >= PROGRESS_STAGES.length - 1) {
      clearInterval(progressInterval);
      return;
    }
    const stage = PROGRESS_STAGES[stageIndex];
    animateProgressTo(stage.pct);
    $('proc-status').textContent = stage.msg;
    $('proc-step').textContent = stage.step;
    stageIndex++;
  }

  advanceStage();
  progressInterval = setInterval(advanceStage, stageDelay);
}

function animateProgressTo(targetPct) {
  const fill = $('proc-fill');
  const pctEl = $('proc-pct');
  let current = parseFloat(fill.style.width) || 0;

  const step = () => {
    if (current >= targetPct) return;
    current = Math.min(current + 0.8, targetPct);
    fill.style.width = `${current}%`;
    pctEl.textContent = `${Math.round(current)}%`;
    requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

function finishProgress() {
  clearInterval(progressInterval);
  clearInterval(kwInterval);
  animateProgressTo(100);
  $('proc-status').textContent = 'Analysis complete!';
  $('proc-step').textContent = 'Done';
}

function spawnKeyword() {
  const container = $('kw-container');
  const types = ['skill', 'tech', 'tool'];
  const type = types[Math.floor(Math.random() * types.length)];
  const word = KEYWORDS[type][Math.floor(Math.random() * KEYWORDS[type].length)];

  const rect = container.getBoundingClientRect();
  const leftPct = 10 + Math.random() * 80;
  const bottomStart = 20 + Math.random() * 60;

  const bubble = document.createElement('div');
  bubble.className = `kw-bubble type-${type}`;
  bubble.textContent = word;
  bubble.style.left = `${leftPct}%`;
  bubble.style.bottom = `${bottomStart}%`;

  container.appendChild(bubble);
  setTimeout(() => bubble.remove(), 3600);
}

// ─── SHARED AI PROMPT ────────────────────────────────────────
const AI_SYSTEM_PROMPT = `You are an expert HR recruiter and talent analyst. Analyze the provided resume against the job description.
You MUST respond with ONLY a valid JSON object — no markdown, no code blocks, no explanation, just raw JSON.
Required format exactly:
{
  "candidate_name": "Full name from resume, or 'Unknown' if not found",
  "match_score": <integer 0-100>,
  "missing_skills": ["skill1", "skill2", "skill3"],
  "summary": "2-3 sentences: overall fit assessment, key strengths, main gaps"
}
Rules:
- match_score: 80-100 = strong fit, 50-79 = moderate fit, 0-49 = weak fit
- missing_skills: list actual skills from JD that the resume lacks (3-8 items)
- summary: professional, specific, actionable
- ONLY output the JSON object, nothing else`;

// ─── TIER 1: GROQ ─────────────────────────────────────────────
async function callGroqAPI(resumeText, jobDesc, retries = 0) {
  log(`[Groq] Attempt ${retries + 1} | model: ${CONFIG.GROQ_MODEL}`);

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: CONFIG.GROQ_MODEL,
      messages: [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        { role: 'user', content: `RESUME:\n${resumeText.slice(0, 4000)}\n\n---\n\nJOB DESCRIPTION:\n${jobDesc.slice(0, 2000)}` },
      ],
      temperature: 0.2,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Groq HTTP ${res.status}: ${errBody.slice(0, 120)}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;
  log(`[Groq] Raw: ${raw}`);

  const result = parseJSON(raw);
  validateResult(result);
  log(`[Groq] ✓ Score: ${result.match_score}`);
  return result;
}

// ─── TIER 2: GEMINI ───────────────────────────────────────────
async function callGeminiAPI(resumeText, jobDesc) {
  if (!CONFIG.GEMINI_API_KEY || CONFIG.GEMINI_API_KEY.length < 10) {
    throw new Error('Gemini API key not configured');
  }

  log(`[Gemini] Calling model: ${CONFIG.GEMINI_MODEL}`);

  const prompt = `${AI_SYSTEM_PROMPT}\n\nRESUME:\n${resumeText.slice(0, 4000)}\n\n---\n\nJOB DESCRIPTION:\n${jobDesc.slice(0, 2000)}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 600,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${errBody.slice(0, 120)}`);
  }

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  log(`[Gemini] Raw: ${raw}`);

  if (!raw) throw new Error('Gemini returned empty content');

  const result = parseJSON(raw);
  validateResult(result);
  log(`[Gemini] ✓ Score: ${result.match_score}`);
  return result;
}

// ─── TIER 3: MOCK (last resort / offline demo) ───────────────
function getMockResult() {
  log('[Mock] Both APIs failed. Returning demo result.');
  return {
    candidate_name: 'Demo Candidate',
    match_score: 62,
    missing_skills: ['Docker', 'Kubernetes', 'GraphQL', 'CI/CD Pipeline'],
    summary: 'APIs are temporarily unavailable. This is a mock result for UI testing only. Real analysis requires a valid Groq or Gemini API key.',
  };
}

// ─── FALLBACK ORCHESTRATOR (Groq → Gemini → Mock) ───────────
async function analyzeWithFallback(resumeText, jobDesc) {
  let result = null;
  let usedProvider = '';

  // ── GROQ: up to MAX_RETRIES attempts ──
  for (let attempt = 0; attempt < CONFIG.MAX_RETRIES; attempt++) {
    try {
      $('proc-status').textContent = attempt === 0
        ? 'Connecting to Groq LLaMA 3.3...'
        : `Groq retry ${attempt + 1} of ${CONFIG.MAX_RETRIES}...`;
      result = await callGroqAPI(resumeText, jobDesc, attempt);
      usedProvider = 'Groq LLaMA 3.3 70B';
      break;
    } catch (err) {
      log(`[Groq] Attempt ${attempt + 1} failed: ${err.message}`);
      if (attempt < CONFIG.MAX_RETRIES - 1) {
        showToast(`Groq retry ${attempt + 1}...`, 'warning');
        await sleep(1200);
      }
    }
  }

  // ── GEMINI: if Groq failed ──
  if (!result) {
    showToast('Groq unavailable — switching to Gemini...', 'warning');
    log('[Fallback] Trying Gemini...');
    $('proc-status').textContent = 'Switching to Gemini 1.5 Flash...';

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await callGeminiAPI(resumeText, jobDesc);
        usedProvider = 'Gemini 1.5 Flash';
        break;
      } catch (err) {
        log(`[Gemini] Attempt ${attempt + 1} failed: ${err.message}`);
        if (attempt === 0) {
          await sleep(1000);
        }
      }
    }
  }

  // ── MOCK: if both failed ──
  if (!result) {
    showToast('All AI APIs failed — showing demo result', 'error');
    $('proc-status').textContent = 'Using offline demo mode...';
    await sleep(800);
    result = getMockResult();
    usedProvider = 'Mock (offline)';
  }

  log(`[Done] Provider used: ${usedProvider}`);
  result._provider = usedProvider;

  state.analysisResult = result;
  finishProgress();

  // Save to GAS asynchronously
  saveToSheets(result).catch(err => log('[GAS] Save failed:', err.message));

  // Transition to results screen
  setTimeout(() => {
    hideScreen('screen-processing');
    setTimeout(() => {
      showScreen('screen-results');
      renderResults(result);
    }, 400);
  }, 1200);
}

function parseJSON(raw) {
  if (!raw) throw new Error('Empty response from AI');

  // Clean up markdown fences if any
  let cleaned = raw.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Extract JSON object if wrapped in other text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`JSON parse failed: ${cleaned.slice(0, 100)}`);
  }
}

function validateResult(result) {
  if (typeof result.match_score !== 'number') throw new Error('Invalid match_score');
  if (!Array.isArray(result.missing_skills)) throw new Error('Invalid missing_skills');
  if (typeof result.summary !== 'string') throw new Error('Invalid summary');
  result.match_score = Math.max(0, Math.min(100, Math.round(result.match_score)));
  result.candidate_name = result.candidate_name || 'Unknown Candidate';
}

// ─── RESULTS RENDERING ───────────────────────────────────────
function renderResults(result) {
  const elapsed = ((Date.now() - state.startTime) / 1000).toFixed(1);
  $('analysis-time').textContent = `${elapsed}s`;
  $('result-timestamp').textContent = new Date().toLocaleTimeString();

  // Candidate name
  $('candidate-name').textContent = result.candidate_name;

  // Summary
  $('summary-text').textContent = result.summary;

  // Score animation
  setTimeout(() => animateScore(result.match_score), 300);

  // Missing skills
  const skillsGrid = $('skills-grid');
  skillsGrid.innerHTML = '';

  if (result.missing_skills.length === 0) {
    $('skills-note').textContent = '✓ No critical skill gaps detected!';
    skillsGrid.innerHTML = `<div class="skill-tag" style="background:var(--success-dim);color:var(--success);border-color:rgba(74,222,128,0.3)">All required skills present</div>`;
  } else {
    result.missing_skills.forEach((skill, i) => {
      const tag = document.createElement('div');
      tag.className = 'skill-tag';
      tag.textContent = skill;
      tag.style.animationDelay = `${i * 0.08}s`;
      skillsGrid.appendChild(tag);
    });
    $('skills-note').textContent = `${result.missing_skills.length} skill gap${result.missing_skills.length > 1 ? 's' : ''} identified`;
  }

  // Debug log
  $('debug-log').textContent = JSON.stringify({ result, logs: state.debugLogs }, null, 2);

  showToast(`Analysis complete — ${elapsed}s`, 'success');
}

function animateScore(score) {
  const ring = $('ring-progress');
  const numEl = $('score-num');
  const verdictEl = $('score-verdict');

  // Determine color
  let color, verdictClass, verdictText;
  if (score >= 80) {
    color = '#4ade80';
    verdictClass = 'verdict-good';
    verdictText = 'STRONG FIT';
  } else if (score >= 50) {
    color = '#fbbf24';
    verdictClass = 'verdict-mid';
    verdictText = 'PARTIAL FIT';
  } else {
    color = '#f87171';
    verdictClass = 'verdict-low';
    verdictText = 'WEAK FIT';
  }

  // Ring circumference = 2 * π * 56 ≈ 351.86
  const circumference = 2 * Math.PI * 56;
  const offset = circumference - (score / 100) * circumference;

  ring.style.stroke = color;
  ring.style.strokeDashoffset = offset;
  numEl.style.color = color;

  verdictEl.className = `score-verdict ${verdictClass}`;
  verdictEl.textContent = verdictText;

  // Animate number
  let current = 0;
  const duration = 1500;
  const start = performance.now();

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
    current = Math.round(eased * score);
    numEl.textContent = current;
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

// ─── SAVE TO GOOGLE SHEETS (GAS) ────────────────────────────
async function saveToSheets(result) {
  if (!CONFIG.GAS_WEB_APP_URL || CONFIG.GAS_WEB_APP_URL.includes('YOUR_GAS')) {
    log('[GAS] No URL configured. Skipping Sheets save.');
    return;
  }

  const payload = {
    candidate_name: result.candidate_name,
    match_score: result.match_score,
    missing_skills: result.missing_skills.join(', '),
    summary: result.summary,
    timestamp: new Date().toISOString(),
  };

  const res = await fetch(CONFIG.GAS_WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  log('[GAS] Response:', text);
}

// ─── TOAST SYSTEM ────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = $('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-dot"></span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ─── DEBUG LOGGER ────────────────────────────────────────────
function log(...args) {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
  state.debugLogs.push(entry);
  console.log(entry);
}

// ─── UTILS ───────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── INIT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Initialize visual systems
  initParticles();
  initTabs();
  initDragDrop();

  // Show initial screen
  showScreen('screen-upload');

  // Job description char counter + readiness check
  $('job-desc').addEventListener('input', () => {
    const val = $('job-desc').value;
    $('jd-chars').textContent = val.length;
    checkAnalyzeReady();
  });

  // Resume paste input readiness
  $('resume-text').addEventListener('input', checkAnalyzeReady);

  // Analyze button
  $('analyze-btn').addEventListener('click', runAnalysis);

  // Back button
  $('back-btn').addEventListener('click', () => {
    hideScreen('screen-results');
    setTimeout(() => {
      showScreen('screen-upload');
      // Reset state
      state.resumeText = '';
      state.fileName = '';
      $('resume-text').value = '';
      $('job-desc').value = '';
      $('jd-chars').textContent = '0';
      $('file-preview').classList.add('hidden');
      $('drop-zone').style.display = '';
      $('file-input').value = '';
      $('analyze-btn').disabled = true;
    }, 400);
  });

  // Debug toggle
  $('debug-toggle').addEventListener('click', () => {
    const log = $('debug-log');
    const isHidden = log.classList.contains('hidden');
    log.classList.toggle('hidden');
    $('debug-toggle').textContent = isHidden ? 'Hide' : 'Show';
  });

  // Keyboard shortcut: Cmd/Ctrl+Enter to analyze
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      if (!$('analyze-btn').disabled) runAnalysis();
    }
  });

  log('[NeuralHire] Initialized. Ready for analysis.');
});
