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

	public constructor(config: Configuration) {
		super(config)
		SpyOpenAiApi.config = config
	}

	public async createCompletion(
		createCompletionRequest: CreateCompletionRequest
	): Promise<AxiosResponse<CreateCompletionResponse, any>> {
		SpyOpenAiApi.lastMessage = createCompletionRequest.prompt
		SpyOpenAiApi.lastModel = createCompletionRequest.model
		return {} as any
	}
}
