import { normalizeSchemaValues, Schema, SchemaValues } from '@sprucelabs/schema'
import { test, assert, errorAssert, generateId } from '@sprucelabs/test-utils'
import * as Eta from 'eta'
import { BotOptions, SprucebotLlmBot } from '../../../llm.types'
import PromptGenerator, {
	setUndefinedToNull,
	TemplateContext,
	PROMPT_TEMPLATE,
} from '../../../PromptGenerator'
import AbstractLlmTest from '../../support/AbstractLlmTest'
import { personSchema } from '../../support/schemas/personSchema'

export default class PromptGeneratorTest extends AbstractLlmTest {
	private static bot: SprucebotLlmBot
	private static prompt: PromptGenerator

	protected static async beforeEach() {
		await super.beforeEach()
		this.bot = this.Bot()
		this.reloadGenerator()
	}

	@test()
	protected static async throwsWhenNotSentBot() {
		//@ts-ignore
		const err = assert.doesThrow(() => new PromptGenerator())
		errorAssert.assertError(err, 'MISSING_PARAMETERS', {
			parameters: ['bot'],
		})
	}

	@test()
	protected static async generatesPromptWithJustYouAre() {
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

		await this.assertMessageGeneratsPrompt({
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
	protected static async generatesWithStateSchema(
		values: SchemaValues<typeof personSchema>
	) {
		const state = normalizeSchemaValues(personSchema, values, {})
		setUndefinedToNull(state)

		const expected = await this.renderMessage({
			stateSchemaJson: JSON.stringify(personSchema),
			stateJson: JSON.stringify(state),
		})

		await this.assertMessageGeneratsPrompt({
			options: {
				stateSchema: personSchema,
			},
			expected,
			state,
		})
	}

	private static async renderMessage(context: Partial<TemplateContext>) {
		return await Eta.render(
			PROMPT_TEMPLATE,
			{
				youAre: 'a bot',
				messages: [
					{
						from: 'Me',
						message: 'Hey there!',
					},
				],
				...context,
			},
			{
				async: true,
				autoEscape: false,
			}
		)
	}

	private static async assertMessageGeneratsPrompt<S extends Schema>(options: {
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

		this.bot = this.Bot(botOptions)
		this.reloadGenerator()

		if (state) {
			await this.bot.updateState(state)
		}

		const prompt = await this.prompt.generate(message)
		assert.isEqual(prompt, expected)
	}

	private static reloadGenerator() {
		this.prompt = new PromptGenerator(this.bot)
	}
}
