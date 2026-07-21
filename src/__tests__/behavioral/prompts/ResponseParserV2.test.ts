import { Schema, SelectChoice, validateSchemaValues } from '@sprucelabs/schema'
import { test, suite, assert, generateId } from '@sprucelabs/test-utils'
import { DONE_TOKEN } from '../../../bots/templates'
import ResponseParserV2, {
    serializeCallbackError,
} from '../../../parsingResponses/ResponseParserV2'
import AbstractResponseParserTest from './AbstractResponseParserTest'

@suite()
export default class ResponseParserV2Test extends AbstractResponseParserTest {
    protected async beforeEach() {
        await super.beforeEach()
        this.parser = new ResponseParserV2()
    }

    @test()
    protected async canCreateResponseParserV2() {
        await this.assertNotDone('hello dude')
        await this.assertNotDone('DONE')
    }

    @test()
    protected async knowsWhenDone() {
        await this.assertDone(`hey there!!! ${DONE_TOKEN}`)
        await this.assertDone(`DONE ${DONE_TOKEN} what the!?`)
    }

    @test('parses out state 1', { hello: 'world' })
    @test('parses out state 2', { what: 'the', is: 'going', on: 'here' })
    protected async parsesState(input: Record<string, any>) {
        const state = this.renderUpdateState(input)
        await this.parsingEquals(state, {
            isDone: false,
            state: input,
            message: '',
        })
    }

    @test()
    protected async canUpdateStateWithMessagesAroundIt() {
        const state = this.renderUpdateState({ hello: 'world' })
        const message = `hey there!!!${state}what the!?`
        await this.parsingEquals(message, {
            isDone: false,
            state: { hello: 'world' },
            message: 'hey there!!!\nwhat the!?',
        })
    }

    @test('calls callback named taco', 'taco')
    @test('calls callback name burrito', 'burrito')
    protected async callsCallbackWhenFound(name: string) {
        let wasHit = false

        this.setCallback(name, {
            cb: () => {
                wasHit = true
            },
            useThisWhenever: 'you are asking for my favorite color.',
        })

        const results = await this.parse(this.renderCallback({ name }))

        assert.isTrue(wasHit, 'Callback was not hit')

        // undefined results: header with name only (no results key)
        assert.isEqual(
            results.callbackResults,
            `@results ${JSON.stringify({ name })}\n`.trim(),
            'Did not return expected callback results'
        )
    }

    @test()
    protected async returnsCallbackResults() {
        this.setCallback('test', {
            cb: () => {
                return 'Here are your results!'
            },
            useThisWhenever: 'you are asking for something.',
        })

        const results = await this.parse(this.renderCallback({ name: 'test' }))

        // String results: header + raw body (real newlines, not JSON-escaped)
        assert.isEqual(
            results.callbackResults,
            `@results ${JSON.stringify({ name: 'test' })}\nHere are your results!`.trim(),
            'Did not return expected callback results'
        )
    }

    @test()
    protected async canCallMultipleCallbacksInSameMessage() {
        this.setCallback('first', {
            cb: () => {
                return 'first result'
            },
            useThisWhenever: 'first callback',
        })

        this.setCallback('second', {
            cb: () => {
                return 'second result'
            },
            useThisWhenever: 'second callback',
        })

        const results = await this.parse(
            this.renderCallback({ name: 'first' }) +
                this.renderCallback({ name: 'second' })
        )

        const expected = [
            `@results ${JSON.stringify({ name: 'first' })}\nfirst result`,
            `@results ${JSON.stringify({ name: 'second' })}\nsecond result`,
        ].join('\n')

        assert.isEqual(
            results.callbackResults,
            expected.trim(),
            'Did not return expected callback results with multiple callbacks'
        )
    }

    @test()
    protected async canPassOptionsToCallbacks() {
        let passedOptions: Record<string, any> | undefined = undefined

        this.setCallback('test', {
            cb: (options) => {
                passedOptions = options
                return 'callback result'
            },
            parameters: [
                {
                    type: 'text',
                    name: 'input',
                },
            ],
            useThisWhenever: 'you are asking for something.',
        })

        const callbackOptions = { input: generateId() }
        const results = await this.parse(
            this.renderCallback({ name: 'test', options: callbackOptions })
        )

        assert.isNull(
            results.message,
            'Expected message to be null when only text is callback'
        )

        assert.isEqualDeep(
            passedOptions,
            callbackOptions,
            'Did not pass expected options to callback'
        )
    }

