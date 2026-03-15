import { DONE_TOKEN } from '../bots/templates'
import {
    ResponseParser,
    LlmCallbackMap,
    ParsedResponse,
    SendMessage,
    LmmCallbackResponse,
} from '../llm.types'
import validateAndNormalizeCallbackOptions from './validateAndNormalizeCallbackOptions'

export default class ResponseParserV2 implements ResponseParser {
    public async parse(
        response: string,
        callbacks?: LlmCallbackMap
    ): Promise<ParsedResponse> {
        let message: string | null = response.replace(DONE_TOKEN, '').trim()
        let state: Record<string, any> | undefined = undefined
        let callbackResults: SendMessage | undefined = undefined
        const hasCallbacks =
            message.includes('@callback') ||
            (callbacks != null &&
                Object.keys(callbacks).some((name) =>
                    message!.includes(`@${name}`)
                ))

        if (hasCallbacks) {
            const { callbackResults: c, message: m } =
                await this.invokeCallbacks(message, callbacks)
            callbackResults = c
            message = m
        }

        const hasState = response.includes('@updateState')
        if (hasState && message) {
            const stateMatch = message.match(/@updateState\s+({[\s\S]*?})\n?/)
            if (stateMatch && stateMatch[1]) {
                try {
                    state = JSON.parse(stateMatch[1])
                } catch (err) {
                    if (!callbackResults) {
                        callbackResults = ''
                    }
                    callbackResults += this.renderCallbackResults({
                        error: err,
                        name: 'updateState',
                    })
                }
                message = message.replace(stateMatch[0], '').trim()
            }
        }

        return {
            isDone: response.includes(DONE_TOKEN),
            message,
            callbackResults,
            state,
        }
    }

    private async invokeCallbacks(
        message: string,
        callbacks: LlmCallbackMap | undefined
    ): Promise<{
        callbackResults: SendMessage | undefined
        message: string | null
    }> {
        let callbackStrippedMessage = message
        let callbackResults = ''

        const reserved = new Set(['updateState', 'results'])
        const matches = [...message.matchAll(/^@(\w+)\s+({.*})$/gm)]
        for (const match of matches) {
            if (reserved.has(match[1])) {
                continue
            }
            const parsed = JSON.parse(match[2])
            const isCanonical = match[1] === 'callback'
            const name = isCanonical ? parsed.name : match[1]
            const options = isCanonical ? parsed.options : parsed
            const callback = callbacks?.[name]

            if (!isCanonical && !callback) {
                continue
            }

            const parts = callbackStrippedMessage.split(match[0])
            callbackStrippedMessage = parts
                .map((s) => s.trim())
                .join('')
                .trim()

            try {
                if (callback?.parameters) {
                    validateAndNormalizeCallbackOptions(
                        callback.parameters,
                        options
                    )
                }

                const results = await callback?.cb(options)

                callbackResults += this.renderCallbackResults({ name, results })
            } catch (err) {
                callbackResults += this.renderCallbackResults({
                    name,
                    error: err,
                })
            }
        }

        callbackResults = callbackResults.trim()
        return {
            callbackResults,
            message:
                callbackStrippedMessage.length > 0
                    ? callbackStrippedMessage
                    : null,
        }
    }

    private renderCallbackResults(callbackOptions: {
        name: any
        results?: LmmCallbackResponse | undefined
        error?: any
    }) {
        return `@results ${JSON.stringify(callbackOptions)}\n`
    }

    public getStateUpdateInstructions(): string {
        return 'Updating state works similar to all function calls. Use the following syntax:\n@updateState { "updates": "here" }\n. Make sure to json encode only the fields you want to change. You can update state once and do it at the end of any messages you send. IMPORTANT: JSON must be on a single line. Do NOT use multi-line or formatted JSON.'
    }

    public getFunctionCallInstructions(): string {
        return `A function call is done using the following syntax:\n@callback { "name": "callbackName", "options": {} }\nMake sure to json encode the options and include the name of the callback you want to call. You can call as many callbacks as you want in a single response by including multiple @callback lines. IMPORTANT: JSON must be on a single line. Do NOT use multi-line or formatted JSON. Also, do NOT call something like @myCallback. You would call it like this: @callback { "name": "myCallback", "options": {} }`
    }
}

export type ParserCallbackStyle = '@callback' | '@functionCall'
