# NeuralHire — AI Smart Recruitment Screener
### Powered by Groq LLaMA 3.3 70B | Built for speed, built to impress.

---

## 🔗 Project Links

| Resource | Link |
|----------|------|
| **🌐 Live Web App** | [Open NeuralHire](https://script.google.com/macros/s/AKfycbzmSLcWTcafeTRRw0Xct_-2dxppKMX8ci-mIWbOyNRsnLXh94MS-xuKnN3Mt79slgSy/exec) |
| **📁 Apps Script Project** | [View Code.gs & helpers.gs](https://script.google.com/d/1qq2ZP7Xk5N0B-Ql6fOmV3tikaFGuj7qQuMPhDGju2I66MZlha9pKGNjn/edit?usp=sharing) |
| **📂 Code Folder (Drive)** | [Google Drive Folder](https://drive.google.com/drive/folders/13w7wMHrKjEJQWXokZXV0WVXbpblbsOPx?usp=sharing) |
| **📊 Google Sheet (DB)** | [Live Screening Data](https://docs.google.com/spreadsheets/d/1s1RRdaNRrM9A9EX_4d1ksjZo7p9UOuOL2yvEevsoxUw/edit?usp=sharing) |
| **💻 GitHub Repository** | [piyushx17/neuralhire](https://github.com/piyushx17/neuralhire) |

---

## 🗂️ Project Structure

```
recruitment-screener/
├── frontend/
│   ├── index.html       ← 3-screen app (Upload → Processing → Results)
│   ├── styles.css       ← Cyber-noir glassmorphism design system
│   └── script.js        ← Groq API, PDF.js, animations, all logic
├── backend/
│   ├── Code.gs          ← GAS main: Web App, Sheets storage, email alerts
│   └── helpers.gs       ← GAS utilities: stats, CSV export, triggers
└── README.md            ← You're here
```

---

## ⚡ Quick Start (Frontend Only — Works Immediately)

The frontend calls Groq directly. No backend required to try it.

```bash
# 1. Clone / open folder in VS Code
code recruitment-screener

# 2. Install Live Server extension in VS Code
#    (Search: "Live Server" by Ritwick Dey → Install)

# 3. Right-click index.html → "Open with Live Server"
#    → Opens at http://127.0.0.1:5500
```

**That's it.** The app is fully functional without the GAS backend.

> Alternatively, use the **[live deployed version](https://script.google.com/macros/s/AKfycbzmSLcWTcafeTRRw0Xct_-2dxppKMX8ci-mIWbOyNRsnLXh94MS-xuKnN3Mt79slgSy/exec)** — no setup needed.

---

## 🔑 API Key

Your Groq API key is pre-configured in `frontend/script.js`:

```javascript
const CONFIG = {
  GROQ_API_KEY: 'gsk_P5N...your-key...',
  GROQ_MODEL: 'llama-3.3-70b-versatile',
};
```

> ⚠️ **Security Note:** For production, move the API key to a backend proxy.
> Never expose API keys in public-facing frontend code.

---

## 🚀 VS Code Setup (Step-by-Step)

### 1. Prerequisites

```bash
# Install Node.js (for CLASPJS Google Apps Script CLI)
# Download from: https://nodejs.org

# Install clasp globally
npm install -g @google/clasp

# VS Code Extensions to install:
# - Live Server (Ritwick Dey)
# - Google Apps Script (better syntax highlighting)
# - Prettier (code formatting)
```

### 2. Open Project

```bash
cd recruitment-screener
code .
```

### 3. Run Frontend

```
Right-click frontend/index.html
→ Open with Live Server
→ Browser opens at http://127.0.0.1:5500/frontend/
```

### 4. Test the App

1. Upload a PDF resume OR paste resume text in the Paste tab
2. Paste a job description
3. Click **Analyze Resume** (or press Ctrl+Enter)
4. Watch the AI animation → Get results in ~3 seconds

---

## 🧠 GAS Backend Setup (Google Sheets + Email)

### Step 1: Create Google Apps Script Project

```
1. Go to: https://script.google.com
2. Click "New Project"
3. Rename it to "NeuralHire Backend"
```

### Step 2: Upload Files

**Option A: Manual Copy-Paste**
```
1. In Apps Script editor, create two files:
   - Code.gs  → paste contents of backend/Code.gs
   - helpers.gs → paste contents of backend/helpers.gs
2. Save (Ctrl+S)
```

**Option B: Using CLASP (recommended)**
```bash
# From project root:
clasp login
clasp create --type webapp --title "NeuralHire Backend" --rootDir ./backend

# Push files
cd backend
clasp push
```

### Step 3: Initial Setup

```
1. In Apps Script editor, select function: setupSpreadsheet
2. Click ▶ Run
3. Grant permissions when prompted
4. This creates the formatted spreadsheet
```

### Step 4: Deploy as Web App

```
1. Click Deploy → New Deployment
2. Type: Web App
3. Settings:
   - Execute as: Me
   - Who has access: Anyone
4. Click Deploy
5. Copy the Web App URL
```

> The current live deployment URL is:
> `https://script.google.com/macros/s/AKfycbzmSLcWTcafeTRRw0Xct_-2dxppKMX8ci-mIWbOyNRsnLXh94MS-xuKnN3Mt79slgSy/exec`

### Step 5: Connect Frontend to GAS

```javascript
// In frontend/script.js, update:
const CONFIG = {
  GAS_WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbzmSLcWTcafeTRRw0Xct_-2dxppKMX8ci-mIWbOyNRsnLXh94MS-xuKnN3Mt79slgSy/exec',
  // ...
};
```

### Step 6: Test End-to-End

```
1. Run analysis in the frontend
2. Check Google Sheets — row should appear automatically
3. Check Gmail — if score > 80, you'll get an alert email
```

---

## 📊 Features Overview

| Feature | Frontend | GAS Backend |
|---------|----------|-------------|
| Resume Upload (PDF/DOCX/TXT) | ✅ | — |
| Drag & Drop with animation | ✅ | — |
| Paste resume text | ✅ | — |
| Groq LLaMA 3.3 70B analysis | ✅ | ✅ |
| AI robot processing animation | ✅ | — |
| Floating keywords animation | ✅ | — |
| Progress bar with stages | ✅ | — |
| Animated match score circle | ✅ | — |
| Missing skills tags | ✅ | — |
| AI summary | ✅ | — |
| Debug log panel | ✅ | — |
| Google Sheets storage | via GAS | ✅ |
| Email alert (score > 80) | — | ✅ |
| Weekly summary email | — | ✅ |
| Color-coded rows in Sheets | — | ✅ |
| CSV export | — | ✅ |

---

## 🎨 Design System

```
Colors:
  Primary:    #a78bfa  (violet)
  Accent:     #38bdf8  (sky blue)
  Fuchsia:    #e879f9  (magenta)
  Success:    #4ade80  (green)
  Warning:    #fbbf24  (amber)
  Danger:     #f87171  (red)
  Background: #02020a  (near-black)

Fonts:
  Display:  Syncopate (Google Fonts)
  Body:     DM Sans
  Mono:     JetBrains Mono

Score Color Coding:
  80-100%  → Green  → "STRONG FIT"
  50-79%   → Yellow → "PARTIAL FIT"
  0-49%    → Red    → "WEAK FIT"
```

---

## 🔧 Configuration Options

```javascript
// frontend/script.js
const CONFIG = {
  GROQ_API_KEY: '...',       // Your Groq key
  GROQ_MODEL: 'llama-3.3-70b-versatile',  // or 'mixtral-8x7b-32768'
  GAS_WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbzmSLcWTcafeTRRw0Xct_-2dxppKMX8ci-mIWbOyNRsnLXh94MS-xuKnN3Mt79slgSy/exec',
  MAX_RETRIES: 3,            // API retry attempts
};
```

```javascript
// backend/Code.gs
var CONFIG = {
  SHEET_NAME: 'Recruitment_Results',
  ALERT_THRESHOLD: 80,       // Min score to trigger email
  NOTIFY_EMAIL: '...',       // Alert recipient email
};
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| PDF not extracting text | Use "Paste Text" tab instead; scanned PDFs aren't supported |
| CORS error in browser | Groq API supports browser calls — check API key |
| GAS 403 error | Redeploy as new version; check "Anyone" access |
| JSON parse error | Usually a malformed AI response; increases retry count |
| Email not sending | Check GmailApp permissions in GAS |
| No text extracted from DOCX | Use online converter to TXT first, or paste text |

---

## 🌟 5 Ways to Level This Up

### 1. 🔐 Secure Backend Proxy (Startup-Level)
Move the Groq API key to GAS as the sole caller. Frontend → GAS → Groq.
This hides your API key from client-side code.

### 2. 🏆 Candidate Ranking Dashboard (Internship-Level)
Build a `/dashboard` page that reads from Google Sheets via GAS API, sorts
candidates by score, and shows a ranked leaderboard with filters.

### 3. 📎 Multi-Resume Batch Mode (Product Feature)
Allow uploading 10+ resumes at once against one JD, with a bulk progress view
and comparison table sorted by match score.

### 4. 💬 AI Interview Question Generator
After scoring, add a "Generate Interview Questions" button. Ask Groq to output
5 targeted questions based on the candidate's gaps and strengths.

### 5. 🗓️ Google Calendar Integration (Automation)
For score >= 80, auto-create a Google Calendar interview event with the
candidate name, score, and recruiter details using `CalendarApp.createEvent()`.

---

## 📦 Supported File Types

| Format | Method | Notes |
|--------|--------|-------|
| `.pdf` | PDF.js (client-side) | Text-based PDFs only |
| `.txt` | FileReader API | Full support |
| `.docx` | Raw text extraction | Basic; complex formatting may fail |
| `.doc` | Raw text extraction | Limited support |
| Pasted text | Textarea | Best option for reliability |

---

## 🤖 AI Prompt Design

The system prompt enforces strict JSON output:

```
You are an expert HR recruiter. Respond ONLY with valid JSON:
{
  "candidate_name": "...",
  "match_score": 0-100,
  "missing_skills": ["skill1", ...],
  "summary": "2-3 sentences"
}
```

Uses `response_format: { type: "json_object" }` for guaranteed JSON output.
Temperature set to 0.2 for consistent, structured responses.

---

## ⚡ Performance Notes

- Groq LLaMA 3.3 70B: ~1-3 second inference time
- PDF.js extraction: ~1-2 seconds for multi-page PDFs
- Total time from click to results: ~3-6 seconds
- No page refreshes — fully SPA (Single Page Application)

---

## 📝 License

MIT License — Free to use, modify, and deploy.
Built by Piyush Pandey | Powered by Groq + Google Apps Script.
