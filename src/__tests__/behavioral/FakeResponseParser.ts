import { generateId } from '@sprucelabs/test-utils'
import SpruceError from '../../errors/SpruceError'
import { ParsedResponse, LlmCallbackMap } from '../../llm.types'
import ResponseParserV1 from '../../parsingResponses/ResponseParserV1'

export default class FakeResponseParser extends ResponseParserV1 {
    public response: Partial<ParsedResponse> = {
        isDone: false,
        state: undefined,
    }
    public lastMessage?: string
    public lastCallbacks?: LlmCallbackMap
    public invalidParseErrorOnNextParse?: string
    public callbackErrorOnNextParse?: string

    public async parse(
        message: string,
        callbacks?: LlmCallbackMap
    ): Promise<ParsedResponse> {
        if (this.invalidParseErrorOnNextParse) {
            const invalidParse = this.invalidParseErrorOnNextParse
            delete this.invalidParseErrorOnNextParse
            throw new SpruceError({
                code: 'INVALID_CALLBACK',
                matchedCallback: generateId(),
                validCallbacks: [],
                friendlyMessage: invalidParse,
            })
        }

        if (this.callbackErrorOnNextParse) {
            delete this.callbackErrorOnNextParse
            throw new SpruceError({
                code: 'CALLBACK_ERROR',
            })
        }

        this.lastMessage = message
        this.lastCallbacks = callbacks

        const results = {
            message,
            isDone: false,
            ...this.response,
        }

        delete this.response.state

        return results as ParsedResponse
    }
}
