import { AxiosResponse } from 'axios'
import {
	Configuration,
	CreateCompletionRequest,
	CreateCompletionRequestPrompt,
	CreateCompletionResponse,
	OpenAIApi,
} from 'openai'

export default class SpyOpenAiApi extends OpenAIApi {
	public static config?: Configuration
	public static lastMessage?: CreateCompletionRequestPrompt | null
	public static lastModel?: string
	public static responseMessage: string | false = 'hello!'

	public constructor(config: Configuration) {
		super(config)
		SpyOpenAiApi.config = config
	}

	public async createCompletion(
		createCompletionRequest: CreateCompletionRequest
	): Promise<Response> {
		SpyOpenAiApi.lastMessage = createCompletionRequest.prompt
		SpyOpenAiApi.lastModel = createCompletionRequest.model
		const choices = []

		if (SpyOpenAiApi.responseMessage) {
			choices.push({
				text: SpyOpenAiApi.responseMessage,
			})
		}

		return {
			config: {},
			headers: {},
			status: 200,
			statusText: 'OK',
			data: {
				id: 'cmpl-1',
				model: 'text-davinci-003',
				created: 0,
				object: 'text_completion',
				choices,
			},
		}
	}
}

type Response = AxiosResponse<CreateCompletionResponse, any>
