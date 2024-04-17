import { SchemaRegistry } from '@sprucelabs/schema'
import { SpruceErrors } from '../errors.types'

const noBotInstanceSetSchema: SpruceErrors.SprucebotLlm.NoBotInstanceSetSchema =
    {
        id: 'noBotInstanceSet',
        namespace: 'SprucebotLlm',
        name: 'No bot instance set',
        fields: {},
    }

SchemaRegistry.getInstance().trackSchema(noBotInstanceSetSchema)

export default noBotInstanceSetSchema
