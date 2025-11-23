// make_play_data_txt.js (Node.js용, app과 무관)
const fs = require('fs');
const path = require('path');

const categories = [
  { korean: "대 근육", english: "gross-motor" },
  { korean: "소 근육", english: "fine-motor" },
  { korean: "스스로", english: "self-care" },
  { korean: "문제 해결", english: "problem-solving" },
  { korean: "사회 정서", english: "social-emotion" },
  { korean: "수용 언어", english: "receptive-language" },
  { korean: "표현 언어", english: "expressive-language" },
];

let output = '';

for (const cat of categories) {
  const file = path.join(__dirname, 'public', `details_${cat.english}.txt`);
  if (!fs.existsSync(file)) continue;
  const lines = fs.readFileSync(file, 'utf-8').split('\n');
  output += `\n${cat.korean}, ${cat.english}\nNumber\tKorean Title\tAge Range\n`;
  let number = 0;
  for (const line of lines) {
    const match = line.match(/^Number (\d+):\s*(.+)\(([^)]+)\)/);
    if (match) {
      number = parseInt(match[1], 10);
      const title = match[2].trim();
      const ageRange = match[3].replace('개월', '').replace('–', '-').replace('~', '-').replace(' ', '');
      output += `${number}\t${title}\t${ageRange}\n`;
    }
  }
}

fs.writeFileSync(path.join(__dirname, 'public', 'play_data.txt'), output.trim(), 'utf-8');
console.log('✅ play_data.txt 생성 완료');
