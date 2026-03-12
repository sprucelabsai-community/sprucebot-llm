import ResponseParserV1 from './ResponseParserV1'

export default class ResponseParserFactory {
    public static getParserInstance() {
        return ResponseParserV1.getInstance()
    }
}
