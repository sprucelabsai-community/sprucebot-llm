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
        const state = this.generateUpdateStateSchemaSyntax(input)
        await this.parsingEquals(state, {
            isDone: false,
            state: input,
            message: '',
        })
    }

    @test()
    protected async canUpdateStateWithMessagesAroundIt() {
        const state = this.generateUpdateStateSchemaSyntax({ hello: 'world' })
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
    protected async canCallMultipleCallbacksInSameCallback() {
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
        await this.parse(
            this.renderCallback({ name: 'test', options: callbackOptions })
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

    private renderCallbackResults(options: Record<string, any>) {
        return `@results ${JSON.stringify(options)}\n`
    }

    private renderCallback(options: Record<string, any>): string {
        return `@callback ${JSON.stringify(options)}\n`
    }

    protected generateUpdateStateSchemaSyntax(input: Record<string, any>) {
        return `\n@updateState ${JSON.stringify(input)}\n`
    }
}
