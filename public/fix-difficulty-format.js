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
    
    // "난이도 조절: (연령)" 패턴을 "난이도 조절:\n(연령)"으로 변경
    const pattern = /^(난이도 조절:)\s*(\([0-9.]+–[0-9.]+개월\))$/gm;
    
    const newContent = content.replace(pattern, (match, prefix, ageRange) => {
      modified = true;
      return `${prefix}\n${ageRange}`;
    });
    
    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✓ ${filename} 수정 완료`);
    } else {
      console.log(`○ ${filename} 변경사항 없음`);
    }
    
  } catch (err) {
    console.log(`✗ ${filename} 오류: ${err.message}`);
  }
});

console.log('\n모든 파일 처리 완료!');
