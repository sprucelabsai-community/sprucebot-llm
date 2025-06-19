import { buildSchema, Schema, SchemaPartialValues } from '@sprucelabs/schema'
import {
    test,
    suite,
    assert,
    errorAssert,
    generateId,
} from '@sprucelabs/test-utils'
import OpenAiAdapter from '../../../bots/adapters/OpenAi'
import SpyOpenAiApi from '../../../bots/adapters/SpyOpenAiApi'
import SprucebotLlmSkillImpl from '../../../bots/SprucebotLlmSkillImpl'
import { LlmCallbackMap, SprucebotLLmSkill } from '../../../llm.types'
import AbstractLlmTest from '../../support/AbstractLlmTest'
import { personSchema } from '../../support/schemas/personSchema'

@suite()
export default class SkillTest extends AbstractLlmTest {
    private skill!: SprucebotLLmSkill
    private readonly emptyState = {}

    protected async beforeEach() {
        await super.beforeEach()
        this.skill = this.Skill()
    }

    @test()
    protected async skillThrowsWhenMissing() {
        //@ts-ignore
        const err = assert.doesThrow(() => this.bots.Skill())
        errorAssert.assertError(err, 'MISSING_PARAMETERS', {
            parameters: ['yourJobIfYouChooseToAcceptItIs'],
        })
    }

    @test()
    protected canCreateSkill() {
        assert.isInstanceOf(this.skill, SprucebotLlmSkillImpl)
    }

    @test()
    protected async canSerializeSkill() {
        const options = {
            weAreDoneWhen: generateId(),
            yourJobIfYouChooseToAcceptItIs: generateId(),
            pleaseKeepInMindThat: [generateId(), generateId()],
            stateSchema: personSchema,
            state: this.emptyState,
        }

        this.skill = this.Skill(options)

        const serialized = this.serialize()

        assert.isEqualDeep(serialized, options)
    }

    @test()
    protected async canAddSkillToBotAndReturnItSerializing() {
        const bot = this.Bot({
            skill: this.skill,
        })

        const { skill } = bot.serialize()
        assert.isEqualDeep(skill, this.skill.serialize())
    }

    @test()
    protected async updatingStateEmitsEvent() {
        this.skill = this.Skill({
            stateSchema: personSchema,
        })

        let wasHit = false
        await this.skill.on('did-update-state', () => {
            wasHit = true
        })

        await this.updateState({
            firstName: generateId(),
        })

        assert.isTrue(wasHit)
    }

    @test()
    protected async canGetAndUpdateState() {
        this.skill = this.Skill({
            stateSchema: personSchema,
        })

        const expected: Record<string, any> = {
            ...this.emptyState,
        }

        this.assertStateEquals(expected)

        expected.firstName = 'test'
        await this.updateState({
            firstName: expected.firstName,
        })

        this.assertStateEquals(expected)

        expected.lastName = generateId()
        await this.updateState({
            lastName: expected.lastName,
        })
        this.assertStateEquals(expected)
    }

    @test()
    protected async canPassStateInContructor() {
        const state = {
            firstName: generateId(),
        }

        this.skill = this.Skill({
            stateSchema: personSchema,
            state,
        })

        this.assertStateEquals({ ...state })
    }

    @test()
    protected async honorsDefaultValuesInState() {
        const stateSchema = buildSchema({
            id: 'test',
            fields: {
                ...personSchema.fields,
                age: {
                    type: 'number',
                    isRequired: true,
                    defaultValue: 21,
                },
            },
        })

        this.skill = this.Skill({
            stateSchema,
        })

        this.assertStateEquals({
            age: 21,
        })
    }

    @test()
    protected async passesPlaceholdersThroughToSerializedSkill() {
        const callbacks: LlmCallbackMap = {
            favoriteColorOptions: {
                cb: () => 'Taco, Burrito, Cheezy Crunch',
                useThisWhenever: 'you are asking for a persons favorite color',
            },
        }

        this.skill = this.Skill({
            callbacks,
        })

        assert.isEqualDeep(this.serialize().callbacks, callbacks)
    }

    @test()
    protected async skillCanSetModel() {
        OpenAiAdapter.OpenAI = SpyOpenAiApi as any

        const model =
            'davinci:ft-personal:sprucebot-concierge-2023-04-28-04-42-19'
        this.skill = this.Skill({
            model,
        })

        assert.isEqual(this.serialize().model, model)

        const bot = this.Bot({
            skill: this.skill,
        })

        await bot.sendMessage('what the!?')

        assert.isEqual(this.adapter.lastSendOptions?.model, model)
    }

    private serialize() {
        return this.skill.serialize()
    }

    private assertStateEquals(expected: SchemaPartialValues<Schema>) {
        const state = this.skill.getState()
        assert.isEqualDeep(state, expected)
    }

    private async updateState(updates: SchemaPartialValues<Schema>) {
        await this.skill.updateState(updates)
    }
}
