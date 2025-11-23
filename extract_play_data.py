"""
details 파일들에서 놀이 데이터를 추출하여 play_data_extracted.json 생성
"""

import os
import re
import json

def extract_age_range(title_line):
    """제목에서 연령 범위 추출"""
    # 공백 있을 수도 있음: (0.5-4 개월) 또는 (0.5-4개월)
    # 제목 끝부분에서만 찾기 (다른 괄호와 구분)
    match = re.search(r'\((\d+\.?\d*)[–-](\d+\.?\d*)\s*개월\)\s*$', title_line)
    if match:
        start = float(match.group(1))
        end = float(match.group(2))
        return [start, end]
    return None

def parse_details_file(filepath):
    """details 파일 파싱"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # --- 로 구분하거나, Number로 구분
    if '---\n' in content:
        activities = content.split('---\n')
    else:
        # Number X: 패턴으로 분리
        activities = re.split(r'(?=Number \d+:)', content)
    
    results = []
    
    for activity in activities:
        if not activity.strip():
            continue
            
        lines = activity.strip().split('\n')
        if not lines:
            continue
        
        # 첫 줄에서 Number와 제목 추출
        first_line = lines[0]
        number_match = re.match(r'Number (\d+):\s*(.+)', first_line)
        
        if not number_match:
            continue
        
        number = int(number_match.group(1))
        title = number_match.group(2).strip()
        
        # 연령 범위 추출 (제목 또는 난이도 조절 줄에서)
        age_range = extract_age_range(title)
        if not age_range:
            # 난이도 조절: (X-Y개월) 형식에서 추출 시도
            for line in lines:
                if line.startswith('난이도 조절:'):
                    age_range = extract_age_range(line)
                    break
        
        if not age_range:
            continue
        
        # 제목에서 연령 범위 제거 (소수점 포함 가능)
        title_clean = re.sub(r'\s*\(\d+\.?\d*[–-]\d+\.?\d*\s*개월\)\s*$', '', title).strip()
        
        # 준비 시간과 놀이 시간 추출
        prep_time = None
        play_time = None
        
        for line in lines[1:10]:  # 상위 몇 줄에서 찾기
            if line.startswith('준비 시간:') or line.startswith('준비시간:'):
                prep_match = re.search(r'약?\s*(\d+)', line)
                if prep_match:
                    prep_time = int(prep_match.group(1))
            
            if line.startswith('놀이 시간:') or line.startswith('놀이시간:'):
                play_match = re.search(r'약?\s*(\d+)[~–-]?(\d+)?', line)
                if play_match:
                    play_time = [int(play_match.group(1))]
                    if play_match.group(2):
                        play_time.append(int(play_match.group(2)))
        
        # 카테고리는 파일명에서 추출
        category = os.path.basename(filepath).replace('details_', '').replace('.txt', '')
        
        results.append({
            "id": f"{category}_{number}",
            "number": number,
            "title": title_clean,
            "category": category,
            "ageRange": age_range,
            "prepTime": prep_time,
            "playTime": play_time
        })
    
    return results

def main():
    public_dir = 'public'
    
    # details 파일들 찾기
    details_files = [
        'details_expressive-language.txt',
        'details_fine-motor.txt',
        'details_gross-motor.txt',
        'details_problem-solving.txt',
        'details_receptive-language.txt',
        'details_self-care.txt',
        'details_social-emotion.txt'
    ]
    
    all_activities = []
    
    for filename in details_files:
        filepath = os.path.join(public_dir, filename)
        if os.path.exists(filepath):
            print(f"처리 중: {filename}")
            activities = parse_details_file(filepath)
            all_activities.extend(activities)
            print(f"  추출: {len(activities)}개 활동")
    
    # 연령 범위로 정렬
    all_activities.sort(key=lambda x: (x['ageRange'][0], x['ageRange'][1]))
    
    # JSON 파일로 저장
    output_path = os.path.join(public_dir, 'play_data_extracted.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_activities, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 완료!")
    print(f"총 {len(all_activities)}개 활동 추출")
    print(f"저장 위치: {output_path}")
    
    # 카테고리별 통계
    category_counts = {}
    for activity in all_activities:
        cat = activity['category']
        category_counts[cat] = category_counts.get(cat, 0) + 1
    
    print("\n📊 카테고리별 활동 수:")
    for cat, count in sorted(category_counts.items()):
        print(f"  {cat}: {count}개")

if __name__ == '__main__':
    main()
