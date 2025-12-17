// ---------------------------------------------------------
// Annotated on 2025-10-20 15:40
// Baseline: User-declared reference version (2025-10-21)
// File: index.tsx
// Note: Comments are for maintainability; no runtime behavior change.
// ---------------------------------------------------------


import { parsePlayData } from "./lib/data-parser"
import { loadCategoryRecord, saveCategoryRecord, createEmptyCategoryRecord } from "./lib/storage-category"
import { calculateCategoryDevelopmentalAgeFromRecord } from "./lib/storage-core"
import { generateGraphDataFromPlayData } from "./lib/storage-category"
import type { PlayCategory, AvailablePlayList, GraphDataEntry } from "./lib/types"

// Chart.js v4: 필요한 구성요소만 import 후 register
import {
  Chart,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  type TooltipItem
} from "chart.js";

Chart.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, CategoryScale, LinearScale);

// --- App State ---
interface ChildInfo {
  name: string
  dob: string
}

interface Activity {
  id: string
  category: string
  number: number
  titleKr: string
  ageRange: string
  startAge: number
  endAge: number
}

interface Completion {
  completedLevels: { [level: number]: string } // level: date string
}

interface Snapshot {
  name: string
  date: string
  data: AppState
}

interface DevAgeHistoryPoint {
  date: string
  age: number
}

interface ParsedDetails {
  [key: string]: string | { [level: number]: string }
}

interface CategoryRecord {
  categoryName: PlayCategory
  provided_playList: AvailablePlayList[]
  playData: {
    playNumber: number
    playTitle: string
    minAge: number
    maxAge: number
    achievedLevelFlags: [boolean, boolean, boolean, boolean, boolean] // level 1-5
    achievedDates: [Date?, Date?, Date?, Date?, Date?] // level 1-5
  }[]
  graphData: GraphDataEntry[]
  maxLevels: [number, number, number] // max1, max2, max3
  categoryDevelopmentalAge: number
}

interface PlayData {
  playNumber: number
  playTitle: string
  minAge: number
  maxAge: number
  achievedLevelFlags: boolean[]
  achievedDates: (string | undefined)[]
}

interface GraphData {
  date: string
  age: number
}

interface AppState {
  childInfo: ChildInfo | null
  activities: Activity[]
  completions: { [activityId: string]: Completion }
  developmentalAges: { [category: string]: number[] } // Top 3 for Radar
  selectedActivityId: string | null
  selectedCategory: string | null
  selectedTab: string | null // Can be a category name or 'Graph'
  snapshots: Snapshot[]
  categoryRecords: { [category: string]: CategoryRecord }
  activitiesLoaded: boolean
}

let appState: AppState = {
  childInfo: null,
  activities: [],
  completions: {},
  developmentalAges: {},
  selectedActivityId: null,
  selectedCategory: null,
  selectedTab: null,
  snapshots: [],
  categoryRecords: {},
  activitiesLoaded: false,
}
let radarChart: any = null
let timeAxisChart: any = null
let saveTimeout: ReturnType<typeof setTimeout>

// --- Category Mappings (Simplified) ---
let PLAY_CATEGORIES: string[] = []
let TABS: string[] = []

// 카테고리 초기화 함수
async function initializeCategories() {
  const { getPlayCategories } = await import("./lib/types")
  PLAY_CATEGORIES = await getPlayCategories()
  TABS = [...PLAY_CATEGORIES, "Graph"]
  console.log("[v0] Initialized categories:", PLAY_CATEGORIES)
}

// --- DOM Elements ---
const welcomeScreen = document.getElementById("welcome-screen") as HTMLElement
const appContainer = document.getElementById("app") as HTMLElement
const registrationForm = document.getElementById("registration-form") as HTMLFormElement
const childNameInput = document.getElementById("childName") as HTMLInputElement
const childDobInput = document.getElementById("childDob") as HTMLInputElement
const contentDiv = document.getElementById("content") as HTMLElement
const detailPanel = document.getElementById("activity-detail-panel") as HTMLElement
const childBioInfo = document.getElementById("child-bio-info") as HTMLElement
const childDevAge = document.getElementById("child-dev-age") as HTMLElement
const categoryDevAge = document.getElementById("category-dev-age") as HTMLElement
const categoryTabsContainer = document.getElementById("category-tabs") as HTMLElement
const returningUserView = document.getElementById("returning-user-view") as HTMLElement
const newUserView = document.getElementById("new-user-view") as HTMLElement
const returningChildName = document.getElementById("returning-child-name") as HTMLElement
const continueBtn = document.getElementById("continue-btn") as HTMLButtonElement
const resetBtn = document.getElementById("reset-btn") as HTMLButtonElement
const settingsBtn = document.getElementById("settings-btn") as HTMLButtonElement
const settingsModal = document.getElementById("settings-modal") as HTMLElement
const closeSettingsBtn = document.getElementById("close-settings-btn") as HTMLButtonElement
const settingsChildNameInput = document.getElementById("settings-childName") as HTMLInputElement
const settingsChildDobInput = document.getElementById("settings-childDob") as HTMLInputElement
const saveSettingsBtn = document.getElementById("save-settings-btn") as HTMLButtonElement
const resetAppDataBtn = document.getElementById("reset-app-data") as HTMLButtonElement
const saveStatusIndicator = document.getElementById("save-status-indicator") as HTMLElement
const settingsFeedbackDiv = document.getElementById("settings-feedback") as HTMLElement
const snapshotNameInput = document.getElementById("snapshot-name-input") as HTMLInputElement
const saveSnapshotBtn = document.getElementById("save-snapshot-btn") as HTMLButtonElement
const snapshotListContainer = document.getElementById("snapshot-list-container") as HTMLElement
const snapshotListUl = document.getElementById("snapshot-list") as HTMLUListElement
const generateTestDataBtn = document.getElementById("generate-test-data") as HTMLButtonElement
const activityView = document.getElementById("activity-view") as HTMLElement
const graphView = document.getElementById("graph-view") as HTMLElement
const confirmModal = document.getElementById("confirm-modal") as HTMLElement
const confirmTitle = document.getElementById("confirm-title") as HTMLElement
const confirmMessage = document.getElementById("confirm-message") as HTMLElement
const confirmCancelBtn = document.getElementById("confirm-cancel-btn") as HTMLButtonElement
const confirmOkBtn = document.getElementById("confirm-ok-btn") as HTMLButtonElement
const clearAllRecordsBtn = document.getElementById("clear-all-records-btn") as HTMLElement

