import { assertOptions } from '@sprucelabs/schema'
import {
    test,
    suite,
    assert,
    errorAssert,
    generateId,
} from '@sprucelabs/test-utils'
import AbstractLlmTest from '../../support/AbstractLlmTest'

@suite()
export default class AthropicTest extends AbstractLlmTest {
    @test()
    protected async throwsWithMissing() {
        //@ts-ignore
        const err = assert.doesThrow(() => new Athropic())
        errorAssert.assertError(err, 'MISSING_PARAMETERS', {
            parameters: ['apiKey'],
        })
    }

    @test()
    protected async canCreateWithRequired() {
        new Athropic(generateId())
    }
}

class Athropic {
    public constructor(apiKey: string) {
        assertOptions({ apiKey }, ['apiKey'])
    }
}
