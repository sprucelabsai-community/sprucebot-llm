import { ResponseParser } from '../llm.types'
import ResponseParserV1 from './ResponseParserV1'

export default class ResponseParserFactory {
    public static version: 'v1' | 'v2' = 'v1'
    private static instance: ResponseParser = new ResponseParserV1()

    public static setInstance(parser: ResponseParser) {
        this.instance = parser
    }

    public static getInstance() {
        return this.instance
    }
}
