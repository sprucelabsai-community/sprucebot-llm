import { Schema, SchemaValues, assertOptions } from '@sprucelabs/schema'
import { assert } from '@sprucelabs/test-utils'
import SprucebotLlmSkillImpl from '../bots/SprucebotLlmSkillImpl'
import { LlmCallback, SkillOptions } from '../llm.types'

export default class MockLlmSkill<
    StateSchema extends Schema = Schema,
    State extends SchemaValues<StateSchema> = SchemaValues<StateSchema>,
> extends SprucebotLlmSkillImpl<StateSchema, State> {
    public static instance: MockLlmSkill

    public constructor(options: SkillOptions<StateSchema, State>) {
        super(options)
        assertOptions(options, ['yourJobIfYouChooseToAcceptItIs'])
        MockLlmSkill.instance = this
    }

    public assertYourJobEquals(expected: string) {
        assert.isEqual(
            this.options.yourJobIfYouChooseToAcceptItIs,
            expected,
            'yourJobIfYouChooseToAcceptItIs passed to constructor does not equal expected'
        )
    }

    public assertWeAreDoneWhenEquals(expected: string | undefined) {
        assert.isEqual(
            this.options.weAreDoneWhen,
            expected,
            'weAreDoneWhen passed to constructor does not equal expected'
        )
    }

    public assertPleaseKeepInMindEquals(expected: string[] | undefined) {
        assert.isEqualDeep(
            this.options.pleaseKeepInMindThat,
            expected,
            'pleaseKeepInMindThat passed to constructor does not equal expected'
        )
    }

    public assertModelEquals(model: string | undefined) {
        assert.isEqual(
            this.options.model,
            model,
            'model passed to constructor does not equal expected'
        )
    }

    public assertStateSchemaEquals(expected: Schema | undefined) {
        assert.isEqualDeep(
            this.stateSchema,
            expected,
            'stateSchema passed to constructor does not equal expected'
        )
    }

    public assertHasCallback(
        name: string,
        expectedOptions?: Omit<LlmCallback, 'cb'>
    ) {
        const { cb, ...options } = this.options.callbacks?.[name] ?? {}

        assert.isTruthy(cb, 'Could not find callback with name: ' + name)

        if (expectedOptions) {
            assert.isEqualDeep(
                options,
                expectedOptions,
                `the options for the '${name}' callback don\`t match`
            )
        }
    }
}
