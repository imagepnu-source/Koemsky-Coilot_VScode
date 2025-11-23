// 이 파일은 7개 details_*.txt에서 추출한 play activity list를 모두 합쳐서 출력합니다.
// 포맷: 카테고리명 (한글,영문)\n번호\t제목\t연령대

import { loadCategoryData } from "../lib/data-parser";

const categories = [
  { korean: "대 근육", english: "gross-motor" },
  { korean: "소 근육", english: "fine-motor" },
  { korean: "스스로", english: "self-care" },
  { korean: "문제 해결", english: "problem-solving" },
  { korean: "사회 정서", english: "social-emotion" },
  { korean: "수용 언어", english: "receptive-language" },
  { korean: "표현 언어", english: "expressive-language" },
];

(async () => {
  let output = "";
  for (const cat of categories) {
    const list = await loadCategoryData(cat.korean);
    output += `\n${cat.korean}, ${cat.english}\nNumber\tKorean Title\tAge Range\n`;
    for (const item of list) {
      output += `${item.number}\t${item.title}\t${item.ageRange}\n`;
    }
  }
  require("fs").writeFileSync("public/play_data_OUT.txt", output.trim(), "utf-8");
  console.log("✅ play_data_OUT.txt 생성 완료");
})();
