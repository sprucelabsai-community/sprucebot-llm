import { SpruceErrors } from "#spruce/errors/errors.types"
import { ErrorOptions as ISpruceErrorOptions} from "@sprucelabs/error"

export interface NoBotInstanceSetErrorOptions extends SpruceErrors.SprucebotLlm.NoBotInstanceSet, ISpruceErrorOptions {
	code: 'NO_BOT_INSTANCE_SET'
}
export interface InvalidCallbackErrorOptions extends SpruceErrors.SprucebotLlm.InvalidCallback, ISpruceErrorOptions {
	code: 'INVALID_CALLBACK'
}

type ErrorOptions =  | NoBotInstanceSetErrorOptions  | InvalidCallbackErrorOptions 

export default ErrorOptions
