import { test, assert, errorAssert, generateId } from '@sprucelabs/test-utils'
import { Configuration, OpenAIApi } from 'openai'
import {
	MESSAGE_RESPONSE_ERROR_MESSAGE,
	OpenAiAdapter,
} from '../../../bots/adapters/OpenAi'
import SpyOpenAiApi from '../../../bots/adapters/SpyOpenAiApi'
import PromptGenerator from '../../../bots/PromptGenerator'
import AbstractLlmTest from '../../support/AbstractLlmTest'
import { SpyBot } from '../../support/SpyBot'
import SpyConfiguration from '../../support/SpyConfiguration'

export default class OpenAiTest extends AbstractLlmTest {
	private static openAi: OpenAiAdapter
	private static bot: SpyBot
	protected static async beforeEach() {
		await super.beforeEach()
		this.openAi = this.OpenAi()
		this.bot = this.Bot()
	}

	@test()
	protected static async throwsWhenMissingKey() {
		//@ts-ignore
		const err = assert.doesThrow(() => new OpenAiAdapter())
		errorAssert.assertError(err, 'MISSING_PARAMETERS', {
			parameters: ['apiKey'],
		})
	}

	@test()
	protected static usesOpenAisLibrariesByDefault() {
		assert.isEqual(OpenAiAdapter.Configuration, Configuration)
		assert.isEqual(OpenAiAdapter.OpenAIApi, OpenAIApi)
	}

	@test()
	protected static async instantiatingOpenAiSetsKeyToConfig() {
		this.setupSpys()
		const key = generateId()
		this.OpenAi(key)
		assert.isEqual(SpyConfiguration.options?.apiKey, key)
	}

	@test()
	protected static async instantiatesOpenAiWithConfiguration() {
		this.setupSpys()
		this.OpenAi()
		assert.isEqual(SpyOpenAiApi.config, SpyConfiguration.instance)
	}

	@test()
	protected static async canSendMessage() {
		this.setupSpys()

		const message = generateId()
		this.bot.setMessages([
			{
				from: 'Me',
				message,
			},
		])
		await this.openAi.sendMessage(this.bot)

		const prompt = new PromptGenerator(this.bot)
		const expected = await prompt.generate()

		assert.isEqual(SpyOpenAiApi.lastMessage, expected)
		assert.isEqual(SpyOpenAiApi.lastModel, 'text-davinci-003')
	}

	@test()
	protected static async returnsResponseFromSendMessage() {
		SpyOpenAiApi.responseMessage = generateId()
		await this.assertResponseEquals(SpyOpenAiApi.responseMessage)
	}

	@test()
	protected static async trimsResponseMessage() {
		SpyOpenAiApi.responseMessage = ' hello world '
		await this.assertResponseEquals('hello world')
	}

	@test()
	protected static async noResponseReturnsDefaultErrorMesssage() {
		SpyOpenAiApi.responseMessage = false
		await this.assertResponseEquals(MESSAGE_RESPONSE_ERROR_MESSAGE)
	}

	private static async assertResponseEquals(expected: string) {
		const response = await this.sendRandomMessage()
		assert.isEqual(response, expected)
	}

	private static async sendRandomMessage() {
		this.bot.setMessages([
			{
				from: 'Me',
				message: generateId(),
			},
		])
		return await this.openAi.sendMessage(this.bot)
	}

	private static OpenAi(key?: string) {
		return new OpenAiAdapter(key ?? generateId())
	}

	private static setupSpys() {
		OpenAiAdapter.Configuration = SpyConfiguration
		OpenAiAdapter.OpenAIApi = SpyOpenAiApi
		SpyConfiguration.options = undefined
		SpyOpenAiApi.lastMessage = undefined
		SpyOpenAiApi.lastModel = undefined
	}
}