if (typeof window !== "undefined") {
  (window as any).renderDetailPanel = renderDetailPanel;
  console.log("[LEGACY] index.tsx loaded & exposed renderDetailPanel");
}

// --- Core Functions ---
function saveState() {
  clearTimeout(saveTimeout)
  updateSaveStatus("Saving...")
  try {
    localStorage.setItem("komensky_app_state", JSON.stringify(appState))
    saveTimeout = setTimeout(() => updateSaveStatus("All changes saved ✓", true), 500)
  } catch (error) {
    console.error("Failed to save state:", error)
    updateSaveStatus("Save failed!", false, true)
  }
}

function loadState() {
  try {
    const savedState = localStorage.getItem("komensky_app_state")
    if (savedState) {
      const parsedState = JSON.parse(savedState)
      appState = {
        childInfo: null,
        activities: [],
        completions: {},
        developmentalAges: {},
        selectedActivityId: null,
        selectedCategory: null,
        selectedTab: null,
        snapshots: [],
        categoryRecords: {},
        activitiesLoaded: false,
        ...parsedState,
      }

      if (!appState.snapshots) appState.snapshots = []
      if (!appState.selectedTab) appState.selectedTab = PLAY_CATEGORIES[0]

      PLAY_CATEGORIES.forEach((category) => {
        if (!appState.developmentalAges[category]) {
          appState.developmentalAges[category] = [0, 0, 0]
        }
      })
      return true
    }
  } catch (error) {
    console.error("Failed to load or parse state:", error)
    return false
  }
  return false
}

function updateSaveStatus(message: string, isSaved = false, isError = false) {
  if (!saveStatusIndicator) return
  saveStatusIndicator.textContent = message
  saveStatusIndicator.classList.add("visible")
  saveStatusIndicator.classList.toggle("saved", isSaved)
  saveStatusIndicator.classList.toggle("error", isError)
}

// --- Initialization ---
async function initializeApp() {
  try {
    if (!appState.activitiesLoaded) {
      // Fetch and parse play_data.txt for available play list
      const response = await fetch('/play_data.txt');
      if (!response.ok) throw new Error('Failed to load play_data.txt');
      const rawData = await response.text();
      const categoriesData = parsePlayData(rawData);
      const built: Activity[] = [];
      Object.entries(categoriesData).forEach(([categoryName, acts]) => {
        (acts as any[]).forEach((a: any) => {
          const number = Number(a.number ?? a.playNumber ?? a.num ?? a.playNo ?? 0);
          const startAge = Number(a.minAge ?? a.startAge ?? a.min ?? 0);
          const endAge = Number(a.maxAge ?? a.endAge ?? a.max ?? startAge);
          const titleKr = (a.titleKr ?? a.title ?? a.playTitle ?? '').toString();
          built.push({
            id: `${categoryName}-${number}`,
            category: categoryName,
            number,
            titleKr,
            ageRange: `${startAge}~${endAge}`,
            startAge,
            endAge,
          });
        });
      });
      appState.activities = built;
      appState.activitiesLoaded = true;
      try { console.log('[REVERT] appState.activities populated from play_data.txt:', appState.activities.length); } catch {}
      try { (window as any).__activities = built; } catch {}
    } else {
      try { console.log('[REVERT] appState.activities already present:', appState.activities.length); } catch {}
    }

    // CategoryRecords logic remains unchanged
    // console.log(`[v0] CATEGORY_RECORD: Checking CategoryRecords for all categories`)
    let needsRecordCreation = false
    for (const category of PLAY_CATEGORIES) {
      const existingRecord = loadCategoryRecord(category)
      if (!existingRecord || !existingRecord.graphData || existingRecord.graphData.length === 0) {
        needsRecordCreation = true
        break
      } else {
      }
    }
    if (needsRecordCreation) {
      // Use the already loaded categoriesData from play_data.txt
      const categoriesData: Record<string, import("./lib/types").AvailablePlayList[]> = {};
      appState.activities.forEach((a) => {
        if (!categoriesData[a.category]) categoriesData[a.category] = [];
        categoriesData[a.category].push({
          number: a.number,
          title: a.titleKr,
          ageRange: a.ageRange,
          category: a.category,
          minAge: a.startAge,
          maxAge: a.endAge,
        });
      });
      Object.entries(categoriesData).forEach(([categoryName, acts]) => {
        const category = categoryName as PlayCategory;
        const activities = acts as import("./lib/types").AvailablePlayList[];
        // console.log(`[v0] CATEGORY_RECORD: Creating new CategoryRecord for ${category}`);
        const categoryRecord = createEmptyCategoryRecord(category);
        categoryRecord.provided_playList = activities;
        categoryRecord.playData = activities.map((activity) => ({
          playNumber: activity.number,
          playTitle: activity.title,
          minAge: activity.minAge,
          maxAge: activity.maxAge,
          achievedLevelFlags: [false, false, false, false, false],
          achievedDates: [undefined, undefined, undefined, undefined, undefined],
        }));
        categoryRecord.graphData = generateGraphDataFromPlayData(categoryRecord);
        categoryRecord.categoryDevelopmentalAge = calculateCategoryDevelopmentalAgeFromRecord(categoryRecord);
        saveCategoryRecord(categoryRecord);
      });
      // console.log(`[v0] CATEGORY_RECORD: All CategoryRecords created and saved with GraphData`)
    } else {
      // console.log(`[v0] CATEGORY_RECORD: All CategoryRecords already exist, no creation needed`)
    }

    setupEventListeners()
    renderSnapshots()
  } catch (error) {
    console.error("Initialization failed:", error)
    document.body.innerHTML = `<div style="padding: 20px; color: red;"><h2>Initialization Error</h2><p>Could not initialize the application. Please check the console for details.</p><pre>${error}</pre></div>`
  }
}

