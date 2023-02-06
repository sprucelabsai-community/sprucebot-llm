import { test, assert, errorAssert, generateId } from '@sprucelabs/test-utils'
import { Configuration, OpenAIApi } from 'openai'
import { OpenAi } from '../../../bots/adapters/OpenAi'
import SpyOpenAiApi from '../../../bots/adapters/SpyOpenAiApi'
import AbstractLlmTest from '../../support/AbstractLlmTest'
import SpyConfiguration from '../../support/SpyConfiguration'

export default class OpenAiTest extends AbstractLlmTest {
	protected static async beforeEach() {
		await super.beforeEach()
	}

	@test()
	protected static async throwsWhenMissingKey() {
		//@ts-ignore
		const err = assert.doesThrow(() => new OpenAi())
		errorAssert.assertError(err, 'MISSING_PARAMETERS', {
			parameters: ['apiKey'],
		})
	}

	@test()
	protected static async canCreateOneWithKey() {
		new OpenAi(generateId())
	}

	@test()
	protected static usesOpenAisLibrariesByDefault() {
		assert.isEqual(OpenAi.Configuration, Configuration)
		assert.isEqual(OpenAi.OpenAIApi, OpenAIApi)
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

		const adapter = this.OpenAi()
		const bot = this.Bot()

		await adapter.sendMessage(bot, 'hello')

		assert.isEqual(SpyOpenAiApi.lastMessage, 'hello')
		assert.isEqual(SpyOpenAiApi.lastModel, 'text-davinci-003')
	}

	private static OpenAi(key?: string) {
		return new OpenAi(key ?? generateId())
	}

	private static setupSpys() {
		OpenAi.Configuration = SpyConfiguration
		OpenAi.OpenAIApi = SpyOpenAiApi
		SpyConfiguration.options = undefined
		SpyOpenAiApi.lastMessage = undefined
		SpyOpenAiApi.lastModel = undefined
	}
}
