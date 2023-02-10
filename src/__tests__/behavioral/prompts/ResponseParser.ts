import { DONE_TOKEN } from '../../../bots/PromptGenerator'

export default class ResponseParser {
	private static instance: ResponseParser = new ResponseParser()

	public static setInstance(parser: ResponseParser) {
		this.instance = parser
	}

	public static getInstance() {
		return this.instance
	}

	public parse(response: string): ParsedResponse {
		return {
			isDone: response.includes(DONE_TOKEN),
			state: undefined,
		}
	}
}
export interface ParsedResponse {
	isDone: boolean
	state?: Record<string, any>
}
