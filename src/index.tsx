import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { autoApplySavedDesign } from '../lib/ui-design'

// 반드시 React 렌더 전에 동기 적용
autoApplySavedDesign()

const container = document.getElementById('root')!
createRoot(container).render(<App />)