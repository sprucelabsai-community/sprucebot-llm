import { SchemaRegistry } from '@sprucelabs/schema'
import { SpruceErrors } from '../errors.types'



const callbackErrorSchema: SpruceErrors.SprucebotLlm.CallbackErrorSchema  = {
	id: 'callbackError',
	namespace: 'SprucebotLlm',
	name: 'Callback error',
	    fields: {
	    }
}

SchemaRegistry.getInstance().trackSchema(callbackErrorSchema)

export default callbackErrorSchema
