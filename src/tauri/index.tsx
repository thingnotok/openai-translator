/* eslint-disable @typescript-eslint/no-non-null-assertion */
import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

import '../i18n.js'
import 'github-markdown-css/github-markdown.css'
import 'highlight.js/styles/github.css'

const root = createRoot(document.getElementById('root')!)

root.render(<App />)
