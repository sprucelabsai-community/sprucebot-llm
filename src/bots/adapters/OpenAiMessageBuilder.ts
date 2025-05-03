import { Schema } from '@sprucelabs/schema'
import {
    ChatCompletionContentPart,
    ChatCompletionMessageParam,
} from 'openai/resources'
import {
    SprucebotLlmBot,
    LlmMessage,
    SerializedBot,
    LlmCallbackMap,
} from '../../llm.types'
import { DONE_TOKEN, STATE_BOUNDARY } from '../templates'

export default class OpenAiMessageBuilder {
    private bot: SprucebotLlmBot

    protected constructor(bot: SprucebotLlmBot) {
        this.bot = bot
    }

    public static Builder(bot: SprucebotLlmBot) {
        return new this(bot)
    }

    public buildMessages() {
        const values = this.bot.serialize()

        const allMessages = [
            this.buildFirstMessage(values.youAre),
            ...this.buildSkillMessages(values.skill),
            ...this.buildChatHistoryMessages(values.messages),
        ]

        return allMessages
    }

    private buildChatHistoryMessages(messages: LlmMessage[]) {
        let messagesBeingConsidered = messages
        const limit = parseInt(process.env.OPENAI_MESSAGE_MEMORY_LIMIT ?? '0')

        if (limit > 0) {
            messagesBeingConsidered = messages.slice(
                Math.max(messages.length - limit, 0)
            )
        }

        return messagesBeingConsidered.map((message) =>
            this.mapMessageToCompletion(message)
        ) as ChatCompletionMessageParam[]
    }

    private mapMessageToCompletion(message: LlmMessage) {
        let content: ChatCompletionContentPart[] | string = message.message
        if (message.imageBase64) {
            content = [
                {
                    type: 'text',
                    text: message.message,
                },
                {
                    type: 'image_url',
                    image_url: {
                        url: `data:image/png;base64,${message.imageBase64}`,
                    },
                },
            ]
        }

        return {
            role: message.from === 'Me' ? 'user' : 'assistant',
            content,
        }
    }

    private buildFirstMessage(youAre: string): ChatCompletionMessageParam {
        return {
            role: 'system',
            content: `You are ${youAre}.`,
        }
    }

    private buildSkillMessages(
        skill: SerializedBot<Schema>['skill']
    ): ChatCompletionMessageParam[] {
        if (!skill) {
            return []
        }

        const messages: ChatCompletionMessageParam[] = []

        messages.push(
            this.buildYourJobMessage(skill.yourJobIfYouChooseToAcceptItIs)
        )

        if (skill.stateSchema) {
            messages.push(this.buildStateSchemaMessage(skill.stateSchema))
        }

        if (skill.state) {
            messages.push(this.buildStateMessage(skill.state))
        }

        if (skill.weAreDoneWhen) {
            messages.push(this.buildWeAreDoneWhenMessage(skill.weAreDoneWhen))
        }

        if (skill.callbacks) {
            messages.push(this.buildCallbacksMessage(skill.callbacks))
        }

        if (skill.pleaseKeepInMindThat) {
            messages.push(
                this.buildPleaseKeepInMindMessage(skill.pleaseKeepInMindThat)
            )
        }

        return messages
    }

    private buildCallbacksMessage(
        callbacks: LlmCallbackMap
    ): ChatCompletionMessageParam {
        const keys = Object.keys(callbacks)
        const descriptions: string[] = []

        for (const key of keys) {
            const callback = callbacks[key]
            let definition = `<Function name="${key}">
                <Description>For use when ${callback.useThisWhenever}</Description>`

            if (callback.parameters) {
                let params = '<Parameters>'
                for (const param of callback.parameters) {
                    params += `
                        <Parameter${param.isRequired ? ' required="true"' : ''}>
                            <Name>${param.name}</Name>
                            <Type>${param.type}</Type>
                            ${param.description ? `<Description>${param.description}</Description>` : ''}
                        </Parameter>`
                }
                params += '</Parameters>'
                definition += params
            }

            definition += `</Function>`
            descriptions.push(definition)
        }
        const api = `<APIReference>\n\n${descriptions.join('\n\n')}</APIReference>`

        return {
            role: 'system',
            content: `You have an API available to you to lookup answers. When you need the response of the function call to proceed, you can call a function using a custom markup we created that looks like this: << FunctionName />>. The API will respond with the results and then you can continue the conversation with your new knowledge. If the api call has parameters, call it like this: << FunctionName >>parameters json encoded<</ FunctionName >>. Make sure to json encode the data and drop it between the function tags. I will respond with the api's response and you can use it going forward. The api is as follows (in xml format):\n\n${api}`,
        }
    }

    private buildPleaseKeepInMindMessage(
        pleaseKeepInMindThat: string[]
    ): ChatCompletionMessageParam {
        return {
            role: 'system',
            content: `During this conversation, please keep the following in mind:\n\n${pleaseKeepInMindThat.map((m, idx) => `${idx + 1}. ${m}`).join('\n')}.`,
        }
    }

    private buildStateMessage(
        state: Record<string, any>
    ): ChatCompletionMessageParam {
        return {
            role: 'system',
            content: `The current state of this conversation is:\n\n${JSON.stringify(state)}. As the state is being updated, send it back to me in json format (something in can JSON.parse()) at the end of each response (it's not meant for reading, but for parsing, so don't call it out, but send it as we progress), surrounded by a boundary, like this: ${STATE_BOUNDARY} { "fieldName": "fieldValue" } ${STATE_BOUNDARY}`,
        }
    }

    private buildYourJobMessage(yourJob: string): ChatCompletionMessageParam {
        return {
            role: 'system',
            content: `For this interaction, your job is ${yourJob}.`,
        }
    }

    private buildWeAreDoneWhenMessage(
        weAreDoneWhen: string
    ): ChatCompletionMessageParam {
        return {
            role: 'system',
            content: `Our conversation is done when ${weAreDoneWhen}. Once you determine we are done, send me the following message so I know we're done: ${DONE_TOKEN}`,
        }
    }

    private buildStateSchemaMessage(
        schema: Schema
    ): ChatCompletionMessageParam {
        return {
            role: 'system',
            content: `We will be tracking state for this conversation. The following schema is what we'll use to define the shape of the state:\n\n${JSON.stringify(schema)}`,
        }
    }
}
