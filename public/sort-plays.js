const fs = require('fs');

// FM 001.txt 읽기
const content = fs.readFileSync('FM 001.txt', 'utf-8');
const lines = content.split('\n').map(line => line.replace(/\r$/, ''));

// 놀이 파싱
const plays = [];
let currentPlay = null;
let collectingAge = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
  
  // 놀이 제목 패턴 1: "Number X: title (a–b개월)" (한 줄)
  const matchOneLine = line.match(/^Number (\d+):\s*(.+?)\s*\((\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s*개월\)\s*$/);
  
  // 놀이 제목 패턴 2: "Number X: title" (다음 줄에 연령)
  const matchTitle = line.match(/^Number (\d+):\s*(.+?)\s*$/);
  const matchAge = nextLine.match(/^\s*\((\d+(?:\.\d+)?)\s*[–-]?\s*(\d+(?:\.\d+)?)?개월\)\s*$/);
  
  if (collectingAge && matchAge) {
    // 이전 줄이 제목, 현재 줄이 연령
    collectingAge = false;
    currentPlay.minAge = parseFloat(matchAge[1]);
    currentPlay.maxAge = matchAge[2] ? parseFloat(matchAge[2]) : parseFloat(matchAge[1]);
    currentPlay.lines.push(line);
    continue;
  }
  
  if (matchOneLine) {
    // 한 줄 패턴
    if (currentPlay) {
      plays.push(currentPlay);
    }
    
    currentPlay = {
      prefix: 'Number',
      number: parseInt(matchOneLine[1]),
      title: matchOneLine[2],
      minAge: parseFloat(matchOneLine[3]),
      maxAge: parseFloat(matchOneLine[4]),
      lines: [line]
    };
    collectingAge = false;
    
    if (plays.length < 5 || plays.length === 19 || plays.length === 20) {
      console.log(`${plays.length + 1}번째 놀이 파싱 (한 줄): Number ${matchOneLine[1]} - ${matchOneLine[3]}–${matchOneLine[4]}개월`);
    }
  } else if (matchTitle && !collectingAge) {
    // 두 줄 패턴 시작
    if (currentPlay) {
      plays.push(currentPlay);
    }
    
    currentPlay = {
      prefix: 'Number',
      number: parseInt(matchTitle[1]),
      title: matchTitle[2],
      minAge: 0, // 다음 줄에서 설정
      maxAge: 0,
      lines: [line]
    };
    collectingAge = true;
  } else if (currentPlay) {
    currentPlay.lines.push(line);
  }
}

// 마지막 놀이 추가
if (currentPlay) {
  plays.push(currentPlay);
}

console.log(`파싱된 놀이 수: ${plays.length}`);

// minAge가 0인 놀이 확인
const zeroAgePlays = plays.filter(p => p.minAge === 0 || p.maxAge === 0);
if (zeroAgePlays.length > 0) {
  console.log(`\n경고: minAge 또는 maxAge가 0인 놀이 ${zeroAgePlays.length}개 발견:`);
  zeroAgePlays.forEach(p => {
    console.log(`  - Number ${p.number}: ${p.title} (${p.minAge}–${p.maxAge}개월)`);
  });
}

// 정렬: minAge 증가, 그다음 maxAge 증가
plays.sort((a, b) => {
  if (a.minAge !== b.minAge) {
    return a.minAge - b.minAge;
  }
  return a.maxAge - b.maxAge;
});

// 재번호 및 출력 준비
const outputLines = [];

for (let i = 0; i < plays.length; i++) {
  const play = plays[i];
  const newNumber = i + 1;
  
  // 첫 줄 업데이트 - Number로 통일하고 1부터 순차 번호 부여
  const firstLine = play.lines[0];
  const updatedFirstLine = firstLine.replace(/^Number \d+:/, `Number ${newNumber}:`);
  outputLines.push(updatedFirstLine);
  
  // 나머지 줄 추가
  for (let j = 1; j < play.lines.length; j++) {
    outputLines.push(play.lines[j]);
  }
}

// FM 002.txt 생성
fs.writeFileSync('FM 002.txt', outputLines.join('\r\n'), 'utf-8');
console.log(`FM 002.txt 생성 완료 (${plays.length}개 놀이, ${outputLines.length}줄)`);
console.log(`첫 놀이: ${plays[0].prefix} (${plays[0].minAge}–${plays[0].maxAge}개월)`);
console.log(`마지막 놀이: ${plays[plays.length-1].prefix} (${plays[plays.length-1].minAge}–${plays[plays.length-1].maxAge}개월)`);
