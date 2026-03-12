import { assert } from '@sprucelabs/test-utils'
import { DONE_TOKEN } from '../../../bots/templates'
import {
    LlmCallback,
    LlmCallbackMap,
    ParsedResponse,
    ResponseParser,
} from '../../../llm.types'
import AbstractLlmTest from '../../support/AbstractLlmTest'

export default abstract class AbstractResponseParserTest extends AbstractLlmTest {
    protected parser!: ResponseParser
    protected callbacks: LlmCallbackMap = {}

    protected async assertNotDone(message: string) {
        await this.parsingEquals(message, {
            isDone: false,
            state: undefined,
            message: removeTokens(message),
        })
    }

    protected async parsingEquals(message: string, expected: ParsedResponse) {
        const results = await this.parse(message)
        assert.isEqualDeep(results, { callbackResults: undefined, ...expected })
    }

    protected async assertDone(message: string) {
        await this.parsingEquals(message, {
            isDone: true,
            state: undefined,
            message: removeTokens(message),
        })
    }

    protected async parse(message: string, callbacks?: LlmCallbackMap) {
        return await this.parser.parse(message, callbacks ?? this.callbacks)
    }

    protected abstract generateUpdateStateSchemaSyntax(
        input: Record<string, any>,
        shouldNewlineBoundaries?: boolean
    ): string

    protected setCallback(key: string, callback: LlmCallback) {
        this.callbacks[key] = callback
    }
}

function removeTokens(message: string): string {
    return message.replace(DONE_TOKEN, '').trim()
}
