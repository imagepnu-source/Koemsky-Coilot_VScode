import re

# Read file
filepath = r"c:\Users\Administrator\OneDrive\Komensky TXT\PS_B_001-100_difficulty_v1.txt"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract difficulty ages for Numbers 2-47
difficulty_ages = {}
pattern = r'Number (\d+):.*?난이도 조절: \(([^)]+)\)'
matches = re.findall(pattern, content, re.DOTALL)
for num, age in matches:
    num = int(num)
    if 2 <= num <= 47:
        difficulty_ages[num] = age

print(f"Found {len(difficulty_ages)} difficulty ages")

# Update each title with the corresponding difficulty age
for num, new_age in sorted(difficulty_ages.items()):
    # Find the title line for this number
    title_pattern = rf'(Number {num}: [^(]+)\([^)]+개월\)'
    match = re.search(title_pattern, content)
    if match:
        old_title = match.group(0)
        new_title = f"{match.group(1)}({new_age})"
        content = content.replace(old_title, new_title, 1)
        print(f"Number {num}: Updated to ({new_age})")
    else:
        print(f"Number {num}: NOT FOUND")

# Write back
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nUpdate complete!")
