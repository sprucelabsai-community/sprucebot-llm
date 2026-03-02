import { SchemaRegistry } from '@sprucelabs/schema'
import { SpruceErrors } from '../errors.types'



const stateUpdateFailedSchema: SpruceErrors.SprucebotLlm.StateUpdateFailedSchema  = {
	id: 'stateUpdateFailed',
	namespace: 'SprucebotLlm',
	name: 'State Update Failed',
	    fields: {
	    }
}

SchemaRegistry.getInstance().trackSchema(stateUpdateFailedSchema)

export default stateUpdateFailedSchema
