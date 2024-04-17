import { test, assert, generateId } from '@sprucelabs/test-utils'
import { DONE_TOKEN, STATE_BOUNDARY } from '../../../bots/templates'
import { LlmCallback, LlmCallbackMap } from '../../../llm.types'
import renderPlaceholder from '../../../parsingResponses/renderPlaceholder'
import ResponseParser, {
    ParsedResponse,
} from '../../../parsingResponses/ResponseParser'
import AbstractLlmTest from '../../support/AbstractLlmTest'

export default class ResponseParserTest extends AbstractLlmTest {
    private static parser: ResponseParser
    private static callbacks: LlmCallbackMap = {}
    protected static async beforeEach() {
        await super.beforeEach()
        this.parser = ResponseParser.getInstance()
        this.callbacks = {}
    }

    @test()
    protected static async canSetAndGetInstance() {
        ResponseParser.setInstance(this.parser)
        const match = ResponseParser.getInstance()
        assert.isEqual(match, this.parser)
    }

    @test()
    protected static async emptyReturnedIfResponseHasNoPlaceholders() {
        await this.assertNotDone('hello world')
        await this.assertNotDone('DONE')
    }

    @test()
    protected static async knowsWhenDone() {
        await this.assertDone(`hey there!!! ${DONE_TOKEN}`)
    }

    @test()
    protected static async gettingInstanceWithoutOneSetReturnsFresh() {
        const instance = ResponseParser.getInstance()
        assert.isInstanceOf(instance, ResponseParser)
        const instance2 = ResponseParser.getInstance()
        assert.isEqual(instance, instance2)
    }

    @test('parses state 1', {
        hello: 'world',
    })
    @test('parses state 2', {
        what: 'the??',
    })
    protected static async parsesStateWithNothingElse(
        input: Record<string, any>
    ) {
        const state = this.generateStateSchema(input)
        await this.parsingEquals(state, {
            isDone: false,
            state: input,
            message: '',
        })
    }

    @test()
    protected static async removesStateFromResponse() {
        const state = this.generateStateSchema({ hello: 'world' })
        const message = `hello ${state} world`
        await this.parsingEquals(message, {
            isDone: false,
            state: { hello: 'world' },
            message: 'hello  world',
        })
    }

    @test('can handle single callback 1', 'favoriteColors')
    @test('can handle single callback 2', 'tacoBravo')
    protected static async callsCallbacksWhenPlaceholdersFoundInResponse(
        key: string
    ) {
        let wasHit = false

        this.setCallback(key, {
            cb: () => {
                wasHit = true
                return ''
            },
            useThisWhenever: 'you are asking for my favorite color.',
        })

        await this.parse(renderPlaceholder(key))

        assert.isTrue(wasHit)
    }

    @test()
    protected static async canCallSecondPlacehloder() {
        let wasHit = false

        this.setCallback('favoriteColors', {
            cb: () => {
                return ''
            },
            useThisWhenever: generateId(),
        })

        this.setCallback('taco', {
            cb: () => {
                wasHit = true
                return ''
            },
            useThisWhenever: generateId(),
        })

        await this.parse(renderPlaceholder('taco'))

        assert.isTrue(wasHit)
    }

    @test('callback populate placeholders 1', 'bravo')
    @test('callback populate placeholders 2', 'taco')
    protected static async callbacksPopulatePlaceholders(placeholder: string) {
        const message = renderPlaceholder(placeholder)
        this.setCallback(placeholder, this.defaultCallback(placeholder))
        const response = await this.parse(message)

        assert.isEqualDeep(response, {
            isDone: false,
            state: undefined,
            message: placeholder,
        })
    }

    @test()
    protected static async usesBoundariesToFindPlaceholders() {
        const message = `taco ${renderPlaceholder('taco')} taco`
        this.setCallback('taco', this.defaultCallback('bravo'))
        const response = await this.parse(message)
        assert.isEqual(response.message, 'taco bravo taco')
    }

    @test()
    protected static async replacesPlaceholderInTheText() {
        this.setCallback('personName', this.defaultCallback('Tay'))
        const p = renderPlaceholder('personName')
        const response = await this.parse(`hey there ${p}!`)
        assert.isEqual(response.message, 'hey there Tay!')
    }

    private static defaultCallback(response: string): LlmCallback {
        return {
            cb: () => {
                return response
            },
            useThisWhenever: generateId(),
        }
    }

    private static async parse(message: string, callbacks?: LlmCallbackMap) {
        return await this.parser.parse(message, this.callbacks ?? callbacks)
    }

    private static generateStateSchema(input: Record<string, any>) {
        return `${STATE_BOUNDARY} ${JSON.stringify(input)} ${STATE_BOUNDARY}`
    }

    private static async assertDone(message: string) {
        await this.parsingEquals(message, {
            isDone: true,
            state: undefined,
            message: removeTokens(message),
        })
    }

    private static async assertNotDone(message: string) {
        await this.parsingEquals(message, {
            isDone: false,
            state: undefined,
            message: removeTokens(message),
        })
    }

    private static async parsingEquals(
        message: string,
        expected: ParsedResponse
    ) {
        const results = await this.parse(message)
        assert.isEqualDeep(results, expected)
    }

    private static setCallback(key: string, callback: LlmCallback) {
        this.callbacks[key] = callback
    }
}
function removeTokens(message: string): string {
    return message.replace(DONE_TOKEN, '').trim()
}
