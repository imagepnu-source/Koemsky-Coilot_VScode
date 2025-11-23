import re
from collections import defaultdict

with open(r'c:\Users\Administrator\Desktop\K1\public\PS_B_001-100_difficulty_v1.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Number X: 패턴이 있는 라인 찾기
activities = []
for line_num, line in enumerate(lines, 1):
    match = re.match(r'^Number\s+(\d+):\s*(.+)', line)
    if match:
        num = match.group(1)
        full_title = match.group(2).strip()
        # 제목에서 나이 부분 제거
        title = re.sub(r'\s*\([0-9.–—\-\s개월]+\)\s*$', '', full_title).strip()
        activities.append({
            'line': line_num,
            'number': num,
            'title': title,
            'full_title': full_title
        })

print(f'총 {len(activities)}개의 Number 항목 발견\n')

# 제목별로 그룹화
title_groups = defaultdict(list)
for act in activities:
    title_groups[act['title'].lower()].append(act)

# 중복된 제목만 출력
duplicates_found = False
duplicate_count = 0
for title, items in sorted(title_groups.items()):
    if len(items) > 1:
        duplicates_found = True
        duplicate_count += len(items) - 1
        print(f'중복 제목: "{items[0]["title"]}"')
        for item in items:
            print(f'  - Line {item["line"]}: Number {item["number"]}: {item["full_title"]}')
        print()

if not duplicates_found:
    print('중복된 제목이 없습니다.')
else:
    print(f'\n총 {duplicate_count}개의 중복 항목이 발견되었습니다.')
