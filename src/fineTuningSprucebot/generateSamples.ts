import * as fs from 'fs'
import * as path from 'path'
import { FIRST_MESSAGES } from './constants/FIRST_MESSAGES'
import { OFF_THE_RAILS_CONVERSATIONS } from './constants/OFF_THE_RAILS_CONVERSATIONS'
import { TOPICS } from './constants/TOPICS'
import {
	randomizedTopics,
	generateCompletion,
	generateOffTheRails,
	render,
	random,
} from './support'
import { FineTuneOutput } from './types'

const promptTemplatePath = path.join(__dirname, 'promptTemplate.txt')
const promptTemplateNoTopicsPath = path.join(
	__dirname,
	'promptTemplateNoTopics.txt'
)
export const promptTemplate = fs.readFileSync(promptTemplatePath, 'utf8')
const promptTemplateNoTopics = fs.readFileSync(
	promptTemplateNoTopicsPath,
	'utf8'
)

const output: FineTuneOutput[] = []
const outputPath = process.argv[2]

if (!outputPath) {
	throw new Error(
		'No output path provided. Example: node generateSamples.js ~/output.json'
	)
}

new Array(1000).fill(0).forEach(() => {
	const topics = randomizedTopics(TOPICS)
	const randomLengthOfTopics = topics.slice(
		0,
		Math.random() * topics.length + 1
	)
	const randomIndex = Math.floor(Math.random() * randomLengthOfTopics.length)
	output.push(generateCompletion(randomLengthOfTopics, randomIndex))
})

for (let c = 0; c < OFF_THE_RAILS_CONVERSATIONS.length; c++) {
	const off = OFF_THE_RAILS_CONVERSATIONS[c]
	new Array(20)
		.fill(0)
		.forEach(() => output.push(generateOffTheRails(off, TOPICS)))
}

for (let c = 0; c < 20; c++) {
	output.push({
		prompt: render(promptTemplateNoTopics, {
			topics: 'None!',
			firstMessage: random(FIRST_MESSAGES),
		}),
		completion: random([
			'Oh no, we have an outage! There is nothing I can help you with while we are down!',
			'Shoot! I am having trouble connecting to HQ. I can not help you right now.',
			"This is embarrassing, but I am having trouble connecting to HQ. I can't talk right now.",
			"For some reason I am not able to communicate with HQ. I can't help you right now.",
		]),
	})
}

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
