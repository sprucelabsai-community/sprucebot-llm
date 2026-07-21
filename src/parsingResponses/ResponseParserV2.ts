import { DONE_TOKEN } from '../bots/templates'
import {
    ResponseParser,
    LlmCallbackMap,
    ParsedResponse,
    SendMessage,
    LmmCallbackResponse,
} from '../llm.types'
import validateAndNormalizeCallbackOptions from './validateAndNormalizeCallbackOptions'

const RESERVED_CALLBACK_NAMES = new Set(['updateState', 'results'])

/**
 * Always produce a serializable error representation for @results.
 * Plain Error becomes its message (never {}). Schema-like errors with enumerable
 * payload fall back to message string for a stable wire format.
 */
export function serializeCallbackError(err: unknown): string {
    if (err instanceof Error) {
        return err.message && err.message.length > 0 ? err.message : 'Error'
    }
    if (typeof err === 'string') {
        return err
    }
    if (err === null) {
        return 'null'
    }
    if (err === undefined) {
        return 'undefined'
    }
    if (typeof err === 'symbol') {
        return String(err)
    }
    try {
        const json = JSON.stringify(err)
        if (json && json !== '{}') {
            return json
        }
    } catch {
        // fall through
    }
    try {
        return String(err)
    } catch {
        return 'Unknown error'
    }
}

/** Find matching closing brace for a JSON object starting at openIdx ('{'). */
function findMatchingBrace(text: string, openIdx: number): number {
    let depth = 0
    let inString = false
    let escape = false
    for (let i = openIdx; i < text.length; i++) {
        const ch = text[i]
        if (inString) {
            if (escape) {
                escape = false
                continue
            }
            if (ch === '\\') {
                escape = true
                continue
            }
            if (ch === '"') {
                inString = false
            }
            continue
        }
        if (ch === '"') {
            inString = true
            continue
        }
        if (ch === '{') {
            depth++
        } else if (ch === '}') {
            depth--
            if (depth === 0) {
                return i
            }
        }
    }
    return -1
}

interface CallSpan {
    name: string
    fullMatch: string
    argsJson?: string
    start: number
    end: number
}

/**
 * Extract @name(...) call spans. Supports multi-line JSON objects via brace-depth
 * scanning and optional leading/trailing whitespace on the call line.
 */
