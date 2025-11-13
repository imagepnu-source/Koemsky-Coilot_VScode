const fs = require('fs');

// FM 002.txt에서 제목 추출
const fm002Content = fs.readFileSync('FM 002.txt', 'utf-8');
const fm002Lines = fm002Content.split('\n').map(line => line.replace(/\r$/, ''));

const fineMotorTitles = [];

for (const line of fm002Lines) {
  // "Number X: title (a–b개월)" 형식 찾기
  const match = line.match(/^Number (\d+):\s*(.+?)\s*\((\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s*개월\)\s*$/);
  
  if (match) {
    const number = parseInt(match[1]);
    const title = match[2];
    const minAge = parseFloat(match[3]);
    const maxAge = parseFloat(match[4]);
    
    fineMotorTitles.push({
      number,
      title,
      minAge,
      maxAge
    });
  }
}

console.log(`FM 002.txt에서 ${fineMotorTitles.length}개 제목 추출 완료`);

// play_data_extracted.txt 읽기
const extractedContent = fs.readFileSync('play_data_extracted.txt', 'utf-8');
const extractedLines = extractedContent.split('\n').map(line => line.replace(/\r$/, ''));

// fine-motor 섹션 찾기 및 교체
const newLines = [];
let inFineMotorSection = false;
let fineMotorHeaderFound = false;
let fineMotorDataStarted = false;

for (let i = 0; i < extractedLines.length; i++) {
  const line = extractedLines[i];
  
  // fine-motor 섹션 시작 확인
  if (line.includes('소근육, fine-motor')) {
    inFineMotorSection = true;
    fineMotorHeaderFound = false;
    fineMotorDataStarted = false;
    newLines.push(line);
    continue;
  }
  
  // 다른 섹션 시작하면 fine-motor 섹션 종료
  if (inFineMotorSection && line.match(/^[가-힣]+, [a-z-]+$/)) {
    inFineMotorSection = false;
  }
  
  if (inFineMotorSection) {
    // 헤더 라인 (Number\tKorean Title\tAge Range)
    if (line.includes('Number\tKorean Title\tAge Range')) {
      newLines.push(line);
      fineMotorHeaderFound = true;
      fineMotorDataStarted = true;
      
      // 117개 놀이 제목 삽입
      for (const play of fineMotorTitles) {
        const ageRange = `${Math.floor(play.minAge)}-${Math.floor(play.maxAge)}`;
        newLines.push(`${play.number}\t${play.title}\t${ageRange}`);
      }
      
      console.log(`${fineMotorTitles.length}개 놀이 제목 삽입 완료`);
      continue;
    }
    
    // 기존 데이터 라인은 건너뛰기 (이미 새 데이터를 삽입했으므로)
    if (fineMotorDataStarted && line.match(/^\d+\t/)) {
      continue;
    }
    
    newLines.push(line);
  } else {
    newLines.push(line);
  }
}

// 파일 쓰기
fs.writeFileSync('play_data_extracted.txt', newLines.join('\r\n'), 'utf-8');
console.log('play_data_extracted.txt 업데이트 완료');
