import re
from collections import defaultdict

with open(r'c:\Users\Administrator\Desktop\K1\public\play_data.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

current_category = None
numbers_by_category = defaultdict(list)

for i, line in enumerate(lines, 1):
    line_stripped = line.strip()
    
    # 카테고리 라인 감지
    if ',' in line_stripped and any(cat in line_stripped for cat in ['대근육', '소근육', '스스로', '문제', '사회', '수용', '표현']):
        match = re.match(r'^(.+?),', line_stripped)
        if match:
            current_category = match.group(1).strip()
        continue
    
    # 헤더 라인 건너뛰기
    if 'Number' in line_stripped and 'Korean Title' in line_stripped:
        continue
    
    # 데이터 라인 파싱
    parts = line_stripped.split('\t')
    if len(parts) >= 3 and current_category:
        try:
            number = int(parts[0])
            numbers_by_category[current_category].append((number, i, line_stripped))
        except:
            pass

# 중복 찾기
print('=== 카테고리별 중복 Number ===\n')
total_duplicates = 0
for category, entries in numbers_by_category.items():
    number_count = {}
    for number, line_num, content in entries:
        if number not in number_count:
            number_count[number] = []
        number_count[number].append((line_num, content))
    
    duplicates = {num: lines for num, lines in number_count.items() if len(lines) > 1}
    
    if duplicates:
        print(f'[{category}] 중복 발견:')
        for num, lines in sorted(duplicates.items()):
            print(f'  Number {num}: {len(lines)}번 등장')
            total_duplicates += len(lines) - 1
            for line_num, content in lines:
                print(f'    Line {line_num}: {content[:100]}')
        print()

if total_duplicates == 0:
    print('중복이 없습니다!')
else:
    print(f'\n총 {total_duplicates}개의 중복 항목 발견')