    @test()
    protected async validatesOptionsToCallback() {
        const choices: SelectChoice[] = [
            {
                value: 'red',
                label: 'Red',
            },
            {
                value: 'blue',
                label: 'Blue',
            },
        ]

        this.setCallback('hello', {
            cb: () => {},
            parameters: [
                {
                    type: 'number',
                    name: 'age',
                    isRequired: true,
                },
                {
                    type: 'select',
                    name: 'color',
                    options: {
                        choices,
                    },
                },
            ],
            useThisWhenever: generateId(),
        })

        const schema: Schema = {
            id: 'validationSchema',
            fields: {
                age: {
                    type: 'number',
                    isRequired: true,
                },
                color: {
                    type: 'select',
                    options: {
                        choices,
                    },
                },
            },
        }

        const values = {
            age: 'twenty',
            color: 'purple',
        }

        let expectedError = ''
        try {
            validateSchemaValues(schema, values)
        } catch (err) {
            expectedError = serializeCallbackError(err)
        }

        const results = await this.parse(
            this.renderCallback({
                name: 'hello',
                options: values,
            })
        )

        assert.isEqual(
            results.callbackResults,
            `@results ${JSON.stringify({ name: 'hello', error: expectedError })}\n`.trim(),
            'Did not return expected callback results'
        )
        // Must never be empty object error
        assert.doesNotInclude(
            results.callbackResults ?? '',
            '"error":{}',
            'Error must be serializable string, never empty object'
        )
    }

    @test()
    protected async returnsExpectedCallbackInstructions() {
        const actual = this.parser.getFunctionCallInstructions()
        assert.isEqual(
            actual,
            `A function call is done using the following syntax:
@callbackName({ "key": "value" })
Make sure to json encode the options. You can call as many callbacks as you want in a single response by including multiple @functionName() lines. Multi-line JSON arguments are accepted (pretty-printed objects are parsed). Failed callbacks always return a serializable error string in @results — never silence failures and never return an empty error object.
Your user-facing message is always sent to the user, even if a callback fails. Successful callbacks have already run successfully. If a callback fails later, do not repeat the same message and do not repeat successful callbacks. Only call the specific callback needed to fix the failed gap.
Good example:
@lookupWeather({ "zip": "80524" })
Bad examples:
@lookupWeather { "zip": "80524" }
@lookupWeather({ zip: "80524" })`,
            'Expected proper instructions for function calls in V2 parser'
        )
    }

    @test()
    protected async returnsExpectedStateUpdateInstructions() {
        const actual = this.parser.getStateUpdateInstructions()
        assert.isEqual(
            actual,
            `Updating state works similar to all function calls. Use the following syntax:
@updateState({ "field1": "value1", "field2": "value2" })
Make sure to json encode only the fields you want to change. You can update state once and do it at the end of any messages you send. Multi-line JSON objects are accepted (pretty-printed objects are parsed). IMPORTANT: Prefer a single JSON object argument; do not omit braces.
Your user-facing message is always sent to the user, even if @updateState fails. If @updateState fails later, do not repeat the same message. Only send the specific @updateState needed to fix the missing state change.
Good example:
@updateState({ "favoriteColor": "blue", "firstName": "Taylor" })
Bad examples:
@updateState
{ "favoriteColor": "blue" }
@updateState({ favoriteColor: "blue" })`,
            'Expected proper instructions for state updates in V2 parser'
        )
    }

    @test()
    protected async callbackInstructionsAcceptMultilineJson() {
        const instructions = this.parser.getFunctionCallInstructions()
        assert.doesInclude(
            instructions,
            'Multi-line JSON arguments are accepted',
            'Callback instructions must accept multi-line JSON arguments'
        )
        assert.doesInclude(
            instructions,
            'serializable error string',
            'Callback instructions must require serializable errors'
        )
    }

    @test()
    protected async stateUpdateInstructionsAcceptMultilineJson() {
        const instructions = this.parser.getStateUpdateInstructions()
        assert.doesInclude(
            instructions,
            'Multi-line JSON objects are accepted',
            'State update instructions must accept multi-line JSON objects'
        )
    }

