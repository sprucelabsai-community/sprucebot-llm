import { DONE_TOKEN, STATE_BOUNDARY } from '../bots/templates'
import { LlmCallbackMap } from '../llm.types'
import renderPlaceholder from './renderPlaceholder'

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

        for (const key of Object.keys(callbacks || {})) {
            const match = message.match(renderPlaceholder(key))

            if (match) {
                message = await this.invokeCallback(callbacks, key, message)
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
        }
    }

    private async invokeCallback(
        callbacks: LlmCallbackMap | undefined,
        key: string,
        message: string
    ) {
        const v = await callbacks?.[key]?.cb()
        message = message.replace(renderPlaceholder(key), v ?? '').trim()
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
}
