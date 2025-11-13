const fs = require('fs');
const path = require('path');

const files = [
  'details_gross-motor.txt',
  'details_fine-motor.txt',
  'details_self-care.txt',
  'details_problem-solving.txt',
  'details_social-emotion.txt',
  'details_receptive-language.txt',
  'details_expressive-language.txt'
];

files.forEach(filename => {
  const filePath = path.join(__dirname, filename);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // 1. 시간 형식 변경: "준비 시간/놀이 시간: X분 / Y-Z분" -> "준비 시간: 약 X분\n놀이 시간: 약 Y–Z분"
    const timePattern = /준비 시간\/놀이 시간:\s*(\d+)분\s*\/\s*(\d+)-(\d+)분/g;
    if (timePattern.test(content)) {
      content = content.replace(
        /준비 시간\/놀이 시간:\s*(\d+)분\s*\/\s*(\d+)-(\d+)분/g,
        (match, prep, min, max) => {
          modified = true;
          return `준비 시간: 약 ${prep}분\n놀이 시간: 약 ${min}–${max}분`;
        }
      );
    }
    
    // 2. 소제목 뒤에 콜론 추가 (이미 콜론이 없는 경우)
    const subtitles = [
      '놀이 목표',
      '준비물',
      '준비 시간',
      '놀이 시간',
      '놀이 방법',
      '난이도 조절',
      '안전 및 주의사항',
      '안전 주의',
      '발달 체크포인트',
      '발달 자극 요소',
      '추가 팁',
      '확장 활동'
    ];
    
    subtitles.forEach(subtitle => {
      // "소제목\n" 패턴을 "소제목:\n"으로 변경 (이미 콜론이 없는 경우만)
      const pattern = new RegExp(`^${subtitle}\\s*$`, 'gm');
      if (pattern.test(content)) {
        content = content.replace(
          new RegExp(`^${subtitle}\\s*$`, 'gm'),
          `${subtitle}:`
        );
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ ${filename} 수정 완료`);
    } else {
      console.log(`○ ${filename} 변경사항 없음`);
    }
    
  } catch (err) {
    console.log(`✗ ${filename} 오류: ${err.message}`);
  }
});

console.log('\n모든 파일 처리 완료!');
