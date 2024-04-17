import { FIRST_MESSAGES } from './constants/FIRST_MESSAGES'
import { GREETINGS } from './constants/GREETINGS'
import { promptTemplate } from './generateSamples'
import { Conversation, Message, Topic } from './types'

export function randomizedTopics(topics: Topic[]) {
    return [...topics].sort(() => Math.random() - 0.5)
}
export function generateOffTheRails(off: Conversation, topics: Topic[]) {
    const greeting = random(GREETINGS)
    const renderedTopics = renderTopics(randomizedTopics(topics))
    const messages = renderMessages([off.messages[0]], renderedTopics)

    return {
        prompt: render(promptTemplate, {
            greeting,
            topics: renderedTopics,
            messages,
            firstMessage: random(FIRST_MESSAGES),
        }),
        completion: render(random(off.messages[1].text), { topics }),
    }
}
export function generateCompletion(ts: Topic[], c: number) {
    const completion = `{{#${c + 1}}}`
    const greeting = random(GREETINGS)

    const topic = ts[c]
    const { topics, messages } = renderMessagesAndTopics(
        ts,
        topic.conversations
    )

    return {
        prompt: render(promptTemplate, {
            firstMessage: random(FIRST_MESSAGES),
            topics,
            greeting,
            messages,
        }),
        completion,
    }
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
export function random<T>(values: T[]): T {
    return values[Math.floor(Math.random() * values.length)]
}
export function render(message: string, context: Record<string, any>) {
    let prompt = message
    for (const key in context) {
        const value = context[key]
        const regex = new RegExp(`{{${key}}}`, 'g') // use regex to match all occurrences
        prompt = prompt.replace(regex, value)
    }

    return prompt
}