function startApp() {
  welcomeScreen.classList.add("hidden")
  appContainer.classList.remove("hidden")
  updateChildInfoDisplay()
  renderCategoryTabs()
  selectTab(appState.selectedTab || PLAY_CATEGORIES[0])

  renderAllGraphs()
}

// --- Data Parsing ---
// No longer needed: all activities are loaded from play_data.txt at app init.

// --- UI Rendering ---
function renderCategoryTabs() {
  categoryTabsContainer.innerHTML = ""
  TABS.forEach((tabName) => {
    const button = document.createElement("button")
    button.className = "category-tab-button"
    button.textContent = tabName
    button.dataset.tab = tabName
    if (tabName === "Graph") button.classList.add("graph-tab")
    button.onclick = () => selectTab(tabName)
    categoryTabsContainer.appendChild(button)
  })
}

function renderActivities(category: string) {
  const filteredActivities = appState.activities.filter((a) => a.category === category)
  if (filteredActivities.length === 0) {
    contentDiv.innerHTML = `<div class="no-results"><p>No activities found.</p></div>`
    return
  }
  const list = document.createElement("ul")
  list.className = "activity-list"
  filteredActivities.forEach((activity) => {
    const item = document.createElement("li")
    item.className = "activity-item"
    item.dataset.activityId = activity.id
    item.onclick = () => selectActivity(activity.id)

    if (activity.id === appState.selectedActivityId) {
      item.classList.add("selected")
    }

    const completion = appState.completions[activity.id]
    const completedLevels = completion ? Object.keys(completion.completedLevels).map(Number) : []
    const highestLevel = completedLevels.length > 0 ? Math.max(...completedLevels) : 0

    let levelColorClass = "level-color-0"
    if (highestLevel >= 4) levelColorClass = "level-color-4-5"
    else if (highestLevel === 3) levelColorClass = "level-color-3"
    else if (highestLevel >= 1) levelColorClass = "level-color-1-2"

    item.innerHTML = `
            <span class="activity-number">${activity.number}</span>
            <span class="title-kr">${activity.titleKr}</span>
            <div class="activity-meta">
                <span class="level-number ${levelColorClass}">${highestLevel}</span>
                <span class="age">${activity.ageRange}m</span>
            </div>
        `
    list.appendChild(item)
  })
  contentDiv.innerHTML = ""
  contentDiv.appendChild(list)
}

async function getAndParseDetails(activity: Activity): Promise<ParsedDetails | null> {
  try { console.log("[DIAG F] getAndParseDetails enter", { category: activity.category, number: activity.number }); } catch {}
try {
    const response = await fetch(`/details_${activity.category}.txt`)
    if (!response.ok) {
      throw new Error(`Details for category "${activity.category}" not found.`)
    }
    const categoryData = await response.text()

    const activitiesText = categoryData.split("---")
    const activityText = activitiesText.find((t) => {
      const match = t.match(/Number:\s*(\d+)/)
      return match && Number.parseInt(match[1], 10) === activity.number
    })

    if (!activityText)
      throw new Error(`Details for activity #${activity.number} not found in category "${activity.category}"`)

    const details: ParsedDetails = {}
    const lines = activityText.trim().split("\n")
    let currentKey: string | null = null
    let currentContent: string[] = []

    const commitSection = () => {
      if (currentKey && currentContent.length > 0) {
        if (currentKey === "놀이 난이도 조절") {
          const levels: { [level: number]: string } = {}
          currentContent.forEach((l) => {
            const match = l.match(/^\s*Level (\d+):\s*(.*)/)
            if (match) levels[Number.parseInt(match[1], 10)] = match[2].trim()
          })
          details[currentKey] = levels
        } else {
          details[currentKey] = currentContent.join("\n").trim()
        }
      }
    }

    for (const line of lines) {
      const match = line.match(/^([^:]+):\s*(.*)$/)
      if (match && !/^\s*Level \d+:/.test(line)) {
        commitSection()
        currentKey = match[1].trim()
        currentContent = match[2] ? [match[2].trim()] : []
      } else if (currentKey) {
        currentContent.push(line)
      }
    }
    commitSection()
    return details
  } catch (error) {
    console.error("Error parsing details:", error)
    detailPanel.innerHTML = `<div class="detail-error-message"><p>Could not load details.</p><p>${(error as Error).message}</p></div>`
    return null
  }
}

