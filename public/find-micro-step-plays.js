const fs = require('fs');

const content = fs.readFileSync('FM 001.txt', 'utf-8');
const lines = content.split('\n').map(line => line.replace(/\r$/, ''));

const playsWithMicroStep = [];
let currentTitle = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Number 제목 찾기
  if (line.match(/^Number \d+:/)) {
    currentTitle = line;
  }
  
  // "놀이 난이도 조절 (micro-step):" 찾기
  if (line.match(/^놀이 난이도 조절 \(micro-step\):/)) {
    if (currentTitle) {
      playsWithMicroStep.push(currentTitle);
      currentTitle = null; // 중복 방지
    }
  }
}

console.log(`"놀이 난이도 조절 (micro-step):" 소제목이 있는 놀이: ${playsWithMicroStep.length}개\n`);
playsWithMicroStep.forEach((title, index) => {
  console.log(`${index + 1}. ${title}`);
});
