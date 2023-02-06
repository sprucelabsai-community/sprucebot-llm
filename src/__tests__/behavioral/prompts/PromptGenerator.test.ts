import {
	assertOptions,
	normalizeSchemaValues,
	Schema,
} from '@sprucelabs/schema'
import { test, assert, errorAssert, generateId } from '@sprucelabs/test-utils'
import { BotOptions, SprucebotLlmBot } from '../../../llm.types'
import AbstractLlmTest from '../../support/AbstractLlmTest'
import { personSchema } from '../../support/schemas/personSchema'

const SCHEMA_INTRO = `Here is the schema for the state we're going to use for this interaction:`
const SCHEMA_OUTRO = ''
const STATE_INTRO = 'Here is the current state:'
const STATE_OUTRO = ''
const PROMPT_OUTRO = "Let's get started:"

export default class PromptGeneratorTest extends AbstractLlmTest {
	private static bot: SprucebotLlmBot
	private static prompt: PromptGenerator
	private static intro = 'You are'
	private static outro = PROMPT_OUTRO
	private static schemaIntro = SCHEMA_INTRO
	private static schemaOutro = ``
	private static stateIntro = STATE_INTRO
	private static stateOutro = STATE_OUTRO

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

		this.assertMessageGeneratsPrompt({
			options: {
				youAre,
			},
			message,
			expected: `${this.intro} ${youAre}\n\n${this.outro}\n\nMe: ${message}\nYou:`,
		})
	}

	@test()
	protected static async generatesWithState() {
		const state = normalizeSchemaValues(personSchema, {}, {})
		setUndefinedToNull(state)

		this.assertMessageGeneratsPrompt({
			options: {
				stateSchema: personSchema,
			},
			expected: `${this.intro} a bot\n\n${this.schemaIntro}\n\n${JSON.stringify(
				personSchema
			)}${this.schemaOutro}\n\n${this.stateIntro}\n\n${JSON.stringify(
				state
			)}\n\n${this.stateOutro}\n\n${this.outro}\n\nMe: Hey there!\nYou:`,
		})
	}

	private static assertMessageGeneratsPrompt<S extends Schema>(options: {
		options: Partial<BotOptions<S>>
		message?: string
		expected: string
	}) {
		const { message = 'Hey there!', expected, options: botOptions } = options

		this.bot = this.Bot(botOptions)
		this.reloadGenerator()

		const prompt = this.prompt.generate(message)
		assert.isEqual(prompt, expected)
	}

	private static reloadGenerator() {
		this.prompt = new PromptGenerator(this.bot)
	}
}

class PromptGenerator {
	private bot: SprucebotLlmBot
	public constructor(bot: SprucebotLlmBot) {
		assertOptions({ bot }, ['bot'])
		this.bot = bot
	}

	public generate(message: string) {
		const { youAre, stateSchema } = this.bot.serialize()
		const schemaJson = this.schemaToPromptFragment(stateSchema)
		return `You are ${youAre}\n\n${schemaJson}${PROMPT_OUTRO}\n\nMe: ${message}\nYou:`
	}
	private schemaToPromptFragment(stateSchema: Schema | undefined) {
		if (stateSchema) {
			let message = `${SCHEMA_INTRO}\n\n${JSON.stringify(
				stateSchema
			)}${SCHEMA_OUTRO}`

			message += `\n\n${STATE_INTRO}\n\n{"firstName":null,"lastName":null,"favoriteColor":null}\n\n${STATE_OUTRO}\n\n`

			return message
		}

		return ''
	}
}

function setUndefinedToNull(obj: Record<string, any>) {
	for (const key in obj) {
		// eslint-disable-next-line no-prototype-builtins
		if (obj.hasOwnProperty(key)) {
			if (obj[key] === undefined) {
				obj[key] = null
			} else if (typeof obj[key] === 'object') {
				setUndefinedToNull(obj[key])
			}
		}
	}
}
