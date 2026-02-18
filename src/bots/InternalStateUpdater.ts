import { normalizeSchemaValues, validateSchemaValues } from '@sprucelabs/schema'
import SprucebotLlmBotImpl from './SprucebotLlmBotImpl'
import SprucebotLlmSkillImpl from './SprucebotLlmSkillImpl'

export default class InternalStateUpdater {
    public static async updateState(
        skill: SprucebotLlmSkillImpl | SprucebotLlmBotImpl,
        updates: Record<string, any>
    ) {
        validateSchemaValues(skill.getStateSchema()!, updates)

        await skill.emitAndFlattenResponses('will-update-state', { updates })

        const state = { ...skill.getState(), ...updates }
        const normalized = normalizeSchemaValues(
            skill.getStateSchema()!,
            state,
            {
                shouldIncludeNullAndUndefinedFields: false,
            }
        )
        skill.silentlySetState(normalized)
        await skill.emit('did-update-state')
    }
}
