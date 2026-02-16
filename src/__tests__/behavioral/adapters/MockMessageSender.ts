import { assert, generateId } from '@sprucelabs/test-utils'
import {
    MessageSender,
    MessageSenderSendMessageOptions,
} from '../../../bots/adapters/MessageSender'
import { SprucebotLlmBot } from '../../../llm.types'

export default class MockMessegeSender implements MessageSender {
    public static instance: MockMessegeSender
    private sendOptions?: MessageSenderSendMessageOptions

    public constructor() {
        MockMessegeSender.instance = this
    }

    public async sendMessage(
        _bot: SprucebotLlmBot,
        options: MessageSenderSendMessageOptions
    ): Promise<string> {
        this.sendOptions = options
        return generateId()
    }

    public assertSendReceivedMemoryLimit(memoryLimit: number) {
        assert.isEqual(
            this.sendOptions?.memoryLimit,
            memoryLimit,
            'Expected to receive memory limit in send options'
        )
    }
}