function renderDetailPanel(activityId: string | null) {

  ;(window as any).renderDetailPanel = renderDetailPanel;

  try { console.log("[DIAG E] renderDetailPanel enter", { activityId }); } catch {}
if (!activityId) {
    detailPanel.innerHTML = `<div class="detail-placeholder"><p>Select an activity to see the details.</p></div>`
    return
  }

  const activity = appState.activities.find((a) => a.id === activityId)
  if (!activity) {
    console.error("Selected activity not found:", activityId)
    return
  }
  try { console.log("[DIAG E1] call getAndParseDetails", { category: activity.category, number: activity.number }); } catch {}


  getAndParseDetails(activity).then((details) => {
    if (!details) return

    const completion = appState.completions[activity.id] || { completedLevels: {} }

    const prepTime = details["준비시간"] as string
    const playTime = details["놀이 시간"] as string
    delete details["준비시간"]
    delete details["놀이 시간"]

    const timeInfoHtml =
      prepTime || playTime
        ? `
        <div class="detail-time-info">
            ${prepTime ? `<span><strong>준비시간:</strong> ${prepTime.replace("준비시간:", "").trim()}</span>` : ""}
            ${playTime ? `<span><strong>놀이 시간:</strong> ${playTime.replace("놀이 시간:", "").trim()}</span>` : ""}
        </div>
    `
        : ""

    const detailSectionsHtml = Object.entries(details)
      .map(([key, value]) => {
        if (key === "Number") return ""

        let valueHtml = ""
        if (key === "놀이 난이도 조절") {
          const levelsData = value as { [level: number]: string }
          if (typeof levelsData !== "object" || Object.keys(levelsData).length === 0) return ""

          valueHtml =
            '<ul class="levels-list">' +
            Object.entries(levelsData)
              .map(([levelNum, desc]) => {
                const level = Number.parseInt(levelNum, 10)
                const isCompleted = !!completion.completedLevels[level]
                return `
                    <li class="level-item">
                        <button class="level-toggle-btn ${isCompleted ? "completed" : ""}" data-level="${level}" aria-label="Toggle level ${level}">
                            ${isCompleted ? "✓" : ""}
                        </button>
                        <div class="level-description">
                            <strong>Level ${level}</strong>
                            <span>${desc}</span>
                        </div>
                    </li>`
              })
              .join("") +
            "</ul>"
        } else {
          valueHtml = `<p>${String(value).replace(/\n/g, "<br>")}</p>`
        }

        return `<div class="detail-section"><h3>${key}</h3>${valueHtml}</div>`
      })
      .join("")

    detailPanel.innerHTML = `
        <div class="detail-content">
            <div class="detail-header-compact">
                <h2 class="detail-title-compact">${activity.titleKr}</h2>
                <p class="detail-subtitle">${activity.ageRange} months</p>
            </div>
            ${timeInfoHtml}
            <hr>
            <div class="detail-body">
                ${detailSectionsHtml || "<p>No detailed information available.</p>"}
            </div>
        </div>`

    detailPanel.querySelectorAll(".level-toggle-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const level = Number.parseInt((e.currentTarget as HTMLElement).dataset.level!, 10)
        handleLevelToggle(activity.id, level)
      })
    })
  })
}

function updateChildInfoDisplay() {
  if (appState.childInfo) {
    const dob = new Date(appState.childInfo.dob)
    const ageInMonths = (new Date().getFullYear() - dob.getFullYear()) * 12 + (new Date().getMonth() - dob.getMonth())
    childBioInfo.textContent = `${appState.childInfo.name} (Age: ${ageInMonths.toFixed(1)}m)`

    const overallDevAge = getOverallDevelopmentalAge()
    childDevAge.innerHTML = `<strong>발달 나이: ${overallDevAge.toFixed(1)}개월</strong>`

    updateCategoryDevAgeDisplay()
  }
}

function updateCategoryDevAgeDisplay() {
  if (appState.selectedCategory) {
    const categoryAge = getCategoryDevelopmentalAge(appState.selectedCategory)
    categoryDevAge.innerHTML = `<strong>${appState.selectedCategory} 나이: ${categoryAge.toFixed(1)}개월</strong>`
    categoryDevAge.style.visibility = "visible"
  } else {
    categoryDevAge.style.visibility = "hidden"
  }
}

