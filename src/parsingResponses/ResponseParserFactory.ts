import { ResponseParser } from '../llm.types'
import ResponseParserV1 from './ResponseParserV1'
import ResponseParserV2 from './ResponseParserV2'

export default class ResponseParserFactory {
    private static instance: ResponseParser = new ResponseParserV2()
    private static _version: ParserVersion = 'v2'

    public static set version(version: ParserVersion) {
        this._version = version
        this.instance =
            version === 'v1' ? new ResponseParserV1() : new ResponseParserV2()
    }

    public static get version() {
        return this._version
    }

    public static setInstance(parser: ResponseParser) {
        this.instance = parser
    }

    public static getInstance() {
        return this.instance
    }
}

export type ParserVersion = 'v1' | 'v2'
