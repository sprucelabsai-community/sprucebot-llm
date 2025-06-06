import { normalizeSchemaValues, Schema, SchemaValues } from '@sprucelabs/schema'
import {
    test,
    suite,
    assert,
    errorAssert,
    generateId,
} from '@sprucelabs/test-utils'
import { Eta } from 'eta'
import PromptGenerator, {
    PromptGeneratorOptions,
    setUndefinedToNull,
    TemplateContext,
} from '../../../bots/PromptGenerator'
import { PROMPT_TEMPLATE } from '../../../bots/templates'
import { BotOptions, LlmMessage } from '../../../llm.types'
import SpyLlmBot from '../../../tests/SpyLlmBot'
import AbstractLlmTest from '../../support/AbstractLlmTest'
import { personSchema } from '../../support/schemas/personSchema'

@suite()
export default class PromptGeneratorTest extends AbstractLlmTest {
    private bot!: SpyLlmBot
    private prompt!: PromptGenerator
    private eta!: Eta

    protected async beforeEach() {
        await super.beforeEach()
        this.bot = this.SpyBot()
        this.reloadGenerator()
        this.eta = new Eta()
    }

    @test()
    protected async throwsWhenNotSentBot() {
        //@ts-ignore
        const err = assert.doesThrow(() => new PromptGenerator())
        errorAssert.assertError(err, 'MISSING_PARAMETERS', {
            parameters: ['bot'],
        })
    }

    @test()
    protected async generatesPromptWithJustYouAre() {
        const youAre = generateId()
        const message = generateId()

        const expected = await this.renderMessage({
            youAre,
            messages: [
                {
                    from: 'Me',
                    message,
                },
            ],
        })

        await this.assertMessageGeneratesPrompt({
            options: {
                youAre,
            },
            message,
            expected,
        })
    }

    @test('can generate with state schema and empty state', {})
    @test('can generate with state schema and populated state', {
        firstName: 'tay',
    })
    protected async generatesWithStateSchema(
        values: SchemaValues<typeof personSchema>
    ) {
        const state = normalizeSchemaValues(personSchema, values, {})
        setUndefinedToNull(state)

        const expected = await this.renderMessage({
            stateSchemaJson: JSON.stringify(personSchema),
            stateJson: JSON.stringify(state),
        })

        await this.assertMessageGeneratesPrompt({
            options: {
                stateSchema: personSchema,
            },
            expected,
            state,
        })
    }

    @test()
    protected async includesPastMessages() {
        const messages: LlmMessage[] = [
            {
                from: 'Me',
                message: 'Hey there!',
            },
            {
                from: 'You',
                message: 'What the??',
            },
        ]

        this.bot.setMessages(messages)

        const expected = await this.renderMessage({
            messages,
        })

        const actual = await this.generate()

        assert.isEqual(actual, expected)
    }

    @test()
    protected async writeFullPromptToLogForReading() {
        const skill = this.Skill({
            yourJobIfYouChooseToAcceptItIs:
                'to tell the best knock knock jokes you can think of! ',
            pleaseKeepInMindThat: [
                'our audience is PG, so keep it light and friendly!',
                'You should never laugh at someone who does not get the joke.',
            ],
            weAreDoneWhen: 'you have told 3 jokes!',
        })

        this.bot = this.Bot({
            youAre: 'A bot that is always in a good mood. You love complementing people and making sure they are happy!',
            skill,
            stateSchema: personSchema,
            state: {},
        })

        this.reloadGenerator()
        this.log(await this.generate())
    }

    @test()
    protected async canOverrideTemplate() {
        const template = generateId()

        this.reloadGenerator({
            promptTemplate: template,
        })

        const actual = await this.generate()
        assert.isEqual(actual, template)
    }

    private async renderMessage(context: Partial<TemplateContext>) {
        return await this.eta.renderStringAsync(PROMPT_TEMPLATE, {
            youAre: this.youAre,
            messages: [
                {
                    from: 'Me',
                    message: 'Hey there!',
                },
            ],
            ...context,
        })
    }

    private async assertMessageGeneratesPrompt<S extends Schema>(options: {
        options: Partial<BotOptions<S>>
        message?: string
        expected: string
        state?: Record<string, any>
    }) {
        const {
            message = 'Hey there!',
            expected,
            options: botOptions,
            state,
        } = options

        this.bot = this.SpyBot<S>(botOptions)
        this.reloadGenerator()

        if (state) {
            await this.bot.updateState(state)
        }

        const prompt = await this.generate(message)
        assert.isEqual(prompt, expected)
    }

    private async generate(message?: string) {
        if (message) {
            this.bot.setMessages([
                {
                    from: 'Me',
                    message,
                },
            ])
        }
        return await this.prompt.generate()
    }

    private SpyBot<S extends Schema = Schema>(
        options?: Partial<BotOptions<S, SchemaValues<S, false>>>
    ): SpyLlmBot {
        return this.Bot({ ...options, Class: SpyLlmBot }) as SpyLlmBot
    }

    private reloadGenerator(options?: PromptGeneratorOptions) {
        this.prompt = PromptGenerator.Generator(this.bot, options)
    }
}