// --- Event Handlers & User Actions ---
function selectTab(tabName: string) {
  appState.selectedTab = tabName

  document.querySelectorAll(".category-tab-button").forEach((tab) => {
    tab.classList.toggle("active", (tab as HTMLElement).dataset.tab === tabName)
  })

  if (tabName === "Graph") {
    appState.selectedCategory = null // Deselect category when viewing graphs
    activityView.classList.add("hidden")
    graphView.classList.remove("hidden")
    updateCategoryDevAgeDisplay()
    renderAllGraphs() // Ensure graphs are up-to-date when shown
  } else {
    appState.selectedCategory = tabName
    activityView.classList.remove("hidden")
    graphView.classList.add("hidden")

    renderActivities(tabName)

    const activity = appState.activities.find((a) => a.id === appState.selectedActivityId)
    if (!activity || activity.category !== tabName) {
      appState.selectedActivityId = null
      renderDetailPanel(null)
    } else {
      // Re-highlight if it's in the current view
      const item = contentDiv.querySelector(`.activity-item[data-activity-id="${appState.selectedActivityId}"]`)
      if (item) item.classList.add("selected")
    }
    updateCategoryDevAgeDisplay()
  }
  saveState()
}

function selectActivity(activityId: string) {
  appState.selectedActivityId = activityId

  document.querySelectorAll(".activity-item").forEach((item) => {
    item.classList.toggle("selected", (item as HTMLElement).dataset.activityId === activityId)
  })

  renderDetailPanel(activityId)
  saveState()
}

function handleLevelToggle(activityId: string, level: number) {
  if (!appState.completions[activityId]) {
    appState.completions[activityId] = { completedLevels: {} }
  }
  const completion = appState.completions[activityId]
  const isCompleted = !!completion.completedLevels[level]

  const currentHighestLevel = Math.max(0, ...Object.keys(completion.completedLevels).map(Number))

  if (isCompleted) {
    // --- Toggling OFF ---
    if (level === currentHighestLevel) {
      showConfirmation(
        "Confirm Change",
        "Un-completing the highest achieved level will recalculate the developmental age. Are you sure?",
        () => {
          delete completion.completedLevels[level]
          performUpdateSequence(activityId)
        },
      )
    } else {
      delete completion.completedLevels[level]
      // No recalculation needed, just UI refresh
      renderDetailPanel(activityId)
      if (appState.selectedCategory) renderActivities(appState.selectedCategory)
      saveState()
    }
  } else {
    // --- Toggling ON ---
    completion.completedLevels[level] = new Date().toISOString()
    if (level > currentHighestLevel) {
      performUpdateSequence(activityId)
    } else {
      // No recalculation needed, just UI refresh
      renderDetailPanel(activityId)
      if (appState.selectedCategory) renderActivities(appState.selectedCategory)
      saveState()
    }
  }
}

function performUpdateSequence(activityId: string) {
  const activity = appState.activities.find((a) => a.id === activityId)
  if (!activity) return
  
  recalculateSingleCategoryDevelopmentalAge(activity.category)

  updateChildInfoDisplay()
  renderAllGraphs()
  renderDetailPanel(activityId)
  if (appState.selectedCategory) {
    renderActivities(appState.selectedCategory)
  }
  saveState()
}