    @test()
    protected async canCallCallbackWithNoArguments() {
        let wasHit = false

        this.setCallback('test', {
            cb: () => {
                wasHit = true
            },
            useThisWhenever: 'you need to do something with no arguments.',
        })

        await this.parse(`\n@test()\n`)

        assert.isTrue(
            wasHit,
            'Callback was not hit when called with no arguments'
        )
    }

    @test()
    protected async stripsOutCallbacksFromMessage() {
        this.setCallback('test', {
            cb: () => {
                return 'callback result'
            },
            useThisWhenever: 'you are asking for something.',
        })

        const message = `This is a message with a callback.${this.renderCallback({ name: 'test' })} Did it work?`
        const results = await this.parse(message)

        assert.isEqual(
            results.message,
            'This is a message with a callback.Did it work?',
            'Expected callback to be stripped out of message'
        )
    }

    @test()
    protected async badStateUpdatesAreHandledGracefully() {
        const message = `hey there!!!\nwhat the!?\n@updateState({"taco" - "waka"})\n`
        const results = await this.parse(message)
        let expectedError = ''

        try {
            JSON.parse('{"taco" - "waka"}')
        } catch (err) {
            expectedError = serializeCallbackError(err)
        }

        assert.isEqual(
            results.message,
            'hey there!!!\nwhat the!?',
            'Expected message to be parsed correctly'
        )

        assert.isEqual(
            results.callbackResults,
            `@results ${JSON.stringify({ name: 'updateState', error: expectedError })}\n`,
            'Expected callback results to include serializable error from bad JSON'
        )
        assert.doesNotInclude(
            results.callbackResults ?? '',
            '"error":{}',
            'State update errors must never serialize to empty object'
        )
    }

    @test()
    protected async stateUpdateDoesNotInterfereWithCallbacks() {
        this.setCallback('test', {
            cb: () => {
                return 'callback result'
            },
            useThisWhenever: 'you are asking for something.',
        })

        const message = `hey there!!!\nwhat the!?\n@updateState({"taco" - one})\n${this.renderCallback({ name: 'test' })}`
        const results = await this.parse(message)

        assert.doesInclude(
            results.callbackResults,
            'callback result',
            'Expected callback to be processed correctly'
        )
    }

    @test()
    protected async detectsAndStripsUpdateStateThatFailedInProd() {
        const results = await this
            .parse(`Good news, Taylor — HAN-1116 is wrapped up. Slack DMs went out to Taylor Romero, Jeff Porter, and Taylor Pearce. Dagmara got the email. The current work doc is updated for the 4th QA submission. No more objectives in the queue — Handbid Dev is just waiting on your next direction.

@updateState({"stepsRemaining":["Awaiting user direction"],"memoryBank":"User name: My Dude (Taylor). 6th boot.\n\nBUGS REPORTED TO TAYLOR: 1) updateEffort definedProcess not persisting to localDefinedProcess when SOP attached. 2) removeTacticalAdvice/removeGuardrails should reject SOP-provided matches when changeTarget is effort-local.\n\nCOMPLETED EFFORTS: Remote Access Setup, Browser, Handbid Dev (HAN-1116 4th QA submission complete — Slack DMs to Taylor Romero, Jeff Porter, Taylor Pearce; email to Dagmara dherter@nicmangroup.com), Handbid Release (API token partner docs — archived).\n\nSOPs: Browser Service (sop-3) — attached to KB Audit. Slack Bot Service (sop-4). Handbid DevOps (sop-1). Handbid Triage SOP (repo-based). Handbid Linear SOP (repo-based). Slack Notification SOP (sop-5).\n\nHANDBID DEV: ALIVE, awaiting-guidance, no current objective. 100% progress. Ready for next direction.\n\nSLACK BOT EFFORT: PAUSED. Progress: 100%. No current objective.\n\nOTHER PAUSED EFFORTS:\n1) Web App Redesign — PAUSED.\n2) KB Audit — PAUSED. ~93%.\n3) Triage — PAUSED. Waiting on Kari re HAN-1083.\n\nPENDING CLEANUP: consolidate SOP tactics on sop-4, remove local tactic #4 from Triage.","runningEfforts":[]})`)

        assert.isEqual(
            results.message,
            `Good news, Taylor — HAN-1116 is wrapped up. Slack DMs went out to Taylor Romero, Jeff Porter, and Taylor Pearce. Dagmara got the email. The current work doc is updated for the 4th QA submission. No more objectives in the queue — Handbid Dev is just waiting on your next direction.`,
            'Expected message to be parsed correctly with failed updateState'
        )
    }

