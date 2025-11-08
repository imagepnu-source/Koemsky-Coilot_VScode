import { saveUIDesignCfg, applyUIDesignCSS, loadUIDesignCfg, uiDesignDumpState } from '../../lib/ui-design'

// ...existing code...
function handleSave() {
  // Ensure we actually have a cfg object. Replace `currentCfg` with your dialog state variable name.
  const cfg = (typeof (currentCfg) !== 'undefined' && currentCfg) ? currentCfg : loadUIDesignCfg();
  console.debug('[ui-design] UIDesignDialog.handleSave cfg', cfg);
  saveUIDesignCfg(cfg);      // localStorage에 저장
  applyUIDesignCSS(cfg);     // 즉시 UI에 적용
  // dump state for diagnostics
  try { uiDesignDumpState(); } catch {}
  // (선택) 닫기/피드백
}
// ...existing code...