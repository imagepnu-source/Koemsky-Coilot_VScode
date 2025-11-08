// lib/ui-design.ts
var STORAGE_KEY = "komensky_ui_design_v2";
var font = (size, bold = false, color = "#111111") => ({ size, bold, color });
var box = (bg = "#FFFFFF", padding = 12, bw = 1, bc = "rgba(0,0,0,0.12)") => ({ bg, padding, border: { width: bw, color: bc } });
var sbox = (bg = "#FFFFFF", bw = 1, bc = "rgba(0,0,0,0.12)", radius = 12) => ({ bg, borderWidth: bw, borderColor: bc, radius });
var defaults = {
  // header
  topHeaderBox: box(),
  title: font(18, true),
  namebio: font(13, false, "#444444"),
  devage: font(14, true, "#0A66FF"),
  catag: { size: 12, bold: true },
  dropdown: {
    options: [],
    value: void 0,
    multi: false,
    placeholder: "",
    size: 12,
    bold: false,
    color: "#111111",
    bg: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    hoverBg: "#F5F5F5"
  },
  // list
  playListBox: box("#FFFFFF", 12, 1, "rgba(0,0,0,0.12)"),
  activityBox: sbox("#FFFFFF", 1, "rgba(0,0,0,0.12)", 12),
  levelBadgeBox: sbox("#FFFFFF", 1, "rgba(0,0,0,0.12)", 12),
  activity: font(14, true, "#111111"),
  levelBadge: { bg: "#FFFFFF", borderWidth: 1, borderColor: "rgba(0,0,0,0.12)", radius: 10, height: 20, paddingX: 6, paddingY: 2 },
  ageBadge: { fontSize: 11, bold: false, color: "#111111", bg: "#FFFFFF", borderWidth: 1, borderColor: "rgba(0,0,0,0.12)", radius: 8, height: 18, paddingX: 6, paddingY: 2 },
  // detail (new)
  detailSmallBox: sbox("#FFFFFF", 1, "rgba(0,0,0,0.12)", 12),
  detailTitle: font(16, true, "#111111"),
  detailBody: font(13, false, "#333333"),
  difficultyBox: sbox("#FFFFFF", 1, "rgba(0,0,0,0.12)", 12),
  difficultyText: font(13, false, "#111111")
};
var __uiDesignDiagCount = 0;
function diagClassInfo(el) {
  try {
    if (!el) return { ok: false };
    return {
      ok: true,
      idx: ++__uiDesignDiagCount,
      tag: el.tagName,
      className: el.className,
      isConnected: el.isConnected === void 0 ? "unknown" : !!el.isConnected,
      parentTag: el.parentElement ? el.parentElement.tagName : null,
      ownerDocument: el.ownerDocument ? true : false
    };
  } catch (e) {
    return { ok: false, err: e };
  }
}
function debugClassRemove(el, cls) {
  try {
    const info = diagClassInfo(el);
    console.debug("[ui-design][diag] classList.remove try", cls, info);
    if (!el) return;
    const cl = el.classList;
    if (!cl || typeof cl.remove !== "function") {
      console.warn("[ui-design][diag] classList missing/remove not a function", cls, info);
      return;
    }
    cl.remove(cls);
    console.debug("[ui-design][diag] classList.remove ok", cls, info);
  } catch (err) {
    console.error("[ui-design][diag] classList.remove threw", { cls, err, info: diagClassInfo(el) }, err && err.stack);
  }
}
function debugClassAdd(el, cls) {
  try {
    const info = diagClassInfo(el);
    console.debug("[ui-design][diag] classList.add try", cls, info);
    if (!el) return;
    const cl = el.classList;
    if (!cl || typeof cl.add !== "function") {
      console.warn("[ui-design][diag] classList missing/add not a function", cls, info);
      return;
    }
    cl.add(cls);
    console.debug("[ui-design][diag] classList.add ok", cls, info);
  } catch (err) {
    console.error("[ui-design][diag] classList.add threw", { cls, err, info: diagClassInfo(el) }, err && err.stack);
  }
}
function safeClassAction(el, cls, add) {
  try {
    if (!el) return;
    const anyEl = el;
    if (typeof anyEl.isConnected === "boolean" && !anyEl.isConnected) return;
    if (!anyEl.ownerDocument) return;
    const list = el.classList;
    if (!list) return;
    const method = add ? list.add : list.remove;
    if (typeof method !== "function") return;
    method.call(list, cls);
  } catch (err) {
    try {
      console.warn("[ui-design] safeClassAction failed", { cls, add, err });
    } catch {
    }
  }
}
function mergeDefaults(def, val) {
  const out = { ...def, ...val || {} };
  if ((val == null ? void 0 : val.border) && "border" in def) out.border = { ...def.border, ...val.border };
  if ("dropdown" in def && (val == null ? void 0 : val.dropdown)) out.dropdown = { ...def.dropdown, ...val.dropdown };
  return out;
}
function asFont(v) {
  var _a;
  if (!v || typeof v !== "object") {
    return { size: 12, bold: false, color: "#000000" };
  }
  return {
    size: typeof v.size === "number" ? v.size : Number(v == null ? void 0 : v.size) || 12,
    family: typeof v.family === "string" ? v.family : (v == null ? void 0 : v.fontFamily) || void 0,
    bold: !!v.bold,
    italic: !!v.italic,
    color: typeof v.color === "string" ? v.color : (v == null ? void 0 : v.hex) || "#000000",
    lineHeight: (_a = v.lineHeight) != null ? _a : v == null ? void 0 : v.lh,
    ...v
  };
}
function normalizeDropdown(v) {
  if (!v) return { options: [] };
  if (Array.isArray(v)) return { options: v.map((o) => typeof o === "string" ? { value: o } : o) };
  return v;
}
function loadUIDesignCfg() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw);
    const merged = { ...defaults, ...parsed || {} };
    merged.topHeaderBox = mergeDefaults(defaults.topHeaderBox, parsed == null ? void 0 : parsed.topHeaderBox);
    merged.playListBox = mergeDefaults(defaults.playListBox, parsed == null ? void 0 : parsed.playListBox);
    merged.dropdown = mergeDefaults(defaults.dropdown, parsed == null ? void 0 : parsed.dropdown);
    merged.activityBox = { ...defaults.activityBox, ...(parsed == null ? void 0 : parsed.activityBox) || {} };
    merged.levelBadgeBox = { ...defaults.levelBadgeBox, ...(parsed == null ? void 0 : parsed.levelBadgeBox) || {} };
    merged.detailSmallBox = { ...defaults.detailSmallBox, ...(parsed == null ? void 0 : parsed.detailSmallBox) || {} };
    merged.difficultyBox = { ...defaults.difficultyBox, ...(parsed == null ? void 0 : parsed.difficultyBox) || {} };
    merged.title = { ...defaults.title, ...(parsed == null ? void 0 : parsed.title) || {} };
    merged.namebio = { ...defaults.namebio, ...(parsed == null ? void 0 : parsed.namebio) || {} };
    merged.devage = { ...defaults.devage, ...(parsed == null ? void 0 : parsed.devage) || {} };
    merged.activity = { ...defaults.activity, ...(parsed == null ? void 0 : parsed.activity) || {} };
    merged.detailTitle = { ...defaults.detailTitle, ...(parsed == null ? void 0 : parsed.detailTitle) || {} };
    merged.detailBody = { ...defaults.detailBody, ...(parsed == null ? void 0 : parsed.detailBody) || {} };
    merged.difficultyText = { ...defaults.difficultyText, ...(parsed == null ? void 0 : parsed.difficultyText) || {} };
    merged.levelBadge = { ...defaults.levelBadge, ...(parsed == null ? void 0 : parsed.levelBadge) || {} };
    merged.ageBadge = { ...defaults.ageBadge, ...(parsed == null ? void 0 : parsed.ageBadge) || {} };
    return merged;
  } catch (e) {
    console.warn("[ui-design] load failed, using defaults:", e);
    return { ...defaults };
  }
}
function saveUIDesignCfg(cfg) {
  try {
    const next = { ...defaults, ...cfg };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    console.error("[ui-design] save failed:", e);
  }
}
function buildVarsFromCfg(cfg) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A, _B, _C, _D, _E, _F, _G, _H, _I, _J, _K, _L, _M, _N, _O, _P, _Q, _R, _S, _T, _U, _V, _W, _X, _Y, _Z, __, _$, _aa, _ba, _ca, _da, _ea, _fa, _ga, _ha, _ia, _ja, _ka, _la, _ma, _na, _oa, _pa, _qa, _ra, _sa, _ta, _ua, _va, _wa, _xa, _ya, _za, _Aa;
  const vars = {
    "--ui-title-size": ((_a = cfg.title) == null ? void 0 : _a.size) ? String(cfg.title.size) + "px" : "",
    "--ui-title-weight": ((_b = cfg.title) == null ? void 0 : _b.bold) ? "700" : "400",
    "--ui-title-color": (_d = (_c = cfg.title) == null ? void 0 : _c.color) != null ? _d : "",
    "--ui-top-header-bg": (_f = (_e = cfg.topHeaderBox) == null ? void 0 : _e.bg) != null ? _f : "",
    "--ui-top-header-padding": ((_g = cfg.topHeaderBox) == null ? void 0 : _g.padding) != null ? String(cfg.topHeaderBox.padding) + "px" : "",
    "--ui-top-header-border-width": ((_i = (_h = cfg.topHeaderBox) == null ? void 0 : _h.border) == null ? void 0 : _i.width) != null ? String(cfg.topHeaderBox.border.width) + "px" : "",
    "--ui-top-header-border-color": (_l = (_k = (_j = cfg.topHeaderBox) == null ? void 0 : _j.border) == null ? void 0 : _k.color) != null ? _l : "",
    "--ui-playlist-bg": (_n = (_m = cfg.playListBox) == null ? void 0 : _m.bg) != null ? _n : "",
    "--ui-playlist-padding": ((_o = cfg.playListBox) == null ? void 0 : _o.padding) != null ? String(cfg.playListBox.padding) + "px" : "",
    "--ui-playlist-border-width": ((_q = (_p = cfg.playListBox) == null ? void 0 : _p.border) == null ? void 0 : _q.width) != null ? String(cfg.playListBox.border.width) + "px" : "",
    "--ui-playlist-border-color": (_t = (_s = (_r = cfg.playListBox) == null ? void 0 : _r.border) == null ? void 0 : _s.color) != null ? _t : "",
    "--ui-name-size": ((_u = cfg.namebio) == null ? void 0 : _u.size) != null ? String(cfg.namebio.size) + "px" : "",
    "--ui-name-weight": ((_v = cfg.namebio) == null ? void 0 : _v.bold) ? "700" : "400",
    "--ui-name-color": (_x = (_w = cfg.namebio) == null ? void 0 : _w.color) != null ? _x : "",
    "--ui-devage-size": ((_y = cfg.devage) == null ? void 0 : _y.size) != null ? String(cfg.devage.size) + "px" : "",
    "--ui-devage-weight": ((_z = cfg.devage) == null ? void 0 : _z.bold) ? "700" : "400",
    "--ui-devage-color": (_B = (_A = cfg.devage) == null ? void 0 : _A.color) != null ? _B : "",
    "--ui-catag-size": ((_C = cfg.catag) == null ? void 0 : _C.size) != null ? String(cfg.catag.size) + "px" : "",
    "--ui-catag-weight": ((_D = cfg.catag) == null ? void 0 : _D.bold) ? "700" : "400",
    // Activity / Badge variables (restore connections)
    "--ui-activity-size": ((_E = cfg.activity) == null ? void 0 : _E.size) != null ? String(cfg.activity.size) + "px" : "",
    "--ui-activity-weight": ((_F = cfg.activity) == null ? void 0 : _F.bold) ? "700" : "400",
    "--ui-activity-color": (_H = (_G = cfg.activity) == null ? void 0 : _G.color) != null ? _H : "",
    "--ui-activity-box-bg": (_J = (_I = cfg.activityBox) == null ? void 0 : _I.bg) != null ? _J : "",
    "--ui-activity-box-border-width": String((_L = (_K = cfg.activityBox) == null ? void 0 : _K.borderWidth) != null ? _L : 0) + "px",
    "--ui-activity-box-border-color": (_N = (_M = cfg.activityBox) == null ? void 0 : _M.borderColor) != null ? _N : "",
    // compatibility with play-list-panel usage (activity-card variables)
    "--ui-activity-card-pad-x": "12px",
    "--ui-activity-card-pad-y": "8px",
    "--ui-activity-card-bg": (_P = (_O = cfg.activityBox) == null ? void 0 : _O.bg) != null ? _P : "",
    "--ui-activity-card-border-width": String((_R = (_Q = cfg.activityBox) == null ? void 0 : _Q.borderWidth) != null ? _R : 0) + "px",
    "--ui-activity-card-border-color": (_T = (_S = cfg.activityBox) == null ? void 0 : _S.borderColor) != null ? _T : "",
    "--ui-activity-card-radius": String((_V = (_U = cfg.activityBox) == null ? void 0 : _U.radius) != null ? _V : 0) + "px",
    "--ui-levelbadge-bg": (_Z = (_W = cfg.levelBadge) == null ? void 0 : _W.bg) != null ? _Z : (_Y = (_X = cfg.levelBadgeBox) == null ? void 0 : _X.bg) != null ? _Y : "",
    "--ui-levelbadge-border-width": String((_ba = (_aa = (__ = cfg.levelBadge) == null ? void 0 : __.borderWidth) != null ? _aa : (_$ = cfg.levelBadgeBox) == null ? void 0 : _$.borderWidth) != null ? _ba : 0) + "px",
    "--ui-levelbadge-border-color": (_fa = (_ea = (_ca = cfg.levelBadge) == null ? void 0 : _ca.borderColor) != null ? _ea : (_da = cfg.levelBadgeBox) == null ? void 0 : _da.borderColor) != null ? _fa : "",
    "--ui-levelbadge-radius": ((_ga = cfg.levelBadge) == null ? void 0 : _ga.radius) != null ? String(cfg.levelBadge.radius) + "px" : "",
    "--ui-levelbadge-height": ((_ha = cfg.levelBadge) == null ? void 0 : _ha.height) != null ? String(cfg.levelBadge.height) + "px" : "",
    "--ui-levelbadge-paddingx": ((_ia = cfg.levelBadge) == null ? void 0 : _ia.paddingX) != null ? String(cfg.levelBadge.paddingX) + "px" : "",
    "--ui-levelbadge-paddingy": ((_ja = cfg.levelBadge) == null ? void 0 : _ja.paddingY) != null ? String(cfg.levelBadge.paddingY) + "px" : "",
    // Age badge container vars (missing before)
    "--ui-agebadge-bg": (_la = (_ka = cfg.ageBadge) == null ? void 0 : _ka.bg) != null ? _la : "",
    "--ui-agebadge-border-width": String((_na = (_ma = cfg.ageBadge) == null ? void 0 : _ma.borderWidth) != null ? _na : 0) + "px",
    "--ui-agebadge-border-color": (_pa = (_oa = cfg.ageBadge) == null ? void 0 : _oa.borderColor) != null ? _pa : "",
    "--ui-agebadge-radius": ((_qa = cfg.ageBadge) == null ? void 0 : _qa.radius) != null ? String(cfg.ageBadge.radius) + "px" : "",
    "--ui-agebadge-height": ((_ra = cfg.ageBadge) == null ? void 0 : _ra.height) != null ? String(cfg.ageBadge.height) + "px" : "",
    "--ui-agebadge-paddingx": ((_sa = cfg.ageBadge) == null ? void 0 : _sa.paddingX) != null ? String(cfg.ageBadge.paddingX) + "px" : "",
    "--ui-agebadge-paddingy": ((_ta = cfg.ageBadge) == null ? void 0 : _ta.paddingY) != null ? String(cfg.ageBadge.paddingY) + "px" : "",
    "--ui-age-size": ((_ua = cfg.ageBadge) == null ? void 0 : _ua.fontSize) != null ? String(cfg.ageBadge.fontSize) + "px" : "",
    "--ui-age-weight": ((_va = cfg.ageBadge) == null ? void 0 : _va.bold) ? "700" : "400",
    "--ui-age-color": (_xa = (_wa = cfg.ageBadge) == null ? void 0 : _wa.color) != null ? _xa : "",
    "--ui-list-bg": (_za = (_ya = cfg.playListBox) == null ? void 0 : _ya.bg) != null ? _za : "",
    "--ui-radius": ((_Aa = cfg.detailSmallBox) == null ? void 0 : _Aa.radius) != null ? String(cfg.detailSmallBox.radius) + "px" : ""
  };
  return vars;
}
function injectVarsStyle(vars) {
  if (typeof document === "undefined") return;
  const id = "ui-design-vars";
  const rootCss = `:root{${Object.entries(vars).filter(([, v]) => v !== "").map(([k, v]) => `${k}:${v};`).join("")}}`;
  const scoped = `
.ui-design-active [data-ui="top-header"] {
  background: var(--ui-top-header-bg, transparent);
  padding: var(--ui-top-header-padding, 12px);
  border-style: solid;
  border-width: var(--ui-top-header-border-width, 0px);
  border-color: var(--ui-top-header-border-color, rgba(0,0,0,0.12));
  box-sizing: border-box;
}

/* header text rules \u2014 \uD14D\uC2A4\uD2B8 \uB178\uB4DC\uC5D0\uB9CC \uD3F0\uD2B8 \uC18D\uC131 \uC801\uC6A9 */
.ui-design-active [data-ui="top-header"] .title,
.ui-design-active [data-ui="top-header"] [data-ui="title"] {
  font-size: var(--ui-title-size, 18px);
  font-weight: var(--ui-title-weight, 700);
  color: var(--ui-title-color, #111111);
  line-height: 1.2;
}

.ui-design-active [data-ui="top-header"] [data-ui="namebio"],
.ui-design-active [data-ui="top-header"] .name {
  font-size: var(--ui-name-size, 13px);
  font-weight: var(--ui-name-weight, 400);
  color: var(--ui-name-color, #444444);
}

.ui-design-active [data-ui="top-header"] [data-ui="devage"],
.ui-design-active [data-ui="top-header"] .devage {
  font-size: var(--ui-devage-size, 14px);
  font-weight: var(--ui-devage-weight, 700);
  color: var(--ui-devage-color, #0A66FF);
}

.ui-design-active [data-ui="top-header"] [data-ui="catag"],
.ui-design-active [data-ui="top-header"] .catag {
  font-size: var(--ui-catag-size, 12px);
  font-weight: var(--ui-catag-weight, 700);
}

/* Activity box (container-only) */
.ui-design-active [data-ui="activity-box"],
.ui-design-active .activity-box {
  background: var(--ui-activity-box-bg, transparent);
  border: var(--ui-activity-box-border-width, 0px) solid var(--ui-activity-box-border-color, transparent);
  box-sizing: border-box;
}

/* Activity card / row (component uses --ui-activity-card-* vars) */
.ui-design-active [data-ui="activity-row"],
.ui-design-active .activity-row,
.ui-design-active [data-ui="activity-box"],
.ui-design-active .activity-box {
  background: var(--ui-activity-card-bg, var(--ui-activity-box-bg, transparent));
  padding-left: var(--ui-activity-card-pad-x, 12px);
  padding-right: var(--ui-activity-card-pad-x, 12px);
  padding-top: var(--ui-activity-card-pad-y, 8px);
  padding-bottom: var(--ui-activity-card-pad-y, 8px);
  border-style: solid;
  border-width: var(--ui-activity-card-border-width, var(--ui-activity-box-border-width, 0px));
  border-color: var(--ui-activity-card-border-color, var(--ui-activity-box-border-color, transparent));
  border-radius: var(--ui-activity-card-radius, 0px);
  box-sizing: border-box;
}

/* Activity inner text (num / title) */
.ui-design-active [data-ui="activity-num"],
.ui-design-active .activity-num,
.ui-design-active [data-ui="activity-title"],
.ui-design-active .activity-title,
.ui-design-active .activity,
.ui-design-active [data-ui="activity"] {
  font-size: var(--ui-activity-size, 14px);
  font-weight: var(--ui-activity-weight, 400);
  color: var(--ui-activity-color, #111111);
}

/* Level badge container & text */
.ui-design-active .level-badge,
.ui-design-active [data-ui="level-badge"] {
  background: var(--ui-levelbadge-bg, #fff);
  border: var(--ui-levelbadge-border-width, 0px) solid var(--ui-levelbadge-border-color, rgba(0,0,0,0.12));
  border-radius: var(--ui-levelbadge-radius, 10px);
  height: var(--ui-levelbadge-height, auto);
  /* \uAE30\uBCF8\uAC12\uC744 activity-card \uD328\uB529\uC73C\uB85C fallback \uC2DC\uCF1C Activity\uC640 \uAC04\uACA9 \uC720\uC0AC\uD558\uAC8C \uB9CC\uB4E6 */
  padding: var(--ui-levelbadge-paddingy, var(--ui-activity-card-pad-y, 8px)) var(--ui-levelbadge-paddingx, var(--ui-activity-card-pad-x, 12px));
  box-sizing: border-box;
}

/* Age badge container & text (mirror level badge behavior) */
.ui-design-active .age-badge,
.ui-design-active [data-ui="age-badge"] {
  background: var(--ui-agebadge-bg, #fff);
  border: var(--ui-agebadge-border-width, 0px) solid var(--ui-agebadge-border-color, rgba(0,0,0,0.12));
  border-radius: var(--ui-agebadge-radius, 8px);
  height: var(--ui-agebadge-height, auto);
  /* activity-card \uD328\uB529\uC744 \uAE30\uBCF8\uAC12\uC73C\uB85C \uC0AC\uC6A9 */
  padding: var(--ui-agebadge-paddingy, var(--ui-activity-card-pad-y, 8px)) var(--ui-agebadge-paddingx, var(--ui-activity-card-pad-x, 12px));
  box-sizing: border-box;
}

/* Age badge text (kept for text-specific rules) */
.ui-design-active .age-badge,
.ui-design-active [data-ui="age-badge"] {
  font-size: var(--ui-age-size, 11px);
  font-weight: var(--ui-age-weight, 400);
  color: var(--ui-age-color, #111111);
}

/* playlist root only */
.ui-design-active .ui-design-playlist-root {
  background: var(--ui-playlist-bg, var(--ui-list-bg, transparent));
  padding: var(--ui-playlist-padding, 12px);
  border: var(--ui-playlist-border-width, 0px) solid var(--ui-playlist-border-color, rgba(0,0,0,0.12));
  border-radius: 0px;
  box-sizing: border-box;
}

/* \uCD94\uAC00: \uBD80\uBAA8(.ui-design-activity-box)\uAC00 \uC2A4\uD0C0\uC77C\uB9C1\uB420 \uB54C \uB0B4\uBD80 activity-row\uC758 \uD14C\uB450\uB9AC/\uADF8\uB9BC\uC790 \uC81C\uAC70 */
.ui-design-active .ui-design-activity-box {
  overflow: hidden !important;
}
.ui-design-active .ui-design-activity-box > [data-ui="activity-row"],
.ui-design-active .ui-design-activity-box > .activity-row,
.ui-design-active .ui-design-activity-box [data-ui="activity-row"],
.ui-design-active .ui-design-activity-box .activity-row {
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  background: transparent !important;
  border-radius: 0 !important;
}

/* Color input / swatch sizing for UIDesign dialog */
/* Ensures hex text input and color-swatch have readable width */
.ui-design-active input[type="color"],
.ui-design-active .ui-color-swatch,
.ui-design-active .color-swatch {
  width: 28px !important;
  height: 24px !important;
  padding: 2px !important;
  vertical-align: middle !important;
  box-sizing: border-box !important;
}

/* PopUp 2 \uC804\uC6A9: color swatch\uB97C \uC138\uB85C 2\uBC30, \uAC00\uB85C 1.5\uBC30\uB85C \uD655\uB300 (\uC6B0\uC120\uC21C\uC704 \uD655\uBCF4) */
.ui-design-active .ui-design-dialog-2 input[type="color"],
.ui-design-active .ui-design-dialog-2 .ui-color-swatch,
.ui-design-active .ui-design-dialog-2 .color-swatch {
  width: 48px !important;
  height: 48px !important;
  padding: 0 !important;
  vertical-align: middle !important;
  box-sizing: border-box !important;
}

.ui-design-active .ui-design-dialog-2 input[type="text"].ui-color-hex,
.ui-design-active .ui-design-dialog-2 input[data-ui="color-hex"],
.ui-design-active .ui-design-dialog-2 .ui-color-hex {
  width: 160px !important;
  min-width: 120px !important;
  padding: 6px 8px !important;
  box-sizing: border-box !important;
  height: 32px !important; /* \uD14D\uC2A4\uD2B8 \uC785\uB825 \uC138\uB85C \uC815\uB82C \uBCF4\uC815 */
}

/* Color input / swatch sizing for UIDesign dialog */
/* Ensures hex text input and color-swatch have readable width */
.ui-design-active input[type="color"],
.ui-design-active .ui-color-swatch,
.ui-design-active .color-swatch {
  width: 28px !important;
  height: 24px !important;
  padding: 2px !important;
  vertical-align: middle !important;
  box-sizing: border-box !important;
}

/* PopUp 2 \uC804\uC6A9: color swatch\uB97C \uC138\uB85C 2\uBC30, \uAC00\uB85C 1.5\uBC30\uB85C \uD655\uB300 (\uC6B0\uC120\uC21C\uC704 \uD655\uBCF4) */
.ui-design-active .ui-design-dialog-2 input[type="color"],
.ui-design-active .ui-design-dialog-2 .ui-color-swatch,
.ui-design-active .ui-design-dialog-2 .color-swatch {
  width: 48px !important;
  height: 48px !important;
  padding: 0 !important;
  vertical-align: middle !important;
  box-sizing: border-box !important;
}

.ui-design-active .ui-design-dialog-2 input[type="text"].ui-color-hex,
.ui-design-active .ui-design-dialog-2 input[data-ui="color-hex"],
.ui-design-active .ui-design-dialog-2 .ui-color-hex {
  width: 160px !important;
  min-width: 120px !important;
  padding: 6px 8px !important;
  box-sizing: border-box !important;
  height: 32px !important; /* \uD14D\uC2A4\uD2B8 \uC785\uB825 \uC138\uB85C \uC815\uB82C \uBCF4\uC815 */
}
`;
  const css = rootCss + "\n" + scoped;
  let tag = document.getElementById(id);
  if (!tag) {
    tag = document.createElement("style");
    tag.id = id;
    tag.appendChild(document.createTextNode(css));
    document.head && document.head.appendChild(tag);
  } else {
    if (tag.textContent !== css) tag.textContent = css;
  }
}
function applyUIDesignCSS(cfg) {
  const vars = buildVarsFromCfg(cfg);
  try {
    injectVarsStyle(vars);
  } catch {
  }
  try {
    const vars2 = buildVarsFromCfg(cfg);
    const playlistSelectors = [
      '[data-ui="play-list-panel"]',
      '[data-ui="play-list"]',
      ".play-list-panel",
      ".play-list",
      ".play-list-wrap"
    ];
    const selector = playlistSelectors.join(",");
    const allMatches = Array.from(document.querySelectorAll(selector));
    const isAncestorInMatches = (el) => {
      let p = el.parentElement;
      while (p) {
        if (allMatches.includes(p)) return true;
        p = p.parentElement;
      }
      return false;
    };
    const roots = allMatches.filter((el) => !isAncestorInMatches(el));
    const prevMarked = Array.from(document.querySelectorAll(".ui-design-playlist-root"));
    for (const pm of prevMarked) {
      if (!roots.includes(pm)) {
        safeClassAction(pm, "ui-design-playlist-root", false);
        pm.style.removeProperty("background");
        pm.style.removeProperty("padding");
        pm.style.removeProperty("border");
        pm.style.removeProperty("border-radius");
        pm.style.removeProperty("box-sizing");
      }
    }
    for (const el of roots) {
      safeClassAction(el, "ui-design-playlist-root", true);
      if (vars2["--ui-playlist-bg"]) el.style.setProperty("background", vars2["--ui-playlist-bg"], "important");
      if (vars2["--ui-playlist-padding"]) el.style.setProperty("padding", vars2["--ui-playlist-padding"], "important");
      if (vars2["--ui-playlist-border-width"] || vars2["--ui-playlist-border-color"]) {
        const bw = vars2["--ui-playlist-border-width"] || "0px";
        const bc = vars2["--ui-playlist-border-color"] || "transparent";
        el.style.setProperty("border", `${bw} solid ${bc}`, "important");
        el.style.setProperty("border-radius", "0px", "important");
        el.style.boxSizing = "border-box";
      }
    }
    const headerSelector = '[data-ui="top-header"]';
    const prevHeaders = Array.from(document.querySelectorAll(".ui-design-top-header"));
    const currHeaders = Array.from(document.querySelectorAll(headerSelector));
    for (const ph of prevHeaders) {
      if (!currHeaders.includes(ph)) {
        safeClassAction(ph, "ui-design-top-header", false);
        ph.style.removeProperty("background");
        ph.style.removeProperty("padding");
        ph.style.removeProperty("border");
        ph.style.removeProperty("box-sizing");
        try {
          const tsel = '[data-ui="title"], .title';
          const nsel = '[data-ui="namebio"], .name';
          const dsel = '[data-ui="devage"], .devage';
          const csel = '[data-ui="catag"], .catag';
          const txtEls = Array.from(ph.querySelectorAll(`${tsel},${nsel},${dsel},${csel}`));
          for (const te of txtEls) {
            safeClassAction(te, "ui-design-top-text", false);
            te.style.removeProperty("font-size");
            te.style.removeProperty("font-weight");
            te.style.removeProperty("color");
          }
        } catch (e) {
        }
      }
    }
    for (const h of currHeaders) {
      safeClassAction(h, "ui-design-top-header", true);
      if (vars2["--ui-top-header-bg"]) h.style.setProperty("background", vars2["--ui-top-header-bg"], "important");
      if (vars2["--ui-top-header-padding"]) h.style.setProperty("padding", vars2["--ui-top-header-padding"], "important");
      const bw = vars2["--ui-top-header-border-width"] || "0px";
      const bc = vars2["--ui-top-header-border-color"] || "transparent";
      h.style.setProperty("border", `${bw} solid ${bc}`, "important");
      h.style.boxSizing = "border-box";
      try {
        const titleEls = Array.from(h.querySelectorAll('[data-ui="title"], .title'));
        for (const te of titleEls) {
          safeClassAction(te, "ui-design-top-text", true);
          if (vars2["--ui-title-size"]) te.style.setProperty("font-size", vars2["--ui-title-size"], "important");
          if (vars2["--ui-title-weight"]) te.style.setProperty("font-weight", vars2["--ui-title-weight"], "important");
          if (vars2["--ui-title-color"]) te.style.setProperty("color", vars2["--ui-title-color"], "important");
        }
        const nameEls = Array.from(h.querySelectorAll('[data-ui="namebio"], .name'));
        for (const ne of nameEls) {
          safeClassAction(ne, "ui-design-top-text", true);
          if (vars2["--ui-name-size"]) ne.style.setProperty("font-size", vars2["--ui-name-size"], "important");
          if (vars2["--ui-name-weight"]) ne.style.setProperty("font-weight", vars2["--ui-name-weight"], "important");
          if (vars2["--ui-name-color"]) ne.style.setProperty("color", vars2["--ui-name-color"], "important");
        }
        const devEls = Array.from(h.querySelectorAll('[data-ui="devage"], .devage'));
        for (const de of devEls) {
          safeClassAction(de, "ui-design-top-text", true);
          if (vars2["--ui-devage-size"]) de.style.setProperty("font-size", vars2["--ui-devage-size"], "important");
          if (vars2["--ui-devage-weight"]) de.style.setProperty("font-weight", vars2["--ui-devage-weight"], "important");
          if (vars2["--ui-devage-color"]) de.style.setProperty("color", vars2["--ui-devage-color"], "important");
        }
        const catEls = Array.from(h.querySelectorAll('[data-ui="catag"], .catag'));
        for (const ce of catEls) {
          safeClassAction(ce, "ui-design-top-text", true);
          if (vars2["--ui-catag-size"]) ce.style.setProperty("font-size", vars2["--ui-catag-size"], "important");
          if (vars2["--ui-catag-weight"]) ce.style.setProperty("font-weight", vars2["--ui-catag-weight"], "important");
          if (vars2["--ui-catag-color"]) ce.style.setProperty("color", vars2["--ui-catag-color"], "important");
        }
      } catch (e) {
      }
    }
    const actSel = [
      '[data-ui="activity-box"]',
      '[data-ui="activityBox"]',
      '[data-ui="activity-row"]',
      // play-list-panel uses activity-row inside button
      ".activity-box",
      ".activity-row",
      ".play-item",
      ".play-list-item",
      ".card",
      ".list-item"
    ].join(",");
    const lvlSel = [
      '[data-ui="level-badge"]',
      ".level-badge",
      '[data-ui="levelBadge"]',
      ".levelBadge",
      ".badge-level"
    ].join(",");
    const ageSel = [
      '[data-ui="age-badge"]',
      ".age-badge",
      '[data-ui="ageBadge"]',
      ".ageBadge"
    ].join(",");
    const prevActs = Array.from(document.querySelectorAll(".ui-design-activity-box"));
    const currActs = Array.from(document.querySelectorAll(actSel));
    const prevLvls = Array.from(document.querySelectorAll(".ui-design-level-badge"));
    const currLvls = Array.from(document.querySelectorAll(lvlSel));
    const prevAges = Array.from(document.querySelectorAll(".ui-design-age-badge"));
    const currAges = Array.from(document.querySelectorAll(ageSel));
    try {
      console.debug("[ui-design] matched counts:", { acts: currActs.length, lvls: currLvls.length, ages: currAges.length });
    } catch {
    }
    for (const pa of prevActs) {
      if (!currActs.includes(pa)) {
        safeClassAction(pa, "ui-design-activity-box", false);
        pa.style.removeProperty("background");
        pa.style.removeProperty("border");
        pa.style.removeProperty("box-sizing");
        pa.style.removeProperty("padding");
        pa.style.removeProperty("border-radius");
      }
    }
    for (const a of currActs) {
      const target = a.tagName === "DIV" && a.parentElement && a.parentElement.tagName === "BUTTON" ? a.parentElement : a;
      safeClassAction(target, "ui-design-activity-box", true);
      if (vars2["--ui-activity-card-bg"]) target.style.setProperty("background", vars2["--ui-activity-card-bg"], "important");
      if (vars2["--ui-activity-card-pad-x"]) {
        target.style.setProperty("padding-left", vars2["--ui-activity-card-pad-x"], "important");
        target.style.setProperty("padding-right", vars2["--ui-activity-card-pad-x"], "important");
      }
      if (vars2["--ui-activity-card-pad-y"]) {
        target.style.setProperty("padding-top", vars2["--ui-activity-card-pad-y"], "important");
        target.style.setProperty("padding-bottom", vars2["--ui-activity-card-pad-y"], "important");
      }
      const abw = vars2["--ui-activity-card-border-width"] || vars2["--ui-activity-box-border-width"] || "0px";
      const abc = vars2["--ui-activity-card-border-color"] || vars2["--ui-activity-box-border-color"] || "transparent";
      target.style.setProperty("border", `${abw} solid ${abc}`, "important");
      if (vars2["--ui-activity-card-radius"]) target.style.setProperty("border-radius", vars2["--ui-activity-card-radius"], "important");
      target.style.boxSizing = "border-box";
      if (target !== a) {
        try {
          const inner = a;
          inner.style.setProperty("border", "none", "important");
          inner.style.setProperty("box-shadow", "none", "important");
          inner.style.setProperty("outline", "none", "important");
          inner.style.setProperty("border-radius", "0px", "important");
          inner.style.setProperty("background", "transparent", "important");
          inner.style.setProperty("padding", "0px", "important");
          inner.style.setProperty("box-sizing", "border-box", "important");
          try {
            target.style.setProperty("overflow", "hidden", "important");
          } catch {
          }
        } catch {
        }
      }
      const textSel = [
        '[data-ui="activity-num"]',
        ".activity-num",
        '[data-ui="activity-title"]',
        ".activity-title",
        '[data-ui="activity"]',
        ".activity"
      ].join(",");
      const textContainer = target === a ? a : a;
      const textEls = Array.from(textContainer.querySelectorAll(textSel));
      for (const te of textEls) {
        if (vars2["--ui-activity-size"]) te.style.setProperty("font-size", vars2["--ui-activity-size"], "important");
        if (vars2["--ui-activity-weight"]) te.style.setProperty("font-weight", vars2["--ui-activity-weight"], "important");
        if (vars2["--ui-activity-color"]) te.style.setProperty("color", vars2["--ui-activity-color"], "important");
      }
      if (textEls.length === 0) {
        try {
          if (vars2["--ui-activity-size"]) a.style.setProperty("font-size", vars2["--ui-activity-size"], "important");
          if (vars2["--ui-activity-weight"]) a.style.setProperty("font-weight", vars2["--ui-activity-weight"], "important");
          if (vars2["--ui-activity-color"]) a.style.setProperty("color", vars2["--ui-activity-color"], "important");
        } catch {
        }
      }
    }
    for (const pl of prevLvls) {
      if (!currLvls.includes(pl)) {
        safeClassAction(pl, "ui-design-level-badge", false);
        pl.style.removeProperty("background");
        pl.style.removeProperty("border");
        pl.style.removeProperty("border-radius");
        pl.style.removeProperty("height");
        pl.style.removeProperty("padding");
        pl.style.removeProperty("box-sizing");
      }
    }
    for (const l of currLvls) {
      safeClassAction(l, "ui-design-level-badge", true);
      if (vars2["--ui-levelbadge-bg"]) l.style.setProperty("background", vars2["--ui-levelbadge-bg"], "important");
      const lbw = vars2["--ui-levelbadge-border-width"] || "0px";
      const lbc = vars2["--ui-levelbadge-border-color"] || "transparent";
      l.style.setProperty("border", `${lbw} solid ${lbc}`, "important");
      if (vars2["--ui-levelbadge-radius"]) l.style.setProperty("border-radius", vars2["--ui-levelbadge-radius"], "important");
      if (vars2["--ui-levelbadge-height"]) l.style.setProperty("height", vars2["--ui-levelbadge-height"], "important");
      const py = vars2["--ui-levelbadge-paddingy"] || vars2["--ui-activity-card-pad-y"] || "8px";
      const px = vars2["--ui-levelbadge-paddingx"] || vars2["--ui-activity-card-pad-x"] || "12px";
      l.style.setProperty("padding", `${py} ${px}`, "important");
      l.style.boxSizing = "border-box";
    }
    for (const pa of prevAges) {
      if (!currAges.includes(pa)) {
        safeClassAction(pa, "ui-design-age-badge", false);
        pa.style.removeProperty("font-size");
        pa.style.removeProperty("font-weight");
        pa.style.removeProperty("color");
        pa.style.removeProperty("background");
        pa.style.removeProperty("border");
        pa.style.removeProperty("border-radius");
        pa.style.removeProperty("height");
        pa.style.removeProperty("padding");
        pa.style.removeProperty("box-sizing");
      }
    }
    for (const ag of currAges) {
      safeClassAction(ag, "ui-design-age-badge", true);
      if (vars2["--ui-age-size"]) ag.style.setProperty("font-size", vars2["--ui-age-size"], "important");
      if (vars2["--ui-age-weight"]) ag.style.setProperty("font-weight", vars2["--ui-age-weight"], "important");
      if (vars2["--ui-age-color"]) ag.style.setProperty("color", vars2["--ui-age-color"], "important");
      if (vars2["--ui-agebadge-bg"]) ag.style.setProperty("background", vars2["--ui-agebadge-bg"], "important");
      const abw = vars2["--ui-agebadge-border-width"] || "0px";
      const abc = vars2["--ui-agebadge-border-color"] || "transparent";
      ag.style.setProperty("border", `${abw} solid ${abc}`, "important");
      if (vars2["--ui-agebadge-radius"]) ag.style.setProperty("border-radius", vars2["--ui-agebadge-radius"], "important");
      if (vars2["--ui-agebadge-height"]) ag.style.setProperty("height", vars2["--ui-agebadge-height"], "important");
      const apy = vars2["--ui-agebadge-paddingy"] || vars2["--ui-activity-card-pad-y"] || "8px";
      const apx = vars2["--ui-agebadge-paddingx"] || vars2["--ui-activity-card-pad-x"] || "12px";
      ag.style.setProperty("padding", `${apy} ${apx}`, "important");
      ag.style.boxSizing = "border-box";
    }
  } catch (e) {
    console.warn("[ui-design] inline playlist apply failed", e);
  }
}
function autoApplySavedDesign() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const savedCfg = loadUIDesignCfg();
    try {
      applyUIDesignCSS(savedCfg);
    } catch (e) {
    }
    const addHtmlClass = () => {
      try {
        if (document.documentElement && !document.documentElement.classList.contains("ui-design-active")) {
          document.documentElement.classList.add("ui-design-active");
        }
      } catch {
      }
    };
    if (document.readyState === "complete") {
      addHtmlClass();
    } else {
      window.addEventListener("DOMContentLoaded", addHtmlClass, { once: true });
      window.addEventListener("load", addHtmlClass, { once: true });
    }
  } catch (e) {
    console.warn("[ui-design] autoApplySavedDesign failed", e);
  }
}
export {
  applyUIDesignCSS,
  asFont,
  autoApplySavedDesign,
  buildVarsFromCfg,
  debugClassAdd,
  debugClassRemove,
  loadUIDesignCfg,
  normalizeDropdown,
  saveUIDesignCfg
};
