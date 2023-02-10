import { buildSchema, Schema, SchemaPartialValues } from '@sprucelabs/schema'
import { test, assert, errorAssert, generateId } from '@sprucelabs/test-utils'
import SprucebotLlmSkillImpl from '../../../bots/SprucebotLlmSkillImpl'
import { SkillOptions, SprucebotLLmSkill } from '../../../llm.types'
import AbstractLlmTest from '../../support/AbstractLlmTest'
import { personSchema } from '../../support/schemas/personSchema'

export default class SkillTest extends AbstractLlmTest {
	private static skill: SprucebotLLmSkill
	private static readonly emptyState = {}

	protected static async beforeEach() {
		await super.beforeEach()
		this.skill = this.Skill()
	}

	@test()
	protected static async skillThrowsWhenMissing() {
		//@ts-ignore
		const err = assert.doesThrow(() => this.bots.Skill())
		errorAssert.assertError(err, 'MISSING_PARAMETERS', {
			parameters: ['yourJobIfYouChooseToAcceptItIs', 'weAreDoneWhen'],
		})
	}

	@test()
	protected static canCreateSkill() {
		assert.isInstanceOf(this.skill, SprucebotLlmSkillImpl)
	}

	@test()
	protected static async canSerializeSkill() {
		const options = {
			weAreDoneWhen: generateId(),
			yourJobIfYouChooseToAcceptItIs: generateId(),
			pleaseKeepInMindThat: [generateId(), generateId()],
			stateSchema: personSchema,
			state: this.emptyState,
		}

		this.skill = this.Skill(options)

		const serialized = this.skill.serialize()

		assert.isEqualDeep(serialized, options)
	}

	@test()
	protected static async canAddSkillToBotAndReturnItSerializing() {
		const bot = this.Bot({
			skill: this.skill,
		})

		const { skill } = bot.serialize()
		assert.isEqualDeep(skill, this.skill.serialize())
	}

	@test()
	protected static async updatingStateEmitsEvent() {
		this.skill = this.Skill({
			stateSchema: personSchema,
		})

		let wasHit = false
		await this.skill.on('did-update-state', () => {
			wasHit = true
		})

		const updates = {
			firstName: generateId(),
		}
		await this.updateState(updates)

		assert.isTrue(wasHit)
	}

	@test()
	protected static async canGetAndUpdateState() {
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
	protected static async canPassStateInContructor() {
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
	protected static async honorsDefaultValuesInState() {
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

	private static assertStateEquals(expected: SchemaPartialValues<Schema>) {
		const state = this.skill.getState()
		assert.isEqualDeep(state, expected)
	}

	private static async updateState(updates: SchemaPartialValues<Schema>) {
		await this.skill.updateState(updates)
	}
}
