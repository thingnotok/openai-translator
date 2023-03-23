/* eslint-disable @typescript-eslint/no-explicit-any */
import { IBrowser, ISettings } from './types'

export const defaultAPIURL = 'https://api.openai.com'
export const defaultAPIURLPath = '/v1/chat/completions'
export const defaultProvider = 'OpenAI'
export const defaultAPIModel = 'gpt-3.5-turbo'

export const defaultAutoTranslate = false
export const defaultTargetLanguage = 'zh-Hans'
export const defaultAlwaysShowIcons = true

export const defaulti18n = 'en'

export async function getApiKey(): Promise<string> {
    const settings = await getSettings()
    const apiKeys = (settings.apiKeys ?? '').split(',').map((s) => s.trim())
    return apiKeys[Math.floor(Math.random() * apiKeys.length)] ?? ''
}

// In order to let the type system remind you that all keys have been passed to browser.storage.sync.get(keys)
const settingKeys: Record<keyof ISettings, number> = {
    apiKeys: 1,
    apiURL: 1,
    apiURLPath: 1,
    apiModel: 1,
    provider: 1,
    temperature: 1,
    max_tokens: 1,
    top_p: 1,
    frequency_penalty: 1,
    presence_penalty: 1,
    autoTranslate: 1,
    defaultTranslateMode: 1,
    defaultTargetLanguage: 1,
    alwaysShowIcons: 1,
    hotkey: 1,
    ocrHotkey: 1,
    themeType: 1,
    i18n: 1,
    restorePreviousPosition: 1,
    actions: 1
}
export const defaultActions = [
    `[name: 翻譯]
    [systemPrompt: As an experienced English teacher, your task is to translate a given text and provide part of speech and meaning explanations for difficult words in the text, as well as providing English example sentences. Your response should always be presented in 繁體中文. Please provide clear translations of the content, followed by detailed explanations of each word's part of speech and meaning, using examples where appropriate. Additionally, please include relevant grammar explanations that will help the user better understand how to use these words correctly. Please note that you do not need to repeat my original prompt in your response.]
    [assistantPrompt: X:{} are the words I'm curious about. Please also explain them.]
    `,
    `[name: Polishing]
[systemPrompt: As an experienced proofreading expert, please revise the following sentences to improve their clarity, conciseness, and coherence. Your revisions should aim to make each sentence easier to understand while retaining its original meaning. Please note that you may need to rearrange or reword parts of the sentence to achieve this goal. You should also pay attention to grammar, punctuation, and spelling errors as you revise.]
[assistantPrompt: ]
    `,
    `[name: Summarize] 
[systemPrompt: You are a text summarizer, you can only summarize the text, don't interpret it.]
[assistantPrompt: summarize this text in the most concise language and must use {toLanguage} language!]
    `,
    `[name: Analyze] 
[systemPrompt: You are a translation engine and grammar analyzer.]
[assistantPrompt: summarize this text in the most concise language and must use {toLanguage}]
    `,
    `[name: Explain-code], 
[systemPrompt: You are a code explanation engine, you can only explain the code, do not interpret or translate it. Also, please report any bugs you find in the code to the author of the code.]
[assistantPrompt: explain the provided code, regex or script in the most concise language and must use {toLanguage} language! If the content is not code, return an error message. If the code has obvious errors, point them out.]
    `,
    `[name: Ask], 
[systemPrompt: You're an experienced software engineer, your task is to answer my questions. You need to explain the answer and show me step by step how to resolve the given issues.]
[assistantPrompt: ]
    `
]


export async function getSettings(): Promise<ISettings> {
    const browser = await getBrowser()
    const items = await browser.storage.sync.get(Object.keys(settingKeys))

    const settings = items as ISettings
    if (!settings.apiKeys) {
        settings.apiKeys = ''
    }
    if (!settings.apiURL) {
        settings.apiURL = defaultAPIURL
    }
    if (!settings.apiURLPath) {
        settings.apiURLPath = defaultAPIURLPath
    }
    if (!settings.apiModel) {
        settings.apiModel = defaultAPIModel
    }
    if (!settings.provider) {
        settings.provider = defaultProvider
    }
    if (settings.autoTranslate === undefined || settings.autoTranslate === null) {
        settings.autoTranslate = defaultAutoTranslate
    }
    if (!settings.defaultTranslateMode) {
        settings.defaultTranslateMode = 'translate'
    }
    if (!settings.defaultTargetLanguage) {
        settings.defaultTargetLanguage = defaultTargetLanguage
    }
    if (settings.alwaysShowIcons === undefined || settings.alwaysShowIcons === null) {
        settings.alwaysShowIcons = defaultAlwaysShowIcons
    }
    if (!settings.i18n) {
        settings.i18n = defaulti18n
    }
    if (!settings.actions) {
        settings.actions = defaultActions.slice(0)
    }
    return settings
}

export async function setSettings(settings: Partial<ISettings>) {
    const browser = await getBrowser()
    await browser.storage.sync.set(settings)
}

export async function getBrowser(): Promise<IBrowser> {
    if (isElectron()) {
        return (await import('./electron-polyfill')).electronBrowser
    }
    if (isTauri()) {
        return (await import('./tauri-polyfill')).tauriBrowser
    }
    if (isUserscript()) {
        return (await import('./userscript-polyfill')).userscriptBrowser
    }
    return await require('webextension-polyfill')
}

export const isElectron = () => {
    return navigator.userAgent.indexOf('Electron') >= 0
}

export const isTauri = () => {
    return window['__TAURI__' as any] !== undefined
}

export const isDesktopApp = () => {
    return isElectron() || isTauri()
}

export const isUserscript = () => {
    // eslint-disable-next-line camelcase
    return typeof GM_info !== 'undefined'
}

export const isDarkMode = async () => {
    const settings = await getSettings()
    if (settings.themeType === 'followTheSystem') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return settings.themeType === 'dark'
}


export function getName(customAction: string){
    const m = customAction.match(/\[name: (.*?)\]/m)
    return m ? m[1] : ''
}
export function getPrompt(customAction: string){
    const m = customAction.match(/\[systemPrompt: (.*?)\]/m)
    return m ? m[1] : ''
}
export function getAssistantPrompt(customAction: string){
    const m = customAction.match(/\[assistantPrompt: (.*?)\]/m)
    return m ? m[1] : ''
}