function setupEventListeners() {
  registrationForm.addEventListener("submit", (e) => {
    e.preventDefault()
    appState.childInfo = { name: childNameInput.value, dob: childDobInput.value }
    saveState()
    startApp()
  })

  continueBtn.addEventListener("click", startApp)

  resetBtn.addEventListener("click", () => {
    showConfirmation("Start New Profile?", "This will erase the current child's data and start over.", () => {
      localStorage.removeItem("komensky_app_state")
      window.location.reload()
    })
  })

  settingsBtn.addEventListener("click", () => {
    if (appState.childInfo) {
      settingsChildNameInput.value = appState.childInfo.name
      settingsChildDobInput.value = appState.childInfo.dob
    }
    settingsModal.classList.remove("hidden")
  })

  closeSettingsBtn.addEventListener("click", () => {
    settingsModal.classList.add("hidden")
    settingsFeedbackDiv.innerHTML = ""
    settingsFeedbackDiv.className = "feedback-message"
  })

  saveSettingsBtn.addEventListener("click", () => {
    if (appState.childInfo) {
      appState.childInfo.name = settingsChildNameInput.value
      appState.childInfo.dob = settingsChildDobInput.value
      saveState()
      updateChildInfoDisplay()
      showFeedback("Child info updated!", "success", "settings-feedback")
    }
  })

  resetAppDataBtn.addEventListener("click", () => {
    showConfirmation("Reset All App Data?", "This will permanently delete everything. Are you sure?", () => {
      localStorage.clear()
      window.location.reload()
    })
  })

  document.getElementById("clear-all-records-btn")?.addEventListener("click", () => {
    showConfirmation(
      "모든 놀이 기록 삭제",
      "모든 놀이 기록을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.",
      () => {
        // Call the settings dialog's clear function
        const event = new CustomEvent("clearAllRecords")
        document.dispatchEvent(event)
      },
    )
  })

  saveSnapshotBtn.addEventListener("click", handleSaveSnapshot)
  generateTestDataBtn.addEventListener("click", handleGenerateTestData)

  // Graph tab switching (within graph panel)
  document.querySelectorAll(".graph-tab-button").forEach((button) => {
    button.addEventListener("click", (e) => {
      const targetGraph = (e.currentTarget as HTMLElement).dataset.graph
      document.querySelectorAll(".graph-tab-button").forEach((btn) => btn.classList.remove("active"))
      ;(e.currentTarget as HTMLElement).classList.add("active")
      if (targetGraph === "radar") {
        document.getElementById("radar-chart-container")?.classList.remove("hidden")
        document.getElementById("time-axis-chart-container")?.classList.add("hidden")
        document.getElementById("time-scale-controls")?.classList.add("hidden")
      } else {
        document.getElementById("radar-chart-container")?.classList.add("hidden")
        document.getElementById("time-axis-chart-container")?.classList.remove("hidden")
        document.getElementById("time-scale-controls")?.classList.remove("hidden")
      }
    })
  })

  document.querySelectorAll(".time-scale-button").forEach((button) => {
    button.addEventListener("click", (e) => {
      const scale = (e.currentTarget as HTMLElement).dataset.scale
      document.querySelectorAll(".time-scale-button").forEach((btn) => btn.classList.remove("active"))
      ;(e.currentTarget as HTMLElement).classList.add("active")
      if (scale) updateTimeAxisChartScale(scale)
    })
  })

  window.addEventListener("recalculateCategory", (event: CustomEvent<RecalculateCategoryDetail>) => {
    const { category } = event.detail
    console.log(`[v0] SYNC_UPDATE: Received recalculation event for category: ${category}`)

    const categoryRecord = loadCategoryRecord(category)
    if (categoryRecord) {
      console.log(`[v0] SYNC_UPDATE: Processing ONLY ${category} category`)

      // 메인 시스템의 developmentalAges 업데이트
      const categoryAge = categoryRecord.categoryDevelopmentalAge
      if (!appState.developmentalAges[category]) {
        appState.developmentalAges[category] = [0, 0, 0]
      }

      // 카테고리 발달 나이를 3개 슬롯에 복사 (레거시 호환)
      appState.developmentalAges[category] = [categoryAge, categoryAge, categoryAge]

      console.log(`[v0] SYNC_UPDATE: Updated ONLY ${category} developmental age: ${categoryAge}`)

      // UI 즉시 업데이트
      updateChildInfoDisplay()
      console.log(`[v0] SYNC_UPDATE: UI state updated for ${category} only`)

      // 상태 저장
      saveState()
    } else {
      console.error(`[v0] SYNC_UPDATE: Failed to load category record for ${category}`)
    }
  })
}

// --- Developmental Age Calculation ---
function recalculateSingleCategoryDevelopmentalAge(targetCategory: string) {
  console.log(`[v0] CATEGORY_INDEPENDENCE: Recalculating ONLY ${targetCategory} category`)

  const categoryCompletionEvents: { date: Date; age: number }[] = []

  for (const activityId in appState.completions) {
    const activity = appState.activities.find((a) => a.id === activityId)
    if (!activity || activity.category !== targetCategory) continue

    const completion = appState.completions[activityId]
    for (const level in completion.completedLevels) {
      categoryCompletionEvents.push({
        date: new Date(completion.completedLevels[level]),
        age: activity.startAge,
      })
    }
  }

  categoryCompletionEvents.sort((a, b) => a.date.getTime() - b.date.getTime())

  const finalCompletedAges = categoryCompletionEvents.map((e) => e.age).sort((a, b) => b - a)
  const top3Final = finalCompletedAges.slice(0, 3)
  while (top3Final.length < 3) top3Final.push(0)
  appState.developmentalAges[targetCategory] = top3Final

  console.log(
    `[v0] CATEGORY_INDEPENDENCE: Updated ${targetCategory} developmental age to ${getCategoryDevelopmentalAge(targetCategory).toFixed(1)}m`,
  )
}

function getOverallDevelopmentalAge(): number {
  const categoryAges = PLAY_CATEGORIES.map((category) => getCategoryDevelopmentalAge(category))
  const sum = categoryAges.reduce((acc, age) => acc + age, 0)
  const average = sum / PLAY_CATEGORIES.length // Always divide by 7

  return average
}

function getCategoryDevelopmentalAge(category: string): number {
  const ages = appState.developmentalAges[category]
  if (!ages || ages.length === 0) return 0
  const validAges = ages.filter((age) => age > 0)
  if (validAges.length === 0) return 0
  return validAges.reduce((sum, age) => sum + age, 0) / validAges.length
}

// --- Graphing ---
function renderAllGraphs() {
  renderRadarChart()
  renderTimeAxisChart()
}

function renderRadarChart() {
  const ctx = (document.getElementById("radar-chart") as HTMLCanvasElement)?.getContext("2d");
  if (!ctx) return;

  if (radarChart) radarChart.destroy();

  const labels = PLAY_CATEGORIES;
  const data = labels.map((category) => getCategoryDevelopmentalAge(category));

  radarChart = new Chart(ctx, {
    type: "radar",
    data: {
      labels,
      datasets: [
        {
          label: "Developmental Age (months)",
          data,
          backgroundColor: "rgba(74, 144, 226, 0.2)",
          borderColor: "rgba(74, 144, 226, 1)",
          pointBackgroundColor: "rgba(74, 144, 226, 1)",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          suggestedMin: 0,
          suggestedMax: 12,
          ticks: { stepSize: 2 },
        },
      },
      plugins: {
        legend: { position: "top" },
        tooltip: {
          callbacks: {
            label: (context: TooltipItem<"radar">) => {
              const label = context.dataset?.label ?? "";
              const r =
                typeof context.parsed?.r === "number"
                  ? context.parsed.r
                  : Number(context.formattedValue ?? 0);
              return `${label}: ${r.toFixed(1)}m`;
            },
          },
        },
      }, // ← 여기 } 누락되어 있었음
    },   // ← options 닫힘
  });    // ← Chart 생성자 닫힘
}


