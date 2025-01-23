import { test, assert, generateId, errorAssert } from '@sprucelabs/test-utils'
import { DONE_TOKEN, STATE_BOUNDARY } from '../../../bots/templates'
import { LlmCallback, LlmCallbackMap } from '../../../llm.types'
import renderLegacyPlaceholder from '../../../parsingResponses/renderPlaceholder'
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

        await this.parse(renderLegacyPlaceholder(key))

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

        await this.parse(renderLegacyPlaceholder('taco'))

        assert.isTrue(wasHit)
    }

    @test('callback populate placeholders 1', 'bravo')
    @test('callback populate placeholders 2', 'taco')
    protected static async callbacksPopulatePlaceholders(placeholder: string) {
        const message = renderLegacyPlaceholder(placeholder)
        this.setCallback(placeholder, this.defaultCallback(placeholder))
        const response = await this.parse(message)

        assert.isEqualDeep(response, {
            isDone: false,
            state: undefined,
            message: placeholder,
            callbackResults: undefined,
        })
    }

    @test()
    protected static async usesBoundariesToFindPlaceholders() {
        const message = `taco ${renderLegacyPlaceholder('taco')} taco`
        this.setCallback('taco', this.defaultCallback('bravo'))
        const response = await this.parse(message)
        assert.isEqual(response.message, 'taco bravo taco')
    }

    @test()
    protected static async replacesPlaceholderInTheText() {
        this.setCallback('personName', this.defaultCallback('Tay'))
        const p = renderLegacyPlaceholder('personName')
        const response = await this.parse(`hey there ${p}!`)
        assert.isEqual(response.message, 'hey there Tay!')
    }

    @test()
    protected static async clearsOutCallbackMarkupPlaceholders() {
        const name = generateId()
        const message = generateId()
        this.setCallback(name, this.defaultCallback('Tay'))
        const response = await this.parse(
            `${message} ${renderCallbackMarkup(name)}`
        )
        assert.isEqual(response.message, message)
    }

    @test()
    protected static async returnsResultsOfCallback() {
        const results = generateId()
        this.setCallback('availableTimes', this.defaultCallback(results))
        const response = await this.parse(
            `hey there ${renderCallbackMarkup('availableTimes')}`
        )
        assert.isEqual(response.callbackResults, results)
    }

    @test()
    protected static async canParseWithoutSpaceInHandlebars() {
        const results = generateId()
        this.setCallback('availableTimes', this.defaultCallback(results))
        const response = await this.parse(
            `hey there ${renderCallbackMarkup('availableTimes').replaceAll(' ', '')}`
        )
        assert.isEqual(response.callbackResults, results)
    }

    @test()
    protected static async passesParametersToCallback() {
        let passedParams: Record<string, any> | undefined
        const data = {
            time: generateId(),
            date: generateId(),
            [generateId()]: generateId(),
        }

        this.setCallback('testing', {
            cb: (params) => {
                passedParams = params
                return generateId()
            },
            useThisWhenever: generateId(),
        })

        await this.parse(renderCallbackMarkup('testing', data))

        assert.isEqualDeep(passedParams, data)
    }

    @test()
    protected static async throwsIfBadCallbackMarkupPassed() {
        await this.assertPromptThrowsWithErrorIncludingCallbacks(
            '<< taco />>',
            '<< taco />>',
            ['burrito']
        )
    }

    @test()
    protected static async throwsWithDifferentBadCallbackMarkup() {
        await this.assertPromptThrowsWithErrorIncludingCallbacks(
            'hey there <<listOrganizations/>>',
            '<<listOrganizations/>>',
            ['listLocations']
        )
    }

    private static async assertPromptThrowsWithErrorIncludingCallbacks(
        prompt: string,
        match: string,
        callbackKeys: string[]
    ) {
        const callbacks: LlmCallbackMap = {}
        for (const key of callbackKeys) {
            callbacks[key] = {
                cb: () => '',
                useThisWhenever: generateId(),
            }
        }

        const err = await assert.doesThrowAsync(() =>
            this.parse(prompt, callbacks)
        )

        errorAssert.assertError(err, 'INVALID_CALLBACK', {
            validCallbacks: callbackKeys,
            matchedCallback: match,
        })
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
        return await this.parser.parse(message, callbacks ?? this.callbacks)
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
        assert.isEqualDeep(results, { callbackResults: undefined, ...expected })
    }

    private static setCallback(key: string, callback: LlmCallback) {
        this.callbacks[key] = callback
    }
}
function removeTokens(message: string): string {
    return message.replace(DONE_TOKEN, '').trim()
}

function renderCallbackMarkup(name: string, data?: Record<string, any>) {
    return data
        ? `<< ${name} >>${JSON.stringify(data)}<</ ${name} >>`
        : `<< ${name} />>`
}
