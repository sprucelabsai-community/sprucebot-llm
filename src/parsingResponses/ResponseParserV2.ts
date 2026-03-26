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
            callbacks != null &&
            Object.keys(callbacks).some((name) =>
                message!.includes(`@${name}(`)
            )

        if (hasCallbacks) {
            const { callbackResults: c, message: m } =
                await this.invokeCallbacks(message, callbacks)
            callbackResults = c
            message = m
        }

        const hasState = response.includes('@updateState')
        if (hasState && message) {
            const stateMatches = [
                ...message.matchAll(/@updateState\(({[\s\S]*?})\)\n?/g),
            ]
            for (const stateMatch of stateMatches) {
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
        const matches = [...message.matchAll(/^@(\w+)\(({.*})?\)$/gm)]
        for (const match of matches) {
            if (reserved.has(match[1])) {
                continue
            }
            const parsed = match[2] ? JSON.parse(match[2]) : undefined
            const name = match[1]
            const options = parsed
            const callback = callbacks?.[name]

            if (!callback) {
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
        name: string
        results?: LmmCallbackResponse | undefined
        error?: any
    }) {
        return `@results ${JSON.stringify(callbackOptions)}\n`
    }

    public getStateUpdateInstructions(): string {
        return `Updating state works similar to all function calls. Use the following syntax:
@updateState({ "field1": "value1", "field2": "value2" })
Make sure to json encode only the fields you want to change. You can update state once and do it at the end of any messages you send. IMPORTANT: JSON must be on a single line. Do NOT use multi-line or formatted JSON.
Your user-facing message is always sent to the user, even if @updateState fails. If @updateState fails later, do not repeat the same message. Only send the specific @updateState needed to fix the missing state change.
Good example:
@updateState({ "favoriteColor": "blue", "firstName": "Taylor" })
Bad examples:
@updateState
{ "favoriteColor": "blue" }
@updateState({
  "favoriteColor": "blue"
})
@updateState({ favoriteColor: "blue" })`
    }

    public getFunctionCallInstructions(): string {
        return `A function call is done using the following syntax:
@callbackName({ "key": "value" })
Make sure to json encode the options. You can call as many callbacks as you want in a single response by including multiple @functionName() lines. IMPORTANT: JSON must be on a single line. Do NOT use multi-line or formatted JSON.
Your user-facing message is always sent to the user, even if a callback fails. Successful callbacks have already run successfully. If a callback fails later, do not repeat the same message and do not repeat successful callbacks. Only call the specific callback needed to fix the failed gap.
Good example:
@lookupWeather({ "zip": "80524" })
Bad examples:
@lookupWeather { "zip": "80524" }
@lookupWeather(
{ "zip": "80524" }
)
@lookupWeather({ zip: "80524" })`
    }
}

export type ParserCallbackStyle = '@callback' | '@functionCall'
