import {
    LlmAdapter,
    LlmCallbackMap,
    LlmMessage,
    MessageResponseCallback,
    SendMessage,
    SprucebotLlmBot,
    SprucebotLLmSkill,
} from '../llm.types'
import ResponseParser from '../parsingResponses/ResponseParser'

export default class TurnRequest {
    private trackMessage: (message: LlmMessage) => void
    private skill?: SprucebotLLmSkill
    private adapter: LlmAdapter
    private setDone: (isDone: boolean) => void
    private optionallyUpdateState: (
        state?: Record<string, any>
    ) => Promise<void>
    private bot: SprucebotLlmBot
    private isCancelled = false

    public constructor(options: {
        trackMessage: (message: LlmMessage) => void
        setDone: (isDone: boolean) => void
        bot: SprucebotLlmBot
        skill?: SprucebotLLmSkill
        adapter: LlmAdapter
        optionallyUpdateState: (state?: Record<string, any>) => Promise<void>
    }) {
        const {
            trackMessage,
            skill,
            bot,
            adapter,
            setDone,
            optionallyUpdateState,
        } = options
        this.trackMessage = trackMessage
        this.skill = skill
        this.adapter = adapter
        this.setDone = setDone
        this.bot = bot
        this.optionallyUpdateState = optionallyUpdateState
    }

    public cancel() {
        this.isCancelled = true
    }

    public async sendMessage(
        llmMessage: LlmMessage,
        cb?: MessageResponseCallback
    ): Promise<string> {
        this.trackMessage(llmMessage)

        const { model, callbacks } = this.skill?.serialize() ?? {}
        const llmResponse = await this.sendMessageToAdapter(model)

        if (this.isCancelled) {
            return ''
        }

        let parsedMessage: string
        let isDone: boolean
        let state: Record<string, any> | undefined
        let callbackResults: SendMessage | undefined

        try {
            const parsed = await this.parseResponse(llmResponse, callbacks)
            parsedMessage = parsed.message
            isDone = parsed.isDone
            state = parsed.state
            callbackResults = parsed.callbackResults
        } catch (err: any) {
            this.trackMessage({
                from: 'You',
                message: llmResponse,
            })
            if (
                err.options?.code === 'INVALID_CALLBACK' ||
                err.options?.code === 'CALLBACK_ERROR'
            ) {
                return this.sendMessage(
                    { from: 'Api', message: `Error: ${err.message}` },
                    cb
                )
            }
            throw err
        }

        this.setDone(isDone)

        await this.optionallyUpdateState(state)

        this.trackMessage({
            from: 'You',
            message: llmResponse,
        })

        cb?.(parsedMessage)

        if (callbackResults) {
            let message: LlmMessage | undefined
            if (typeof callbackResults === 'string') {
                message = {
                    from: 'Api',
                    message: `API Results: ${callbackResults}`,
                }
            } else {
                message = {
                    from: 'Api',
                    imageBase64: callbackResults.imageBase64,
                    message: `API Results: ${callbackResults.imageDescription}`,
                }
            }
            await this.sendMessage(message, cb)
        }

        return parsedMessage
    }

    private async sendMessageToAdapter(model: string | undefined) {
        return await this.adapter.sendMessage(this.bot, {
            model,
        })
    }

    private async parseResponse(response: string, callbacks?: LlmCallbackMap) {
        const parser = ResponseParser.getInstance()
        const parsed = await parser.parse(response, callbacks)
        return parsed
    }
}