function renderTimeAxisChart() {
  const ctx = (document.getElementById("time-axis-chart") as HTMLCanvasElement)?.getContext("2d")
  if (!ctx) return
  if (timeAxisChart) timeAxisChart.destroy()

  const colors = ["#4A90E2", "#50E3C2", "#F5A623", "#F8E71C", "#BD10E0", "#9013FE", "#D0021B"]

  const datasets: any[] = PLAY_CATEGORIES// List render — each item must have stable key
.map((category, index) => ({
    label: category,
    data: [], // Empty data since we removed history tracking
    borderColor: colors[index % colors.length],
    tension: 0.1,
    fill: false,
  }))

  datasets.push({
    label: "Overall Dev. Age",
    data: [], // Empty data since we removed history tracking
    borderColor: "#333333",
    tension: 0.1,
    fill: false,
    borderDash: [5, 5],
    pointRadius: 0,
  })

  timeAxisChart = new Chart(ctx, {
    type: "line",
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { type: "time", time: { unit: "month" }, title: { display: true, text: "Date" } },
        y: { title: { display: true, text: "Dev. Age (months)" }, beginAtZero: true },
      },
      plugins: { legend: { position: "bottom" }, tooltip: { mode: "index", intersect: false } },
    },
  })
  updateTimeAxisChartScale("6y")
}

function updateTimeAxisChartScale(scale: string) {
  if (!timeAxisChart) return
  const now = new Date()
  let minDate = new Date()
  switch (scale) {
    case "1w":
      minDate.setDate(now.getDate() - 7)
      break
    case "1m":
      minDate.setMonth(now.getMonth() - 1)
      break
    case "6m":
      minDate.setMonth(now.getMonth() - 6)
      break
    case "1y":
      minDate.setFullYear(now.getFullYear() - 1)
      break
    case "3y":
      minDate.setFullYear(now.getFullYear() - 3)
      break
    case "6y":
      minDate.setFullYear(now.getFullYear() - 6)
      break
    default:
      if (appState.childInfo) minDate = new Date(appState.childInfo.dob)
      else minDate.setFullYear(now.getFullYear() - 6)
      break
  }
  timeAxisChart.options.scales.x.min = minDate.getTime()
  timeAxisChart.options.scales.x.max = now.getTime()
  timeAxisChart.update()
}

// --- Snapshot Management ---
function handleSaveSnapshot() {
  const name = snapshotNameInput.value.trim()
  if (!name) {
    showFeedback("Please enter a name.", "error", "settings-feedback")
    return
  }
  const snapshot: Snapshot = {
    name: name,
    date: new Date().toISOString(),
    data: JSON.parse(JSON.stringify(appState)),
  }
  appState.snapshots.push(snapshot)
  snapshotNameInput.value = ""
  renderSnapshots()
  saveState()
  showFeedback("Snapshot saved!", "success", "settings-feedback")
}

function renderSnapshots() {
  if (appState.snapshots.length === 0) {
    snapshotListContainer.innerHTML = "<p>No snapshots saved.</p>"
    snapshotListUl.classList.add("hidden")
  } else {
    snapshotListContainer.innerHTML = ""
    snapshotListUl.classList.remove("hidden")
    snapshotListUl.innerHTML = ""
    appState.snapshots.forEach((snapshot, index) => {
      const li = document.createElement("li")
      li.className = "snapshot-item"
      li.innerHTML = `
                <div class="snapshot-item-info">
                    <span class="snapshot-name">${snapshot.name}</span>
                    <span class="snapshot-date">${new Date(snapshot.date).toLocaleString()}</span>
                </div>
                <div class="snapshot-item-actions">
                    <button class="secondary-btn" data-index="${index}">Load</button>
                    <button class="secondary-btn danger" data-index="${index}">Delete</button>
                </div>`
      snapshotListUl.appendChild(li)
    })
    snapshotListContainer.appendChild(snapshotListUl)

    snapshotListUl.querySelectorAll(".secondary-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const index = Number.parseInt((e.target as HTMLElement).dataset.index!, 10)
        if ((e.target as HTMLElement).classList.contains("danger")) {
          handleDeleteSnapshot(index)
        } else {
          handleLoadSnapshot(index)
        }
      })
    })
  }
}

function handleLoadSnapshot(index: number) {
  showConfirmation(
    "Load Snapshot?",
    `This will overwrite current progress with data from "${appState.snapshots[index].name}".`,
    () => {
      appState = JSON.parse(JSON.stringify(appState.snapshots[index].data))
      saveState()
      window.location.reload()
    },
  )
}

function handleDeleteSnapshot(index: number) {
  showConfirmation("Delete Snapshot?", `Permanently delete snapshot "${appState.snapshots[index].name}"?`, () => {
    appState.snapshots.splice(index, 1)
    renderSnapshots()
    saveState()
    showFeedback("Snapshot deleted.", "success", "settings-feedback")
  })
}

