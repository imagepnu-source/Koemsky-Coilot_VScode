import re

file_path = r"c:\Users\Administrator\Desktop\K1\public\details_problem-solving.txt"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Split by "---" or longer separators
# Find all separators and normalize them
separator_pattern = r'^-{3,}$'
lines = content.split('\n')

# Identify separator positions and normalize to "---"
normalized_lines = []
for line in lines:
    if re.match(separator_pattern, line.strip()):
        normalized_lines.append('---')
    else:
        normalized_lines.append(line)

content = '\n'.join(normalized_lines)

# Step 2: Split content into activities
# Each activity starts with "Number" and ends with "---" (or end of file)
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

print(f"발견된 놀이 개수: {len(activities)}")

# Step 3: Extract age values and sort
def extract_age_range(activity_text):
    """Extract age range from title like 'Number X: Title (a–b개월)' or '(a.5–b.5개월)'"""
    first_line = activity_text.split('\n')[0]
    # Pattern for age range: (숫자–숫자개월) or (숫자.숫자–숫자.숫자개월)
    # Try multiple dash types: – (en dash), — (em dash), - (hyphen)
    match = re.search(r'\((\d+(?:\.\d+)?)\s*[–—\-]\s*(\d+(?:\.\d+)?)\s*개월\)', first_line)
    if match:
        start_age = float(match.group(1))
        end_age = float(match.group(2))
        return start_age, end_age
    return 999, 999  # Default for items without age

# Sort activities by start age, then end age
activities_with_age = []
for activity in activities:
    start, end = extract_age_range(activity)
    activities_with_age.append((start, end, activity))

activities_with_age.sort(key=lambda x: (x[0], x[1]))

print(f"\n정렬 순서 (처음 10개):")
for i, (start, end, activity) in enumerate(activities_with_age[:10], 1):
    title = activity.split('\n')[0]
    print(f"  {i}. {title} -> ({start}–{end}개월)")

# Step 4: Renumber activities
renumbered_activities = []
for i, (start, end, activity) in enumerate(activities_with_age, 1):
    lines = activity.split('\n')
    # Replace the number in first line
    first_line = lines[0]
    # Pattern: "Number X: Title"
    new_first_line = re.sub(r'^Number \d+:', f'Number {i}:', first_line)
    lines[0] = new_first_line
    renumbered_activities.append('\n'.join(lines))

# Step 5: Join with "---" separator
final_content = '\n---\n'.join(renumbered_activities)

# Save the result
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(final_content)

print(f"\n✓ 작업 완료!")
print(f"  - 총 {len(renumbered_activities)}개 놀이 정렬 및 번호 재지정")
print(f"  - 모든 구분선이 '---'로 통일됨")
