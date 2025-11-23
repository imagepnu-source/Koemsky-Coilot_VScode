import re

file_path = r"c:\Users\Administrator\Desktop\K1\public\PS_B_001-100_difficulty_v1.txt"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Remove all blank lines
lines = content.split('\n')
lines_no_blanks = [line for line in lines if line.strip() != '']

# Step 2: Normalize separators (any line with 3 or more dashes)
normalized_lines = []
for line in lines_no_blanks:
    if re.match(r'^-{3,}$', line.strip()):
        normalized_lines.append('---')
    else:
        normalized_lines.append(line)

# Step 3: Split into activities (Number X: ... until ---)
activities = []
current_activity = []
in_activity = False

for line in normalized_lines:
    if line.strip().startswith('Number '):
        # Start of new activity
        if current_activity:
            activities.append('\n'.join(current_activity))
        current_activity = [line]
        in_activity = True
    elif line.strip() == '---':
        # End of activity
        if current_activity:
            activities.append('\n'.join(current_activity))
            current_activity = []
        in_activity = False
    elif in_activity:
        current_activity.append(line)

# Add last activity if exists
if current_activity:
    activities.append('\n'.join(current_activity))

print(f"발견된 전체 놀이 개수: {len(activities)}")

# Step 4: Extract title and age range for each activity
def extract_info(activity_text):
    """Extract Number, Title, and age range"""
    first_line = activity_text.split('\n')[0]
    
    # Extract number: "Number X:"
    num_match = re.search(r'^Number (\d+):', first_line)
    orig_num = int(num_match.group(1)) if num_match else 999
    
    # Extract title and age
    title_match = re.search(r'^Number \d+: (.+?) \((\d+(?:\.\d+)?)\s*[–—\-]\s*(\d+(?:\.\d+)?)\s*개월\)', first_line)
    if title_match:
        title = title_match.group(1)
        start_age = float(title_match.group(2))
        end_age = float(title_match.group(3))
        return orig_num, title, start_age, end_age
    
    # If no age found
    return orig_num, first_line, 999, 999

# Step 5: Remove duplicates - keep only unique based on title and age
seen = {}
unique_activities = []

for activity in activities:
    orig_num, title, start, end = extract_info(activity)
    key = (title.strip(), start, end)
    
    if key not in seen:
        seen[key] = True
        unique_activities.append((start, end, orig_num, activity))
    else:
        print(f"중복 제거: Number {orig_num}: {title} ({start}–{end}개월)")

print(f"\n중복 제거 후: {len(unique_activities)}개")

# Step 6: Sort by age (start, then end, then original number)
unique_activities.sort(key=lambda x: (x[0], x[1], x[2]))

print(f"\n정렬 순서 (처음 20개):")
for i, (start, end, orig_num, activity) in enumerate(unique_activities[:20], 1):
    title_line = activity.split('\n')[0]
    print(f"  {i}. (원번호 {orig_num}) {title_line}")

# Step 7: Renumber from 1
renumbered_activities = []
for i, (start, end, orig_num, activity) in enumerate(unique_activities, 1):
    lines = activity.split('\n')
    # Replace the number in first line
    first_line = lines[0]
    new_first_line = re.sub(r'^Number \d+:', f'Number {i}:', first_line)
    lines[0] = new_first_line
    renumbered_activities.append('\n'.join(lines))

# Step 8: Join with separator
final_content = '\n---\n'.join(renumbered_activities)

# Save
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(final_content)

print(f"\n✅ 작업 완료!")
print(f"  - 원본: {len(activities)}개 놀이")
print(f"  - 중복 제거: {len(activities) - len(unique_activities)}개")
print(f"  - 최종: {len(unique_activities)}개 놀이")
print(f"  - 번호: 1번부터 {len(unique_activities)}번까지 재지정")
