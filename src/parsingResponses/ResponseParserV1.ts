import { DONE_TOKEN, STATE_BOUNDARY } from '../bots/templates'
import SpruceError from '../errors/SpruceError'
import {
    LlmCallback,
    LlmCallbackMap,
    ParsedResponse,
    ResponseParser,
    SendMessage,
} from '../llm.types'
import renderPlaceholder from './renderPlaceholder'
import validateAndNormalizeCallbackOptions from './validateAndNormalizeCallbackOptions'

export default class ResponseParserV1 implements ResponseParser {
    public async parse(
        response: string,
        callbacks?: LlmCallbackMap
    ): Promise<ParsedResponse> {
        let message = response.replace(DONE_TOKEN, '').trim()
        let state: Record<string, any> | undefined
        let callbackResults: SendMessage | undefined | void
        let callbacksInvoked = 0

        for (const key of Object.keys(callbacks || {})) {
            const match = message.match(renderPlaceholder(key))

            if (match) {
                message = await this.invokeCallbackAndDropInLegacyResults(
                    callbacks,
                    key,
                    message
                )
            }

            let xmlCallMatches = message.match(
                new RegExp(`<<\\s*${key}\\s*\/>>`, 'g')
            )

            let data: Record<string, any> | undefined

            if (!xmlCallMatches) {
                const matchWithJson = message
                    .matchAll(
                        new RegExp(
                            `<<\\s*${key}\\s*>>(.*?)<<\/\\s*${key}\\s*>>`,
                            'gs'
                        )
                    )
                    .next().value

                xmlCallMatches = matchWithJson?.[0]
                    ? [matchWithJson?.[0]]
                    : null

                try {
                    data = matchWithJson?.[1]
                        ? JSON.parse(matchWithJson?.[1])
                        : undefined
                } catch (error: any) {
                    throw new SpruceError({
                        code: 'CALLBACK_ERROR',
                        friendlyMessage: `The callback "${key}" was invoked with data that could not be parsed as JSON. The error was: ${error.message}`,
                        originalError: error,
                    })
                }
            }

            if (xmlCallMatches) {
                this.assertAtMostOneCallback(++callbacksInvoked)

                try {
                    const callback = callbacks?.[key]
                    if (data) {
                        data = this.validateAndNormalizeCallbackOptions(
                            callback,
                            data
                        )
                    }
                    callbackResults = await callback?.cb(data)
                    message = message.replace(xmlCallMatches[0], '').trim()
                } catch (error: any) {
                    throw new SpruceError({
                        code: 'CALLBACK_ERROR',
                        friendlyMessage: `Error while executing callback (${key}). The error is: ${error.message}`,
                        originalError: error,
                    })
                }
            }
        }

        const { match, regex } = this.parseState(message)

        if (match && regex) {
            message = message.replace(regex, '').trim()
            state = JSON.parse(match)
        }

        const matchedCallback = this.findFirstBadCallback(message)

        if (matchedCallback) {
            throw new SpruceError({
                code: 'INVALID_CALLBACK',
                validCallbacks: Object.keys(callbacks ?? {}),
                matchedCallback,
            })
        }

        return {
            isDone: this.doesIncludeDoneToken(response),
            state,
            message,
            callbackResults: callbackResults ?? undefined,
        }
    }

    private validateAndNormalizeCallbackOptions(
        callback: LlmCallback | undefined,
        options: Record<string, any>
    ) {
        options = validateAndNormalizeCallbackOptions(
            callback?.parameters ?? [],
            options
        )
        return options
    }

    private findFirstBadCallback(message: string) {
        const simpleMatches = message.match(new RegExp(`<<(.*)\/?>>`, 'g'))
        const extraJsonMatches = message.match(
            new RegExp(`<<.*?>>(.*?)<<\/.*?>>`, 'gs')
        )

        const matchedCallback = extraJsonMatches?.[0] || simpleMatches?.[0]
        return matchedCallback
    }

    private async invokeCallbackAndDropInLegacyResults(
        callbacks: LlmCallbackMap | undefined,
        key: string,
        message: string
    ) {
        const v = (await callbacks?.[key]?.cb()) as string
        message = message.replace(renderPlaceholder(key), v ?? '').trim()
        return message
    }

    private doesIncludeDoneToken(response: string): boolean {
        return response.includes(DONE_TOKEN)
    }

    private parseState(message: string) {
        const ESCAPED_BOUNDARY = STATE_BOUNDARY.replace(
            /[-[\]{}()*+?.,\\^$|#\s]/g,
            '\\$&'
        )
        const searchRegex = new RegExp(
            `((?:\\r?\\n)+)?${ESCAPED_BOUNDARY}\\s*(.*?)\\s*${ESCAPED_BOUNDARY}((?:\\r?\\n)+)?`,
            's'
        )
        const stateMatches = searchRegex.exec(message)
        const match = stateMatches?.[2]

        return { match, regex: match ? searchRegex : undefined }
    }

    private assertAtMostOneCallback(invocations: number) {
        if (invocations > 1) {
            throw new SpruceError({
                code: 'CALLBACK_ERROR',
                friendlyMessage:
                    'You can only invoke one callback per message. You will need to try to send that message again, but with only one callback invocation.',
            })
        }
    }

    public getStateUpdateInstructions(): string {
        return `Send updates to me in json format (something it can JSON.parse()) at the end of each response (it's not meant for reading, but for parsing, so don't call it out, but send it as we progress), surrounded by the State Boundary (${STATE_BOUNDARY}), like this:\n\n${STATE_BOUNDARY} { "fieldName": "fieldValue" } ${STATE_BOUNDARY}`
    }

    public getFunctionCallInstructions(): string {
        return `A function call looks like this: <<FunctionName/>>. The API will respond with the results and then you can continue the conversation with your new knowledge. If the api call has parameters, call it like this: <<FunctionName>>{{parametersJsonEncoded}}<</FunctionName>>. Make sure to json encode the data and drop it between the function tags. Note: You can only make one API call at a time`
    }
}
