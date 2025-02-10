const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Google Sheets setup
const auth = new google.auth.GoogleAuth({
  keyFile: 'your-credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = '1QV3SEu5BssvTLps-Sb8i5a54Wos5wpLasYO9-5TweEo';

// Submit score endpoint
app.post('/api/submit-score', async (req, res) => {
  try {
    const { firstName, lastName, company, email, displayName, score } = req.body;
    
    // Validate input
    if (!firstName || !lastName || !company || !email || score === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    // Add to Google Sheets
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:G',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[
          firstName,
          lastName,
          company,
          email,
          displayName || '', // Display name moved before score
          score,
          new Date().toISOString()
        ]]
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save score. Please try again.' 
    });
  }
});

// Get leaderboard endpoint
app.get('/api/leaderboard', async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:F',
    });

    const rows = response.data.values || [];
    
    // Skip header row if it exists and get top 10 scores
    const startIndex = rows[0]?.[0] === 'firstName' ? 1 : 0;
    const leaderboard = rows.slice(startIndex)
      .map(row => ({
        firstName: row[0],
        lastName: row[1],
        company: row[2],
        displayName: row[4] || '', // Changed index to match new column order
        score: parseInt(row[5]) || 0  // Changed index to match new column order
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    res.json({ success: true, leaderboard });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch leaderboard' 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});