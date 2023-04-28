import * as fs from 'fs'
import * as path from 'path'
import { GREETINGS } from './constants/GREETINGS'
import { TOPICS } from './constants/TOPICS'
import { FineTuneOutput } from './types'

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
	new Array(10).fill(0).forEach(() => generateCompletion(c))
}

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))

function generateCompletion(c: number) {
	const completion = `{{#${c + 1}}}`
	const greeting = random(GREETINGS)
	const topics = renderTopics()

	const topic = TOPICS[c]
	const conversation = random(topic.conversations)
	const messages = render(
		conversation.messages
			.map((m) => `__${m.from}__: ${random(m.text)}`)
			.join('\n') + '\n__You__:',
		{ topics }
	)

	output.push({
		prompt: render(promptTemplate, { topics, greeting, messages }),
		completion,
	})
}

function renderTopics() {
	return TOPICS.map((t, idx) => `${idx + 1}. ${random(t.name)}`).join('\n')
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
