"""
PS_B_001-100_difficulty_v2.txt 파일에서 활동 재배치
- Number 64 (33.5-45개월): Number 60 다음으로
- Number 80 (46.5-48개월): Number 78 다음으로  
- Number 120 (11-14.5개월): Number 10 다음으로
"""

import re

# 파일 읽기
with open('public/PS_B_001-100_difficulty_v2.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# 구분자로 분리
activities = content.split('---\n')

# 각 활동을 딕셔너리로 저장
activity_dict = {}
for activity in activities:
    if activity.strip():
        # Number 추출
        match = re.search(r'^Number (\d+):', activity, re.MULTILINE)
        if match:
            num = int(match.group(1))
            activity_dict[num] = activity

print(f"총 {len(activity_dict)}개 활동 발견")

# Number 64, 80, 120 추출
act_64 = activity_dict.pop(64)
act_80 = activity_dict.pop(80)
act_120 = activity_dict.pop(120)

print("재배치할 활동:")
print("- Number 64 (33.5-45개월)")
print("- Number 80 (46.5-48개월)")
print("- Number 120 (11-14.5개월)")

# 새 순서로 재배치
new_order = []

for i in range(1, 121):
    if i == 11:
        # Number 10 다음에 Number 120 삽입
        if 10 in activity_dict:
            new_order.append(activity_dict[10])
        new_order.append(act_120)
    elif i == 61:
        # Number 60 다음에 Number 64 삽입
        if 60 in activity_dict:
            new_order.append(activity_dict[60])
        new_order.append(act_64)
    elif i == 79:
        # Number 78 다음에 Number 80 삽입
        if 78 in activity_dict:
            new_order.append(activity_dict[78])
        new_order.append(act_80)
    elif i in activity_dict:
        new_order.append(activity_dict[i])

print(f"\n새 순서로 {len(new_order)}개 활동 배치 완료")

# Number 재부여
final_content = []
for idx, activity in enumerate(new_order, 1):
    # 기존 Number를 새 Number로 교체
    activity_modified = re.sub(
        r'^Number \d+:',
        f'Number {idx}:',
        activity,
        count=1,
        flags=re.MULTILINE
    )
    final_content.append(activity_modified)

# 파일 쓰기
output = '---\n'.join(final_content)

with open('public/PS_B_001-100_difficulty_v2.txt', 'w', encoding='utf-8') as f:
    f.write(output)

print("\n✅ 재배치 완료!")
print("\n새 순서:")
print("- Number 11: 열쇠로 장난감 잠금 해제하기 (11-14.5개월)")
print("- Number 61: 하루 일과 시계 그림 붙이기 (33.5-45개월)")
print("- Number 79: 그림 속 문제 찾기 (46.5-48개월)")
