import AbstractSpruceTest, { test, suite, assert } from '@sprucelabs/test-utils'
import ResponseParserFactory, {
    ParserVersion,
} from '../../../parsingResponses/ResponseParserFactory'
import ResponseParserV1 from '../../../parsingResponses/ResponseParserV1'
import ResponseParserV2 from '../../../parsingResponses/ResponseParserV2'

@suite()
export default class ResponseParserFactoryTest extends AbstractSpruceTest {
    @test()
    protected async startsAtLatestVersion() {
        assert.isEqual(
            ResponseParserFactory.version,
            'v2',
            'Default version should be v2'
        )
        this.assertIsInstanceOfV2()
    }

    @test()
    protected async settingToV2ReturnsV2Parser() {
        ResponseParserFactory.version = 'v2'
        this.assertIsInstanceOfV2()
    }

    private assertIsInstanceOfV2() {
        const parser = ResponseParserFactory.getInstance()
        assert.isInstanceOf(
            parser,
            ResponseParserV2,
            'Did not return an instance of ResponseParserV2'
        )
    }

    @test('can set to v2', 'v2')
    @test('can set to v1', 'v1')
    protected async returnsCorrectVersion(version: ParserVersion) {
        ResponseParserFactory.version = version
        assert.isEqual(
            ResponseParserFactory.version,
            version,
            'Version did not return correct value'
        )
    }

    @test()
    protected async settingToV1ReturnsV1Parser() {
        ResponseParserFactory.version = 'v1'
        const parser = ResponseParserFactory.getInstance()
        assert.isInstanceOf(
            parser,
            ResponseParserV1,
            'Did not return an instance of ResponseParserV1'
        )
    }
}
