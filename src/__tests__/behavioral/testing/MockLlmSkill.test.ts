import { buildSchema, Schema, SchemaValues } from '@sprucelabs/schema'
import {
    test,
    suite,
    assert,
    generateId,
    errorAssert,
} from '@sprucelabs/test-utils'
import { LlmCallback, SkillOptions } from '../../../llm.types'
import MockLlmSkill from '../../../tests/MockLlmSkill'
import AbstractLlmTest from '../../support/AbstractLlmTest'

@suite()
export default class MockLlmSkillTest extends AbstractLlmTest {
    private skill!: MockLlmSkill
    private skillOptions!: SkillOptions<Schema, SchemaValues<Schema>>

    protected async beforeEach(): Promise<void> {
        await super.beforeEach()

        this.skillOptions = {
            yourJobIfYouChooseToAcceptItIs: generateId(),
            weAreDoneWhen: generateId(),
            pleaseKeepInMindThat: [generateId(), generateId()],
            model: generateId(),
        }

        this.reloadSkill()
    }

    @test()
    protected async throwsWhenMissingRequired() {
        //@ts-ignore
        const err = assert.doesThrow(() => new MockLlmSkill())
        errorAssert.assertError(err, 'MISSING_PARAMETERS', {
            parameters: ['yourJobIfYouChooseToAcceptItIs'],
        })
    }

    @test()
    protected async assertYourJobDoesNotThrowIfMatches() {
        this.skill.assertYourJobEquals(
            this.skillOptions.yourJobIfYouChooseToAcceptItIs
        )
    }

    @test()
    protected async assertYourJobThrowsIfNotMatching() {
        assert.doesThrow(() => this.skill.assertYourJobEquals(generateId()))
    }

    @test()
    protected async weAreDoneWhenDoesNotThrowIfMatches() {
        this.skill.assertWeAreDoneWhenEquals(this.skillOptions.weAreDoneWhen)
    }

    @test()
    protected async weAreDoneWhenThrowsIfNotMatching() {
        assert.doesThrow(() =>
            this.skill.assertWeAreDoneWhenEquals(generateId())
        )
    }

    @test()
    protected async pleaseKeepInMindThatDoesNotThrowIfMatches() {
        this.skill.assertPleaseKeepInMindEquals([
            ...(this.skillOptions.pleaseKeepInMindThat ?? []),
        ])
    }

    @test()
    protected async pleaseKeepInMindThatThrowsIfNotMatching() {
        assert.doesThrow(() =>
            this.skill.assertPleaseKeepInMindEquals([generateId()])
        )
    }

    @test()
    protected async modelDoesNotThrowIfMatches() {
        this.skill.assertModelEquals(this.skillOptions.model)
    }

    @test()
    protected async modelThrowsIfNotMatching() {
        assert.doesThrow(() => this.skill.assertModelEquals(generateId()))
    }

    @test()
    protected async canUpdateState() {
        this.reloadSkillWithState1()

        const state = {
            id: generateId(),
        }

        const firstName = generateId()

        await this.updateState(state)
        this.assertStateEquals(state)

        await this.updateState({
            firstName,
        })

        this.assertStateEquals({
            ...state,
            firstName,
        })
    }

    @test()
    protected async newStateUpdateWins() {
        this.reloadSkillWithState1()

        let id = generateId()
        await this.updateState({ id })

        id = generateId()
        await this.updateState({ id })

        this.assertStateEquals({ id })
    }

    @test()
    protected async throwsIfStateSchemaDoesNotMatch() {
        this.reloadSkillWithState1()
        assert.doesThrow(() =>
            this.skill.assertStateSchemaEquals({
                id: generateId(),
                fields: {
                    id: {
                        type: 'text',
                    },
                    firstName: {
                        type: 'text',
                        isRequired: true,
                    },
                },
            })
        )
    }

