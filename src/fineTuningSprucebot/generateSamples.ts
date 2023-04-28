import * as fs from 'fs'
import * as path from 'path'
import { DONE_TOKEN } from '../bots/templates'
import { FIRST_MESSAGES } from './constants/FIRST_MESSAGES'
import { GREETINGS } from './constants/GREETINGS'
import { OFF_THE_RAILS_CONVERSATIONS } from './constants/OFF_THE_RAILS_CONVERSATIONS'
import { TOPICS } from './constants/TOPICS'
import { Conversation, FineTuneOutput, Message, Topic } from './types'

const promptTemplatePath = path.join(__dirname, 'promptTemplate.txt')
const promptTemplate = fs.readFileSync(promptTemplatePath, 'utf8')

const output: FineTuneOutput[] = []
const outputPath = process.argv[2]

if (!outputPath) {
	throw new Error(
		'No output path provided. Example: node generateSamples.js ~/output.json'
	)
}

for (let c = 0; c < TOPICS.length; c++) {
	const topics = randomizedTopics()
	new Array(20).fill(0).forEach(() => generateCompletion(topics, c))
}

for (let c = 0; c < OFF_THE_RAILS_CONVERSATIONS.length; c++) {
	const off = OFF_THE_RAILS_CONVERSATIONS[c]
	new Array(20).fill(0).forEach(() => generateOffTheRails(off))
}

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))

function randomizedTopics() {
	return [...TOPICS].sort(() => Math.random() - 0.5)
}

function generateOffTheRails(off: Conversation) {
	const greeting = random(GREETINGS)
	const topics = renderTopics(randomizedTopics())
	const messages = renderMessages([off.messages[0]], topics)

	output.push({
		prompt: render(promptTemplate, {
			greeting,
			topics,
			messages,
			firstMessage: random(FIRST_MESSAGES),
		}),
		completion: render(random(off.messages[1].text), { topics }),
	})
}

function generateCompletion(ts: Topic[], c: number) {
	const completion = `{{#${c + 1}}}\n\n${DONE_TOKEN}`
	const greeting = random(GREETINGS)

	const topic = ts[c]
	const { topics, messages } = renderMessagesAndTopics(ts, topic.conversations)

	output.push({
		prompt: render(promptTemplate, {
			firstMessage: random(FIRST_MESSAGES),
			topics,
			greeting,
			messages,
		}),
		completion,
	})
}

function renderMessagesAndTopics(ts: Topic[], conversations: Conversation[]) {
	const conversation = random(conversations)
	const topics = renderTopics(ts)
	const rendered = renderMessages(conversation.messages, topics)
	return { topics, messages: rendered }
}

function renderMessages(messages: Message[], topics: string) {
	return render(
		messages.map((m) => `__${m.from}__: ${random(m.text)}`).join('\n') +
			'\n__You__:',
		{ topics }
	)
}

function renderTopics(topics: Topic[]) {
	return topics.map((t, idx) => `${idx + 1}. ${random(t.name)}`).join('\n')
}

function random<T>(values: T[]): T {
	return values[Math.floor(Math.random() * values.length)]
}

function render(message: string, context: Record<string, any>) {
	let prompt = message
	for (const key in context) {
		const value = context[key]
		const regex = new RegExp(`{{${key}}}`, 'g') // use regex to match all occurrences
		prompt = prompt.replace(regex, value)
	}

	return prompt
}