function extractCallbackSpans(message: string): CallSpan[] {
    const spans: CallSpan[] = []
    const re = /^[ \t]*@([A-Za-z_]\w*)\(/gm
    let m: RegExpExecArray | null
    while ((m = re.exec(message)) !== null) {
        const name = m[1]
        const start = m.index
        const openParen = m.index + m[0].length - 1
        let i = openParen + 1
        while (i < message.length && /[ \t\r\n]/.test(message[i])) {
            i++
        }

        let argsJson: string | undefined
        let closeParen: number

        if (i < message.length && message[i] === ')') {
            closeParen = i
            argsJson = undefined
        } else if (i < message.length && message[i] === '{') {
            const braceEnd = findMatchingBrace(message, i)
            if (braceEnd < 0) {
                spans.push({
                    name,
                    fullMatch: message.slice(start),
                    start,
                    end: message.length,
                })
                break
            }
            argsJson = message.slice(i, braceEnd + 1)
            let j = braceEnd + 1
            while (j < message.length && /[ \t\r\n]/.test(message[j])) {
                j++
            }
            if (j >= message.length || message[j] !== ')') {
                spans.push({
                    name,
                    fullMatch: message.slice(start, braceEnd + 1),
                    argsJson,
                    start,
                    end: braceEnd + 1,
                })
                re.lastIndex = braceEnd + 1
                continue
            }
            closeParen = j
        } else {
            re.lastIndex = openParen + 1
            continue
        }

        let end = closeParen! + 1
        // Include trailing newline after the call when present (common LLM layout)
        if (message[end] === '\r') {
            end++
        }
        if (message[end] === '\n') {
            end++
        }
        // Leading newline is part of fullMatch when start points after prior content;
        // also absorb a single leading newline just before the match for strip parity
        // with historic `\n@name(...)\n` fixtures.
        let matchStart = start
        if (matchStart > 0 && message[matchStart - 1] === '\n') {
            matchStart--
            if (matchStart > 0 && message[matchStart - 1] === '\r') {
                matchStart--
            }
        }

        spans.push({
            name,
            fullMatch: message.slice(matchStart, end),
            argsJson,
            start: matchStart,
            end,
        })
        re.lastIndex = end
    }
    return spans
}

function stripCallFromMessage(message: string, fullMatch: string): string {
    // Historic behavior: remove the call span and glue surrounding text without
    // injecting separators (trim each side after split).
    return message
        .split(fullMatch)
        .map((s) => s.trim())
        .join('')
        .trim()
}

export default class ResponseParserV2 implements ResponseParser {
    public async parse(
        response: string,
        callbacks?: LlmCallbackMap
    ): Promise<ParsedResponse> {
        let message: string | null = response.replace(DONE_TOKEN, '').trim()
        let state: Record<string, any> | undefined = undefined
        let callbackResults: SendMessage | undefined = undefined

        // Enter the pass when any @name( call shape is present (incl. typos)
        // or when a registered callback name appears as a call prefix.
        const hasCallShape = message != null && /^[ \t]*@\w+\(/m.test(message)
        const hasRegisteredName =
            callbacks != null &&
            Object.keys(callbacks).some((name) =>
                message!.includes(`@${name}(`)
            )
        const hasCallbacks = hasCallShape || hasRegisteredName

        if (hasCallbacks) {
            const { callbackResults: c, message: m } =
                await this.invokeCallbacks(message!, callbacks)
            callbackResults = c
            message = m
        }

        const hasState = response.includes('@updateState')
        if (hasState && message) {
            const stateMatches = [
                ...message.matchAll(/@updateState\(({[\s\S]*?})\)\n?/g),
            ]
            for (const stateMatch of stateMatches) {
                try {
                    state = JSON.parse(stateMatch[1])
                } catch (err) {
                    if (!callbackResults) {
                        callbackResults = ''
                    }
                    callbackResults += this.renderCallbackResults({
                        error: err,
                        name: 'updateState',
                    })
                }
                message = message.replace(stateMatch[0], '').trim()
            }
        }

        return {
            isDone: response.includes(DONE_TOKEN),
            message,
            callbackResults,
            state,
        }
    }

    private async invokeCallbacks(
        message: string,
        callbacks: LlmCallbackMap | undefined
    ): Promise<{
        callbackResults: SendMessage | undefined
        message: string | null
    }> {
        let callbackStrippedMessage = message
        let callbackResults = ''

        const spans = extractCallbackSpans(message)
        for (const span of spans) {
            if (RESERVED_CALLBACK_NAMES.has(span.name)) {
                continue
            }

            const name = span.name

            // Always strip the call from the user-facing message once recognized.
            callbackStrippedMessage = stripCallFromMessage(
                callbackStrippedMessage,
                span.fullMatch
            )

            let options: any
            try {
                options = span.argsJson ? JSON.parse(span.argsJson) : undefined
            } catch (err: any) {
                callbackResults += this.renderCallbackResults({
                    name,
                    error: `Invalid JSON arguments for @${name}: ${err?.message ?? String(err)}. Arguments must be valid JSON object.`,
                })
                continue
            }

            const callback = callbacks?.[name]
            if (!callback) {
                callbackResults += this.renderCallbackResults({
                    name,
                    error: `Unknown callback @${name} — not registered.`,
                })
                continue
            }

            try {
                if (callback?.parameters) {
                    validateAndNormalizeCallbackOptions(
                        callback.parameters,
                        options
                    )
                }
                const results = await callback?.cb(options)
                callbackResults += this.renderCallbackResults({ name, results })
            } catch (err) {
                callbackResults += this.renderCallbackResults({
                    name,
                    error: err,
                })
            }
        }

        callbackResults = callbackResults.trim()
        return {
            callbackResults:
                callbackResults.length > 0 ? callbackResults : undefined,
            message:
                callbackStrippedMessage.length > 0
                    ? callbackStrippedMessage
                    : null,
        }
    }

    private renderCallbackResults(callbackOptions: {
        name: string
        results?: LmmCallbackResponse | undefined
        error?: any
    }) {
        const { name, results, error } = callbackOptions
        if (error !== undefined) {
            return `@results ${JSON.stringify({
                name,
                error: serializeCallbackError(error),
            })}\n`
        }
        // Multiline string results: header only + raw body (real newlines).
        // Trailing newline separates blocks when multiple callbacks run.
        if (typeof results === 'string') {
            return `@results ${JSON.stringify({ name })}\n${results}\n`
        }
        // undefined results: omit results key (historic wire shape).
        if (results === undefined) {
            return `@results ${JSON.stringify({ name })}\n`
        }
        return `@results ${JSON.stringify({ name, results })}\n`
    }

    public getStateUpdateInstructions(): string {
        return `Updating state works similar to all function calls. Use the following syntax:
@updateState({ "field1": "value1", "field2": "value2" })
Make sure to json encode only the fields you want to change. You can update state once and do it at the end of any messages you send. Multi-line JSON objects are accepted (pretty-printed objects are parsed). IMPORTANT: Prefer a single JSON object argument; do not omit braces.
Your user-facing message is always sent to the user, even if @updateState fails. If @updateState fails later, do not repeat the same message. Only send the specific @updateState needed to fix the missing state change.
Good example:
@updateState({ "favoriteColor": "blue", "firstName": "Taylor" })
Bad examples:
@updateState
{ "favoriteColor": "blue" }
@updateState({ favoriteColor: "blue" })`
    }

    public getFunctionCallInstructions(): string {
        return `A function call is done using the following syntax:
@callbackName({ "key": "value" })
Make sure to json encode the options. You can call as many callbacks as you want in a single response by including multiple @functionName() lines. Multi-line JSON arguments are accepted (pretty-printed objects are parsed). Failed callbacks always return a serializable error string in @results — never silence failures and never return an empty error object.
Your user-facing message is always sent to the user, even if a callback fails. Successful callbacks have already run successfully. If a callback fails later, do not repeat the same message and do not repeat successful callbacks. Only call the specific callback needed to fix the failed gap.
Good example:
@lookupWeather({ "zip": "80524" })
Bad examples:
@lookupWeather { "zip": "80524" }
@lookupWeather({ zip: "80524" })`
    }
}

export type ParserCallbackStyle = '@callback' | '@functionCall'