// --- Test Data Generation ---
function handleGenerateTestData() {
  console.log("[v0] Starting test data generation...")
  generateAndLoadTestData()
}

function generateAndLoadTestData() {
  if (!appState.childInfo) {
    showFeedback("Please set child's info first.", "error", "settings-feedback")
    return
  }

  console.log("[v0] CATEGORY_INDEPENDENCE: Clearing category records cache")

  // Clear all existing records first
  console.log("[v0] Clearing all play records...")
  PLAY_CATEGORIES.forEach((category) => {
    localStorage.removeItem(`komensky_records_${category}`)
    console.log(`[v0] Cleared komensky_records_${category}`)
  })

  // Clear top achievements
  localStorage.removeItem("komensky_top_achievements")
  console.log("[v0] Cleared top achievements")

  // Clear category records
  PLAY_CATEGORIES.forEach((category) => {
    localStorage.removeItem(`komensky_category_record_${category}`)
    console.log(`[v0] Cleared category record for ${category}`)
  })

  const dob = new Date(appState.childInfo.dob)
  const today = new Date()
  const completions: { [activityId: string]: Completion } = {}

  const generationSummary: { [category: string]: number } = {}

  PLAY_CATEGORIES.forEach((category) => {
    const categoryActivities = appState.activities.filter((a) => a.category === category)
    if (categoryActivities.length === 0) return

    const shuffled = [...categoryActivities].sort(() => 0.5 - Math.random())
    const selected = shuffled.slice(0, shuffled.length)
    const activitiesWithLevels = selected
      // List render — each item must have stable key
.map((act) => ({
        activity: act,
        level: Math.floor(Math.random() * 5) + 1,
      }))
      .sort((a, b) => a.activity.startAge - b.activity.startAge)

    const randomDates: Date[] = []
    const timeRange = today.getTime() - dob.getTime()
    for (let i = 0; i < activitiesWithLevels.length; i++) {
      randomDates.push(new Date(dob.getTime() + Math.random() * timeRange))
    }
    randomDates.sort((a, b) => a.getTime() - b.getTime())

    activitiesWithLevels.forEach(({ activity, level }, index) => {
      if (!completions[activity.id]) {
        completions[activity.id] = { completedLevels: {} }
      }
      completions[activity.id].completedLevels[level] = randomDates[index].toISOString()
    })

    console.log(`[v0] Generated ${selected.length} test data entries for ${category}`)
    generationSummary[category] = selected.length
  })

  appState.completions = completions

  PLAY_CATEGORIES.forEach((category) => {
    recalculateSingleCategoryDevelopmentalAge(category)
  })

  saveState()

  updateChildInfoDisplay()
  if (appState.selectedCategory) renderActivities(appState.selectedCategory)
  renderDetailPanel(appState.selectedActivityId)
  renderAllGraphs()

  const summaryText = Object.entries(generationSummary)
    .map(([category, count]) => `${category}: ${count}개`)
    .join("\n")

  const popup = document.createElement("div")
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 2px solid #4A90E2;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    text-align: center;
    font-family: Arial, sans-serif;
  `
  popup.innerHTML = `
    <h3 style="margin: 0 0 10px 0; color: #4A90E2;">테스트 데이터 생성 완료!</h3>
    <pre style="margin: 0; font-size: 14px; line-height: 1.4;">${summaryText}</pre>
  `

  document.body.appendChild(popup)

  setTimeout(() => {
    document.body.removeChild(popup)
  }, 3000)

  showFeedback("Test data generated successfully!", "success", "settings-feedback")
}

// --- UI Helpers ---
function showFeedback(message: string, type: "success" | "error", elementId: string) {
  const feedbackDiv = document.getElementById(elementId)
  if (!feedbackDiv) return
  feedbackDiv.textContent = message
  feedbackDiv.className = `feedback-message ${type}`
  setTimeout(() => {
    feedbackDiv.className = "feedback-message"
  }, 4000)
}

function showConfirmation(title: string, message: string, onConfirm: () => void) {
  confirmTitle.textContent = title
  confirmMessage.textContent = message

  const onOk = () => {
    onConfirm()
    cleanup()
  }
  const onCancel = () => cleanup()
  const cleanup = () => {
    confirmOkBtn.removeEventListener("click", onOk)
    confirmCancelBtn.removeEventListener("click", onCancel)
    confirmModal.classList.add("hidden")
  }

  confirmOkBtn.onclick = onOk
  confirmCancelBtn.onclick = onCancel
  confirmModal.classList.remove("hidden")
}

// --- App Entry Point ---
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await initializeCategories()

    // 기존 상태 로드 시도
    const hasExistingState = loadState()

    if (hasExistingState && appState.childInfo) {
      returningChildName.textContent = appState.childInfo.name
      returningUserView.classList.remove("hidden")
      newUserView.classList.add("hidden")
    } else {
      returningUserView.classList.add("hidden")
      newUserView.classList.remove("hidden")
    }

    // 나머지 초기화 진행
    await initializeApp()
  } catch (error) {
    console.error("Failed to initialize app:", error)
    document.body.innerHTML = `<div style="padding: 20px; color: red;"><h2>Initialization Error</h2><p>Could not initialize the application. Please check the console for details.</p><pre>${error}</pre></div>`
  }
})
