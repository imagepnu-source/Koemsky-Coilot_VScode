// lib/tts-dictionary.ts
// 단어 사전 조회 기능

export type WordDetail = {
  phonetic?: string;
  englishDefs: string[];
  koreanDefs: string[];
};

/**
 * Google Translate API를 사용하여 단어의 한국어 뜻을 조회
 * Free Dictionary API로 발음 기호 조회
 */
export async function lookupWordDetail(word: string): Promise<WordDetail> {
  const result: WordDetail = {
    englishDefs: [],
    koreanDefs: [],
  };

  const lower = word.toLowerCase();

  // 1. Google Translate Unofficial (GTX) for Rich Dictionary
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&dt=bd&q=${encodeURIComponent(
        lower,
      )}`,
    );
    if (res.ok) {
      const data = await res.json();

      if (data[1] && Array.isArray(data[1])) {
        const koDefs: string[] = [];
        for (const entry of data[1]) {
          const pos = entry[0];
          const terms = entry[1];
          if (pos && Array.isArray(terms) && terms.length > 0) {
            const joined = terms.slice(0, 4).join(", ");
            let posKo = pos;
            if (pos === "noun") posKo = "명사";
            else if (pos === "verb") posKo = "동사";
            else if (pos === "adjective") posKo = "형용사";
            else if (pos === "adverb") posKo = "부사";
            else if (pos === "preposition") posKo = "전치사";
            else if (pos === "conjunction") posKo = "접속사";
            else if (pos === "pronoun") posKo = "대명사";
            else if (pos === "interjection") posKo = "감탄사";

            koDefs.push(`[${posKo}] ${joined}`);
          }
        }
        result.koreanDefs = koDefs;
      } else if (data[0] && data[0][0] && data[0][0][0]) {
        result.koreanDefs = [data[0][0][0]];
      }
    }
  } catch {
    // ignore
  }

  // 2. English Dictionary (Free Dictionary API) for Phonetic
  if (!result.phonetic) {
    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
          lower,
        )}`,
      );
      if (res.ok) {
        const data: any = await res.json();
        const entry =
          Array.isArray(data) && data.length > 0 ? data[0] : undefined;
        if (entry) {
          const phonetic =
            entry.phonetic ||
            (Array.isArray(entry.phonetics)
              ? entry.phonetics.find((p: any) => p.text)?.text
              : undefined);
          if (phonetic) result.phonetic = phonetic;

          if (result.koreanDefs.length === 0 && Array.isArray(entry.meanings)) {
            const defs: string[] = [];
            for (const m of entry.meanings) {
              if (!m.definitions) continue;
              for (const d of m.definitions) {
                if (d.definition) defs.push(d.definition);
              }
            }
            result.englishDefs = defs.slice(0, 2);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return result;
}

/**
 * MyMemory API를 사용하여 영어를 한국어로 번역
 */
export async function translateToKorean(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";

  try {
    const query = encodeURIComponent(trimmed);
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${query}&langpair=en|ko`,
    );
    if (!res.ok) {
      console.warn("[TTS] translateToKorean: HTTP error", res.status);
      // 실패 시에는 영어 원문을 그대로 반환하지 않고,
      // 호출측에서 "번역 없음" 으로 처리할 수 있도록 빈 문자열 반환
      return "";
    }
    const data: any = await res.json();
    const translated = (data?.responseData?.translatedText as string | undefined)?.trim();
    if (translated) {
      // 번역 결과가 원문과 거의 동일(영어 그대로)인 경우에는
      // 실제 번역이 되지 않은 것으로 보고 무시한다.
      const lowerSrc = trimmed.toLowerCase();
      const lowerDst = translated.toLowerCase();
      if (lowerSrc !== lowerDst) {
        return translated;
      }
    }
    return "";
  } catch (e) {
    console.warn("[TTS] translateToKorean failed:", e);
    // 오류 시에도 영어 원문을 그대로 노출하지 않고 빈 문자열 반환
    return "";
  }
}
