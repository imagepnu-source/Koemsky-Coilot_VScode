'use client';
import React from 'react';

export default function DetailPreview() {
  return (
    <div data-ui="detail-container" className="border rounded-lg p-3">
      <h3 data-ui="detail-heading" className="mb-2">예시 놀이 제목</h3>
      <div data-ui="detail-subheading" className="mb-3">권장 연령: 6–10개월</div>
      <div data-ui="detail-body" className="space-y-2">
        <p>1) 준비물 확인</p>
        <p>2) 아이와 시작</p>
        <p>3) 단계 진행</p>
      </div>
      <div className="mt-3 grid gap-2">
        <div data-ui="detail-box">
          <div className="font-semibold mb-1">안전 주의</div>
          <ul className="list-disc pl-5"><li>질식 위험 주의</li><li>미끄럼 주의</li></ul>
        </div>
        <div data-ui="detail-box">
          <div className="font-semibold mb-1">확장 활동</div>
          <ul className="list-disc pl-5"><li>자연물 활용</li><li>소리 요소 추가</li></ul>
        </div>
      </div>
    </div>
  );
}
