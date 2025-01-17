/* eslint-disable camelcase */
import * as utils from '../common/utils'
import * as lang from './lang'
import { fetchSSE } from './utils'

export type TranslateMode = 'translate' | 'polishing' | 'summarize' | 'analyze' | 'explain-code'
export type Provider = 'OpenAI' | 'Azure'
export type APIModel = 'gpt-3.5-turbo' | 'gpt-3.5-turbo-0301' | 'gpt-4' | 'gpt-4-0314' | 'gpt-4-32k' | 'gpt-4-32k-0314'

export interface TranslateQuery {
    text: string
    augment: string
    selectedWord: string
    detectFrom: string
    detectTo: string
    mode: string
    onMessage: (message: { content: string; role: string }) => void
    onError: (error: string) => void
    onFinish: (reason: string) => void
    signal: AbortSignal
}

export interface TranslateResult {
    text?: string
    from?: string
    to?: string
    error?: string
}




export async function translate(query: TranslateQuery) {
    const trimFirstQuotation = !query.selectedWord
    const settings = await utils.getSettings()
    const mode = utils.lookupAction(settings.actions, query.mode)
    if(mode < 0){
        console.log("Bad Command")
        return
    }
    console.log("Command:")
    console.log(settings.actions[mode])
    let systemPrompt = utils.getPrompt(settings.actions[mode])
    let assistantPrompt = utils.getAssistantPrompt(settings.actions[mode])
    assistantPrompt = query.augment
    systemPrompt = systemPrompt
    systemPrompt = systemPrompt.replace(
        /\{toLanguage\}/, lang.langMap.get(query.detectTo) || query.detectTo)
    systemPrompt = systemPrompt.replace(
        /\{fromLanguage\}/, lang.langMap.get(query.detectFrom) || query.detectFrom)
    let usr = `\n${query.text}\n`
    if(assistantPrompt.length > 0)
        usr += `${assistantPrompt}`
    const msg = [{role: 'system', content: systemPrompt}, { role: 'user', content: `"${usr}"` }]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {
        model: settings.apiModel,
        temperature: Number(settings.temperature),
        max_tokens: Number(settings.max_tokens),
        top_p: Number(settings.top_p),
        frequency_penalty: Number(settings.frequency_penalty),
        presence_penalty: Number(settings.presence_penalty),
        messages: msg,
        stream: true,
    }
    const apiKey = settings.apiKeys
    const headers: Record<string, any> = {
        'Content-Type': 'application/json',
    }

    switch (settings.provider) {
        case 'OpenAI':
            headers['Authorization'] = `Bearer ${apiKey}`
            break

        case 'Azure':
            headers['api-key'] = `${apiKey}`
            body[
                'prompt'
            ] = `<|im_start|>system\n${systemPrompt}\n<|im_end|>\n<|im_start|>user\n${assistantPrompt}\n${query.text}\n<|im_end|>\n<|im_start|>assistant\n`
            body['stop'] = ['<|im_end|>']
            break
    }
    console.log("Send Request")
    console.log(body)

    let isFirst = true

    // query.onMessage({ content: "#### Return\n", role:""})
    // return ""
    await fetchSSE(`${settings.apiURL}${settings.apiURLPath}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: query.signal,
        onMessage: (msg) => {
            let resp
            try {
                resp = JSON.parse(msg)
                // eslint-disable-next-line no-empty
            } catch {
                query.onFinish('stop')
                return
            }
            const { choices } = resp
            if (!choices || choices.length === 0) {
                return { error: 'No result' }
            }
            const { finish_reason: finishReason } = choices[0]
            if (finishReason) {
                query.onFinish(finishReason)
                return
            }
            let targetTxt = ''
            switch (settings.provider) {
                case 'OpenAI': {
                    const { content = '', role } = choices[0].delta
                    targetTxt = content

                    if (trimFirstQuotation && isFirst && targetTxt && ['“', '"', '「'].indexOf(targetTxt[0]) >= 0) {
                        targetTxt = targetTxt.slice(1)
                    }

                    if (!role) {
                        isFirst = false
                    }
                    query.onMessage({ content: targetTxt, role })
                    break
                }
                case 'Azure':
                    targetTxt = choices[0].text
                    console.log(resp)

                    if (trimFirstQuotation && isFirst && targetTxt && ['“', '"', '「'].indexOf(targetTxt[0]) >= 0) {
                        targetTxt = targetTxt.slice(1)
                    }
                    
                    query.onMessage({ content: targetTxt, role: '' })
                    break
            }
        },
        onError: (err) => {
            const { error } = err
            query.onError(error.message)
        },
    })
}
