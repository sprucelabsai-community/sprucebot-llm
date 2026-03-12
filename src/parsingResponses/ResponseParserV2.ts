import { DONE_TOKEN } from '../bots/templates'
import {
    ResponseParser,
    LlmCallbackMap,
    ParsedResponse,
    SendMessage,
} from '../llm.types'
import validateAndNormalizeCallbackOptions from './validateAndNormalizeCallbackOptions'

export default class ResponseParserV2 implements ResponseParser {
    public async parse(
        response: string,
        callbacks?: LlmCallbackMap
    ): Promise<ParsedResponse> {
        let message = response.replace(DONE_TOKEN, '').trim()
        let state: Record<string, any> | undefined = undefined
        let callbackResults: SendMessage | undefined = undefined

        const hasCallbacks = message.includes('@callback')

        if (hasCallbacks) {
            callbackResults = await this.invokeCallbacks(message, callbacks)
        }

        const hasState = response.includes('@updateState')
        if (hasState) {
            const stateMatch = message.match(/@updateState\s+({[\s\S]*?})\n?/)
            if (stateMatch && stateMatch[1]) {
                state = JSON.parse(stateMatch[1])
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
    ) {
        let callbackResults = ''

        const matches = [...message.matchAll(/^@callback\s+({.*})$/gm)]
        for (const match of matches) {
            const callbackData = match && match[1] ? JSON.parse(match[1]) : null
            const { name, options } = callbackData || {}

            try {
                const callback = callbacks?.[name]

                if (callback?.parameters) {
                    validateAndNormalizeCallbackOptions(
                        callback.parameters,
                        options
                    )
                }

                const results = await callback?.cb(options)

                callbackResults += `@results ${JSON.stringify({
                    name,
                    results,
                })}\n`
            } catch (err) {
                callbackResults += `@results ${JSON.stringify({
                    name,
                    error: err,
                })}\n`
            }
        }

        callbackResults = callbackResults.trim()
        return callbackResults
    }

    public getStateUpdateInstructions(): string {
        return 'Updating state works similar to all function calls. Use the following syntax:\n@updateState { "updates": "here" }\n. Make sure to json encode only the fields you want to change. You can update state once and do it at the end of any messages you send.'
    }

    public getFunctionCallInstructions(): string {
        return `A function call is done using the following syntax:\n@callback { "name": "callbackName", "options": {} }\nMake sure to json encode the options and include the name of the callback you want to call. You can call as many callbacks as you want in a single response by including multiple @callback lines.`
    }
}
