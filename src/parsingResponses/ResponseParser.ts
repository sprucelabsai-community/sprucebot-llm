import { DONE_TOKEN, STATE_BOUNDARY } from '../bots/templates'
import { LlmCallbackMap } from '../llm.types'
import renderLegacyPlaceholder from './renderPlaceholder'

export default class ResponseParser {
    private static instance: ResponseParser = new ResponseParser()

    public static setInstance(parser: ResponseParser) {
        this.instance = parser
    }

    public static getInstance() {
        return this.instance
    }

    public async parse(
        response: string,
        callbacks?: LlmCallbackMap
    ): Promise<ParsedResponse> {
        let message = response.replace(DONE_TOKEN, '').trim()
        let state: Record<string, any> | undefined
        let callbackResults: string | undefined

        for (const key of Object.keys(callbacks || {})) {
            const match = message.match(renderLegacyPlaceholder(key))

            if (match) {
                message = await this.invokeCallbackAndDropInLegacyResults(
                    callbacks,
                    key,
                    message
                )
            }

            let simpleMatches = message.match(
                new RegExp(`<<\\s*${key}\\s*\/>>`, 'g')
            )

            let data: Record<string, any> | undefined

            if (!simpleMatches) {
                const matchWithJson = message
                    .matchAll(
                        new RegExp(
                            `<<\\s*${key}\\s*>>(.*?)<<\/\\s*${key}\\s*>>`,
                            'gs'
                        )
                    )
                    .next().value

                simpleMatches = matchWithJson?.[0] ? [matchWithJson?.[0]] : null
                data = matchWithJson?.[1]
                    ? JSON.parse(matchWithJson?.[1])
                    : undefined
            }

            if (simpleMatches) {
                callbackResults = await callbacks?.[key]?.cb(data)
                message = message.replace(simpleMatches[0], '').trim()
            }
        }

        const { match, fullMatch } = this.parseState(message)

        if (match && fullMatch) {
            message = message.replace(fullMatch, '').trim()
            state = JSON.parse(match)
        }

        return {
            isDone: this.doesIncludeDoneToken(response),
            state,
            message,
            callbackResults,
        }
    }

    private async invokeCallbackAndDropInLegacyResults(
        callbacks: LlmCallbackMap | undefined,
        key: string,
        message: string
    ) {
        const v = await callbacks?.[key]?.cb()
        message = message.replace(renderLegacyPlaceholder(key), v ?? '').trim()
        return message
    }

    private doesIncludeDoneToken(response: string): boolean {
        return response.includes(DONE_TOKEN)
    }

    private parseState(message: string) {
        const ESCAPED_BOUNDARY = STATE_BOUNDARY.replace(
            /[-[\]{}()*+?.,\\^$|#\s]/g,
            '\\$&'
        )
        const searchRegex = new RegExp(
            `${ESCAPED_BOUNDARY}(.*?)${ESCAPED_BOUNDARY}`
        )
        const stateMatches = message.match(searchRegex)
        const match = stateMatches?.[1]

        return { match, fullMatch: stateMatches?.[0] }
    }
}
export interface ParsedResponse {
    isDone: boolean
    state?: Record<string, any>
    message: string
    callbackResults?: string
}
