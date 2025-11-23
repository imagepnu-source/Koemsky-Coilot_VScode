import re

with open(r'c:\Users\Administrator\Desktop\K1\public\play_data_extracted.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print('=== 모든 섹션과 헤더 라인 위치 ===\n')
for i, line in enumerate(lines, 1):
    line_stripped = line.strip()
    if ',' in line_stripped and any(cat in line_stripped for cat in ['대근육', '소근육', '스스로', '문제', '사회', '수용', '표현']):
        print(f'Line {i}: [CATEGORY] {line_stripped}')
    elif 'Number' in line_stripped and 'Korean Title' in line_stripped and 'Age Range' in line_stripped:
        print(f'Line {i}: [HEADER] {line_stripped}')

print('\n=== NaN이 발생할 수 있는 데이터 (Age Range가 숫자 형식이 아닌 것) ===\n')
for i, line in enumerate(lines, 1):
    line_stripped = line.strip()
    if not line_stripped:
        continue
    parts = line_stripped.split('\t')
    if len(parts) >= 3:
        number_str, title, age_range = parts[0], parts[1], parts[2]
        # 숫자가 아닌 Number 컬럼 또는 잘못된 Age Range 찾기
        if number_str == 'Number':  # 헤더
            continue
        try:
            num = int(number_str)
        except:
            print(f'Line {i}: Number 컬럼이 숫자가 아님: "{number_str}" | {line_stripped}')
            continue
        
        # Age Range 검증
        if age_range == 'Age Range':
            print(f'Line {i}: [HEADER LINE] Age Range가 헤더: {line_stripped}')
        elif '-' not in age_range:
            try:
                float(age_range)
            except:
                print(f'Line {i}: Age Range 형식 오류: "{age_range}" | {line_stripped}')
