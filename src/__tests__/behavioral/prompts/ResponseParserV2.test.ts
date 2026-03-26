import { Schema, SelectChoice, validateSchemaValues } from '@sprucelabs/schema'
import { test, suite, assert, generateId } from '@sprucelabs/test-utils'
import { DONE_TOKEN } from '../../../bots/templates'
import ResponseParserV2 from '../../../parsingResponses/ResponseParserV2'
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

        const options = { name, results: undefined }
        assert.isEqual(
            results.callbackResults,
            this.renderCallbackResults(options).trim(),
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

        assert.isEqual(
            results.callbackResults,
            this.renderCallbackResults({
                name: 'test',
                results: 'Here are your results!',
            }).trim(),
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

        const expected =
            this.renderCallbackResults({
                name: 'first',
                results: 'first result',
            }) +
            this.renderCallbackResults({
                name: 'second',
                results: 'second result',
            })

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

        let expected: Record<string, any> = {
            name: 'hello',
        }

        try {
            validateSchemaValues(schema, values)
        } catch (err) {
            expected.error = err
        }

        const results = await this.parse(
            this.renderCallback({
                name: 'hello',
                options: values,
            })
        )

        assert.isEqual(
            results.callbackResults,
            this.renderCallbackResults(expected).trim(),
            'Did not return expected callback results'
        )
    }

    @test()
    protected async returnsExpectedCallbackInstructions() {
        const actual = this.parser.getFunctionCallInstructions()
        assert.isEqual(
            actual,
            `A function call is done using the following syntax:
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
@updateState({ favoriteColor: "blue" })`,
            'Expected proper instructions for state updates in V2 parser'
        )
    }

    @test()
    protected async callbackInstructionsExplicitlyForbidMultilineJson() {
        const instructions = this.parser.getFunctionCallInstructions()
        assert.doesInclude(
            instructions,
            'IMPORTANT: JSON must be on a single line. Do NOT use multi-line or formatted JSON.',
            'Callback instructions must explicitly forbid multi-line JSON to prevent LLM from returning unparseable multi-line output'
        )
    }

    @test()
    protected async stateUpdateInstructionsExplicitlyForbidMultilineJson() {
        const instructions = this.parser.getStateUpdateInstructions()
        assert.doesInclude(
            instructions,
            'IMPORTANT: JSON must be on a single line. Do NOT use multi-line or formatted JSON.',
            'State update instructions must explicitly forbid multi-line JSON to prevent LLM from returning unparseable multi-line output'
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

        assert.isTrue(wasHit, 'Callback was not hit when called with no arguments')
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
        let expectedCallback = ''

        try {
            JSON.parse('{"taco" - "waka"}')
        } catch (err) {
            expectedCallback = this.renderCallbackResults({
                error: err,
                name: 'updateState',
            })
        }

        assert.isEqual(
            results.message,
            'hey there!!!\nwhat the!?',
            'Expected message to be parsed correctly'
        )

        assert.isEqual(
            results.callbackResults,
            expectedCallback,
            'Expected callback results to include error from bad JSON'
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

@updateState({"stepsRemaining":["Awaiting user direction"],"memoryBank":"User name: My Dude (Taylor). 6th boot.\n\nBUGS REPORTED TO TAYLOR: 1) updateEffort definedProcess not persisting to localDefinedProcess when SOP attached. 2) removeTacticalAdvice/removeGuardrails should reject SOP-provided matches when changeTarget is effort-local.\n\nCOMPLETED EFFORTS: Remote Access Setup, Browser, Handbid Dev (HAN-1116 4th QA submission complete — Slack DMs to Taylor Romero, Jeff Porter, Taylor Pearce; email to Dagmara dherter@nicmangroup.com), Handbid Release (API token partner docs — archived).\n\nSOPs: Browser Service (sop-3) — attached to KB Audit. Slack Bot Service (sop-4). Handbid DevOps (sop-1). Handbid Triage SOP (sop-2). Handbid Linear SOP (repo-based). Slack Notification SOP (sop-5).\n\nHANDBID DEV: ALIVE, awaiting-guidance, no current objective. 100% progress. Ready for next direction.\n\nSLACK BOT EFFORT: PAUSED. Progress: 100%. No current objective.\n\nOTHER PAUSED EFFORTS:\n1) Web App Redesign — PAUSED.\n2) KB Audit — PAUSED. ~93%.\n3) Triage — PAUSED. Waiting on Kari re HAN-1083.\n\nPENDING CLEANUP: consolidate SOP tactics on sop-4, remove local tactic #4 from Triage.","runningEfforts":[]})`)

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

    private renderCallbackResults(options: Record<string, any>) {
        return `@results ${JSON.stringify(options)}\n`
    }

    private renderCallback(options: Record<string, any>): string {
        const { name, options: cbOptions } = options
        return `\n@${name}(${JSON.stringify(cbOptions ?? {})})\n`
    }

    protected renderUpdateState(input: Record<string, any>) {
        return `\n@updateState(${JSON.stringify(input)})\n`
    }
}