    @test()
    protected async throwsIfStateSchemaDoesNotMatch2() {
        this.reloadSkillWithState1()
        assert.doesThrow(() =>
            this.skill.assertStateSchemaEquals({
                id: stateSchema1.id,
                fields: {
                    id: {
                        type: 'text',
                    },
                    firstName: {
                        type: 'text',
                        isRequired: true,
                    },
                },
            })
        )
    }

    @test()
    protected async doesNotThrowIfStateSchemaMatches() {
        this.reloadSkillWithState1()
        this.skill.assertStateSchemaEquals(stateSchema1)
    }

    @test()
    protected async throwsIfDoesNotHaveCallback() {
        this.assertDoesNotHaveCallback(generateId())
    }

    @test()
    protected async doesNotThrowIfHasCallback() {
        const cbName = generateId()
        this.skillOptions.callbacks = {
            [cbName]: {
                cb: () => '',
                useThisWhenever: generateId(),
            },
        }

        this.reloadSkill()
        this.assertHasCallback(cbName)
        this.assertDoesNotHaveCallback(generateId())
    }

    @test()
    protected async throwsIfCallbackOptionsDoNotMatch() {
        const cbName = generateId()
        this.skillOptions.callbacks = {
            [cbName]: {
                cb: () => '',
                useThisWhenever: generateId(),
            },
        }

        this.reloadSkill()
        assert.doesThrow(() =>
            this.assertHasCallback(cbName, { useThisWhenever: generateId() })
        )
    }

    @test()
    protected async doesNotThrowIfCallbackOptionsMatch() {
        const cbName = generateId()
        const useThisWhenever = generateId()
        this.skillOptions.callbacks = {
            [cbName]: {
                cb: () => '',
                useThisWhenever,
            },
        }

        this.reloadSkill()
        this.assertHasCallback(cbName, { useThisWhenever })
    }

    @test()
    protected async throwsIfCallbackParametersDoNotMatch() {
        const cbName = generateId()
        const useThisWhenever = generateId()
        this.skillOptions.callbacks = {
            [cbName]: {
                cb: () => '',
                useThisWhenever,
                parameters: [
                    {
                        name: generateId(),
                        type: 'text',
                    },
                ],
            },
        }

        this.reloadSkill()
        assert.doesThrow(() =>
            this.assertHasCallback(cbName, { useThisWhenever })
        )
    }

    @test()
    protected async doesNotThrowIfCallbackParametersMatch() {
        const cbName = generateId()
        const useThisWhenever = generateId()
        const parameters = [
            {
                name: generateId(),
                type: generateId(),
            },
        ]
        this.skillOptions.callbacks = {
            [cbName]: {
                cb: () => '',
                useThisWhenever,
                parameters,
            },
        }

        this.reloadSkill()
        this.assertHasCallback(cbName, { useThisWhenever, parameters })
    }

    private assertDoesNotHaveCallback(expected: string) {
        assert.doesThrow(() => this.assertHasCallback(expected))
    }

    private assertHasCallback(
        expected: string,
        options?: Omit<LlmCallback, 'cb'>
    ): any {
        return this.skill.assertHasCallback(expected, options)
    }

    private reloadSkillWithState1() {
        this.skillOptions.stateSchema = stateSchema1
        this.reloadSkill()
    }

    private assertStateEquals(state: State1) {
        const actual = this.getState()
        assert.isEqualDeep(actual, state, 'State was not updated')
    }

    private getState() {
        return this.skill.getState()
    }

    private async updateState(state: State1) {
        await this.skill.updateState(state)
    }

    private reloadSkill() {
        this.skill = new MockLlmSkill(this.skillOptions)
    }
}

const stateSchema1 = buildSchema({
    id: generateId(),
    fields: {
        id: {
            type: 'id',
        },
        firstName: {
            type: 'text',
        },
    },
})

type StateSchema1 = typeof stateSchema1
type State1 = SchemaValues<StateSchema1>
