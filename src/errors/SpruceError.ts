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
                message = `The callback you tried to invoke (${options.matchedCallback}) failed. Here are common reasons:

1. The callback does not exist (see valid callbacks below).
2. Syntax error in tags with no arguments. Make sure the callback is in the form of <<callbackName/>> (double << >> and closing forward slash / before the closing >>) and not <<callbackName>>.
3. Syntax error in tags with arguments. Make sure the callback is in the form of <<callbackName>>{{JSON arguments}}<</callbackName>> and not <<callbackName>>{{JSON arguments}}<</callbackName> (missing closing >> in the opening tag).
4. Syntax error in the JSON arguments. Make sure the JSON is valid and properly formatted.

Next steps:

1. Don't just takes stabs at it, review the syntax rules for callbacks and make sure your tags are properly formatted.
    1a. <<callbackName/>> for callbacks with no arguments.
    1b. <<callbackName>>{"valid": "json"}<</callbackName>> for callbacks with arguments.
2. Check the list of valid callbacks (below) below to ensure the callback you are trying to invoke actually exists.

Valid callbacks:

${options.validCallbacks.map((name, idx) => `${idx + 1}: ${name}`).join('\n')}`
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
