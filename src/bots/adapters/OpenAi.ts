import { assertOptions } from '@sprucelabs/schema'
import { Configuration, OpenAIApi } from 'openai'
import { LlmAdapter, SprucebotLlmBot } from '../../llm.types'
import PromptGenerator from '../PromptGenerator'

export class OpenAi implements LlmAdapter {
	public static Configuration = Configuration
	public static OpenAIApi = OpenAIApi
	private api: OpenAIApi

	public constructor(apiKey: string) {
		assertOptions({ apiKey }, ['apiKey'])
		const config = new OpenAi.Configuration({ apiKey })
		this.api = new OpenAi.OpenAIApi(config)
	}

	public async sendMessage(bot: SprucebotLlmBot): Promise<string> {
		const generator = new PromptGenerator(bot)
		const prompt = await generator.generate()

		console.log(prompt)

		const response = await this.api.createCompletion({
			prompt,
			model: 'text-davinci-003',
			max_tokens: 100,
			stop: ['__Me__:'],
		})

		return (
			response.data.choices[0]?.text?.trim() ?? MESSAGE_RESPONSE_ERROR_MESSAGE
		)
	}
}

export const MESSAGE_RESPONSE_ERROR_MESSAGE =
	"Oh no! Something went wrong and I can't talk right now!"
