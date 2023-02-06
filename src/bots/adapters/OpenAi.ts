import { assertOptions } from '@sprucelabs/schema'
import { Configuration, OpenAIApi } from 'openai'
import { LlmAdapter, SprucebotLlmBot } from '../../llm.types'

export class OpenAi implements LlmAdapter {
	public static Configuration = Configuration
	public static OpenAIApi = OpenAIApi
	private api: OpenAIApi

	public constructor(apiKey: string) {
		assertOptions({ apiKey }, ['apiKey'])
		const config = new OpenAi.Configuration({ apiKey })
		this.api = new OpenAi.OpenAIApi(config)
	}

	public async sendMessage(
		_bot: SprucebotLlmBot,
		_message: string
	): Promise<void> {
		await this.api.createCompletion({
			prompt: 'hello',
			model: 'text-davinci-003',
		})
	}
}
