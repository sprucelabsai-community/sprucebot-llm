import { DONE_TOKEN, STATE_BOUNDARY } from '../../../bots/PromptGenerator'

export default class ResponseParser {
	private static instance: ResponseParser = new ResponseParser()

	public static setInstance(parser: ResponseParser) {
		this.instance = parser
	}

	public static getInstance() {
		return this.instance
	}

	public parse(response: string): ParsedResponse {
		let message = response.replace(DONE_TOKEN, '').trim()
		let state: Record<string, any> | undefined

		const { match, fullMatch } = this.parseState(message)

		if (match && fullMatch) {
			message = message.replace(fullMatch, '').trim()
			state = JSON.parse(match)
		}

		return {
			isDone: this.doesIncludeDoneToken(response),
			state,
			message,
		}
	}

	private doesIncludeDoneToken(response: string): boolean {
		return response.includes(DONE_TOKEN)
	}

	private parseState(message: string) {
		const ESCAPED_BOUNDARY = STATE_BOUNDARY.replace(
			/[-[\]{}()*+?.,\\^$|#\s]/g,
			'\\$&'
		)
		const searchRegex = new RegExp(
			`${ESCAPED_BOUNDARY}(.*?)${ESCAPED_BOUNDARY}`
		)
		const stateMatches = message.match(searchRegex)
		const match = stateMatches?.[1]

		return { match, fullMatch: stateMatches?.[0] }
	}
}
export interface ParsedResponse {
	isDone: boolean
	state?: Record<string, any>
	message: string
}
