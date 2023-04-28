export interface Topic {
	name: string[]
	conversations: Conversation[]
}
export interface Conversation {
	messages: Message[]
}

export interface Message {
	from: 'Me' | 'You'
	text: string[]
}

export interface FineTuneOutput {
	prompt: string
	completion: string
}
