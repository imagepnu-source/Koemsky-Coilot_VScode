// Test parser for Number 51
const fs = require('fs');

// Read the file
const content = fs.readFileSync('./public/details_problem-solving.txt', 'utf8');

// Normalize line endings
const normalizedData = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

// Find Number 51
const activityNumber = 51;
const numberPattern = /^Number (\d+):\s/gm;
const matches = [...normalizedData.matchAll(numberPattern)];

console.log(`Found ${matches.length} activity sections`);

// Find Number 51
const targetMatch = matches.find((match) => Number.parseInt(match[1]) === activityNumber);
if (!targetMatch) {
  console.log(`No matching activity found for number ${activityNumber}`);
  process.exit(1);
}

// Get activity text
const startIndex = targetMatch.index;
const nextMatch = matches.find((match) => Number.parseInt(match[1]) > activityNumber);
const endIndex = nextMatch ? nextMatch.index : normalizedData.length;

const activityText = normalizedData.substring(startIndex, endIndex).trim();
const lines = activityText.split("\n").filter((line) => line.trim());

console.log(`\nActivity ${activityNumber} has ${lines.length} lines`);
console.log('\nFirst 15 lines:');
lines.slice(0, 15).forEach((line, idx) => {
  console.log(`${idx}: [${line}]`);
});

// Test subtitle regex
console.log('\n\nTesting subtitle matches:');
lines.slice(0, 15).forEach((line, idx) => {
  const trimmedLine = line.trim();
  const subtitleMatch = trimmedLine.match(/^(.+?):\s*(.*)$/);
  if (subtitleMatch) {
    console.log(`Line ${idx}: title="${subtitleMatch[1]}", content="${subtitleMatch[2]}"`);
  }
});
