const fs = require('fs');

const filePath = 'FM 000';
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n').map(line => line.replace(/\r$/, ''));

console.log('총 라인 수:', lines.length);

// 각 놀이를 파싱
const plays = [];
let currentPlay = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Number 또는 Fine Motor 라인 찾기
  const numberMatch = line.match(/^(Number|Fine Motor) (\d+):/);
  if (numberMatch) {
    // 이전 놀이 저장
    if (currentPlay) {
      plays.push(currentPlay);
    }
    
    // 새 놀이 시작
    currentPlay = {
      number: numberMatch[2],
      prefix: numberMatch[1],
      startLine: i,
      lines: [line]
    };
  } else if (currentPlay) {
    // 현재 놀이에 라인 추가
    currentPlay.lines.push(line);
  }
}

// 마지막 놀이 추가
if (currentPlay) {
  plays.push(currentPlay);
}

console.log(`총 ${plays.length}개 놀이 발견`);

// 중복 제거: prefix + number가 같거나 제목이 같으면 중복으로 간주
const uniquePlays = [];
const seen = new Set(); // "prefix-number" 형식으로 저장

for (let i = 0; i < plays.length; i++) {
  const current = plays[i];
  const key = `${current.prefix}-${current.number}`;
  
  if (!seen.has(key)) {
    uniquePlays.push(current);
    seen.add(key);
    const title = current.lines[0].replace(/^(Number|Fine Motor) \d+:\s*/, '');
    console.log(`  ${current.prefix} ${current.number}번 추가: ${title.substring(0, 30)}`);
  } else {
    const title = current.lines[0].replace(/^(Number|Fine Motor) \d+:\s*/, '');
    console.log(`  ⚠️  ${current.prefix} ${current.number}번 중복 제거: ${title.substring(0, 30)}`);
  }
}

console.log(`\n중복 제거 후: ${uniquePlays.length}개 놀이`);

// FM 001.txt로 저장
const output = [];
for (let i = 0; i < uniquePlays.length; i++) {
  const play = uniquePlays[i];
  
  // 모든 라인 추가
  for (let line of play.lines) {
    output.push(line);
  }
}

fs.writeFileSync('FM 001.txt', output.join('\n'), 'utf8');

console.log(`\n✓ FM 001.txt 생성 완료 (${uniquePlays.length}개 고유 놀이)`);
