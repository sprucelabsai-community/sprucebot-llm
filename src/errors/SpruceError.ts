import BaseSpruceError from '@sprucelabs/error'
import ErrorOptions from '#spruce/errors/options.types'

export default class SpruceError extends BaseSpruceError<ErrorOptions> {
    /** an easy to understand version of the errors */
    public friendlyMessage(): string {
        const { options } = this
        let message
        switch (options?.code) {
            case 'NO_BOT_INSTANCE_SET':
                message = `You must create a bot and set it using 'SprucebotLlmFactory.setInstance(bot)' before you can get an instance of it.`
                break

            case 'INVALID_CALLBACK':
                message = `The callback you tried to invoke (${options.matchedCallback}) is not valid. If you are calling a valid callback, make sure the tag is closed correctly with />> or <</{tagname}>> depending on whether you are passing it arguments. Here is a list of valid callbacks for reference:\n${options.validCallbacks.map((name, idx) => `${idx + 1}: ${name}`).join('\n')}`
                break

            case 'CALLBACK_ERROR':
                message =
                    'The callback threw an error! Please check the details and try again.'

                if (options.originalError) {
                    message += `\n\nOriginal Error: ${options.originalError.message}`
                }

                break

            default:
                message = super.friendlyMessage()
        }

        const fullMessage = options.friendlyMessage
            ? options.friendlyMessage
            : message

        return fullMessage
    }
}