    @test()
    protected async canUpdateStateTwiceInOneMessage() {
        const message = `hey there!!!\nwhat the!?\n${this.renderUpdateState({ taco: 'one' })}\n${this.renderUpdateState({ taco: 'two' })}\n`
        const results = await this.parse(message)
        assert.isEqualDeep(
            results.state,
            { taco: 'two' },
            'Expected second state update to overwrite first'
        )
    }

    // --- Silent-failure hardening (card FV1CRdPB) ---

    @test()
    protected async malformedJsonArgsEmitErrorAndContinueSibling() {
        let siblingHit = false
        this.setCallback('bad', {
            cb: () => 'should-not-run',
            useThisWhenever: 'bad',
        })
        this.setCallback('good', {
            cb: () => {
                siblingHit = true
                return 'ok'
            },
            useThisWhenever: 'good',
        })

        const results = await this.parse(
            `\n@bad({not json})\n@good({})\n`
        )

        assert.isTrue(siblingHit, 'Sibling callback must still execute')
        assert.doesInclude(
            results.callbackResults ?? '',
            'Invalid JSON arguments for @bad',
            'Malformed args must emit serializable error'
        )
        assert.doesInclude(
            results.callbackResults ?? '',
            'ok',
            'Sibling good result must appear'
        )
    }

    @test()
    protected async throwingCallbackSerializesErrorMessageNeverEmptyObject() {
        this.setCallback('boom', {
            cb: () => {
                throw new Error('listCodingAgents failed')
            },
            useThisWhenever: 'boom',
        })

        const results = await this.parse(`\n@boom({})\n`)
        assert.isEqual(
            results.callbackResults,
            `@results ${JSON.stringify({ name: 'boom', error: 'listCodingAgents failed' })}\n`.trim()
        )
        assert.doesNotInclude(results.callbackResults ?? '', '"error":{}')
    }

    @test()
    protected async multilineStringResultEmittedRawWithRealNewlines() {
        this.setCallback('snap', {
            cb: () => 'line1\nline2\nline3',
            useThisWhenever: 'snap',
        })
        const results = await this.parse(`\n@snap({})\n`)
        const snapResults = String(results.callbackResults ?? '')
        assert.isEqual(
            snapResults,
            `@results ${JSON.stringify({ name: 'snap' })}\nline1\nline2\nline3`.trim()
        )
        // Zero literal backslash-n sequences in the body after the header line
        const body = snapResults.split('\n').slice(1).join('\n')
        assert.doesNotInclude(body, '\\n')
    }

    @test()
    protected async multilineJsonArgsAreParsedAndInvoked() {
        let seen: any
        this.setCallback('multi', {
            cb: (opts) => {
                seen = opts
                return 'done'
            },
            useThisWhenever: 'multi',
            parameters: [{ type: 'text', name: 'title' }],
        })

        const results = await this.parse(`
@multi({
  "title": "hello"
})
`)
        assert.isEqualDeep(seen, { title: 'hello' })
        assert.doesInclude(results.callbackResults ?? '', 'done')
    }

    @test()
    protected async leadingTrailingWhitespaceAroundCallIsInvoked() {
        let wasHit = false
        this.setCallback('pad', {
            cb: () => {
                wasHit = true
            },
            useThisWhenever: 'pad',
        })
        await this.parse(`   @pad({})   \n`)
        assert.isTrue(wasHit)
    }

    @test()
    protected async unknownCallbackEmitsSerializableError() {
        this.setCallback('known', {
            cb: () => 'k',
            useThisWhenever: 'known',
        })
        const results = await this.parse(`\n@typoName({})\n`)
        assert.doesInclude(
            results.callbackResults ?? '',
            'Unknown callback @typoName',
            'Unknown callback must not be silent'
        )
    }

    private renderCallback(options: Record<string, any>): string {
        const { name, options: cbOptions } = options
        return `\n@${name}(${JSON.stringify(cbOptions ?? {})})\n`
    }

    protected renderUpdateState(input: Record<string, any>) {
        return `\n@updateState(${JSON.stringify(input)})\n`
    }
}
