// ============================================================
// NeuralHire — Code.gs
// Google Apps Script backend: Web App, Sheets storage, email alerts
// ============================================================

var CONFIG = {
  SHEET_NAME:      'Recruitment_Results',
  ALERT_THRESHOLD: 80,           // Score >= this triggers recruiter email
  NOTIFY_EMAIL:    Session.getActiveUser().getEmail(), // Change to a specific email if needed
  GROQ_API_KEY:    '',           // Optional: set here to call Groq from GAS instead of frontend
  GROQ_MODEL:      'llama-3.3-70b-versatile',
};

// ─── WEB APP ENTRY POINT ─────────────────────────────────────
// Handles GET requests — returns a simple status page
function doGet(e) {
  return HtmlService.createHtmlOutput(
    '<h2 style="font-family:sans-serif">NeuralHire Backend is live ✅</h2>' +
    '<p>POST requests from the frontend are being received.</p>'
  );
}

// Handles POST requests from the frontend
function doPost(e) {
  try {
    var raw = e.postData ? e.postData.contents : null;
    if (!raw) throw new Error('No POST data received');

    var data = JSON.parse(raw);
    Logger.log('Received: ' + JSON.stringify(data));

    // Validate required fields
    if (typeof data.match_score !== 'number') throw new Error('Invalid match_score');
    if (!data.candidate_name)                 data.candidate_name = 'Unknown Candidate';
    if (!data.missing_skills)                 data.missing_skills = '';
    if (!data.summary)                        data.summary = '';

    // Save to Sheets
    var rowId = appendToSheet(data);

    // Send alert if score is high enough
    var alerted = false;
    if (data.match_score >= CONFIG.ALERT_THRESHOLD) {
      sendRecruiterAlert(data);
      alerted = true;
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, row: rowId, alerted: alerted }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('doPost error: ' + err.message);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── GOOGLE SHEETS: APPEND ROW ───────────────────────────────
function appendToSheet(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  // Auto-create sheet with headers if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    setupHeaders(sheet);
  }

  var lastRow = sheet.getLastRow();
  var rowId = lastRow; // Row 1 is headers, so row 2 = ID 1
  var score = Math.max(0, Math.min(100, Math.round(data.match_score)));
  var label = getScoreLabel(score);
  var timestamp = formatTimestamp();

  var newRow = [
    rowId,                       // ID
    timestamp,                   // Timestamp
    data.candidate_name,         // Candidate Name
    score,                       // Match Score (%)
    data.missing_skills,         // Missing Skills
    data.summary,                // AI Summary
    label,                       // Status (STRONG FIT / etc.)
    score >= CONFIG.ALERT_THRESHOLD ? 'YES' : 'NO', // Alerted
  ];

  sheet.appendRow(newRow);

  // Color-code the row based on score
  var range = sheet.getRange(sheet.getLastRow(), 1, 1, newRow.length);
  if (score >= 80) {
    range.setBackground('#d9f7d9');      // green tint
  } else if (score >= 50) {
    range.setBackground('#fff8d6');      // yellow tint
  } else {
    range.setBackground('#fde8e8');      // red tint
  }

  Logger.log('Row saved: ID=' + rowId + ', Score=' + score);
  return rowId;
}

// ─── SHEET SETUP (run once manually) ─────────────────────────
function setupSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SHEET_NAME);
  setupHeaders(sheet);
  Logger.log('Sheet setup complete: ' + CONFIG.SHEET_NAME);
}

function setupHeaders(sheet) {
  var headers = ['ID', 'Timestamp', 'Candidate Name', 'Match Score (%)', 'Missing Skills', 'AI Summary', 'Status', 'Alerted'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1a1a2e');
  headerRange.setFontColor('#a78bfa');
  headerRange.setFontSize(11);

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(2, 180);  // Timestamp
  sheet.setColumnWidth(3, 160);  // Name
  sheet.setColumnWidth(5, 250);  // Missing Skills
  sheet.setColumnWidth(6, 400);  // Summary
}

// ─── EMAIL ALERT ─────────────────────────────────────────────
function sendRecruiterAlert(data) {
  var subject = '🟢 NeuralHire Alert: Strong Candidate — Score ' + data.match_score + '%';

  var body = [
    'NeuralHire — Strong Candidate Detected',
    '═══════════════════════════════════════',
    '',
    'CANDIDATE:   ' + data.candidate_name,
    'SCORE:       ' + data.match_score + '% (' + getScoreLabel(data.match_score) + ')',
    'TIMESTAMP:   ' + formatTimestamp(),
    '',
    'AI SUMMARY:',
    data.summary,
    '',
    'SKILL GAPS:',
    data.missing_skills || 'None identified',
    '',
    '═══════════════════════════════════════',
    'Sent automatically by NeuralHire',
    'Powered by Groq LLaMA 3.3 70B',
  ].join('\n');

  GmailApp.sendEmail(CONFIG.NOTIFY_EMAIL, subject, body);
  Logger.log('Alert sent to ' + CONFIG.NOTIFY_EMAIL + ' for: ' + data.candidate_name);
}

// ─── HELPERS ─────────────────────────────────────────────────
function getScoreLabel(score) {
  if (score >= 80) return 'STRONG FIT';
  if (score >= 50) return 'MODERATE FIT';
  return 'WEAK FIT';
}

function formatTimestamp() {
  return Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'MMM dd, yyyy HH:mm:ss z'
  );
}