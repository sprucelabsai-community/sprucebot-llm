import { SpruceErrors } from "#spruce/errors/errors.types"
import { ErrorOptions as ISpruceErrorOptions} from "@sprucelabs/error"

export interface StateUpdateFailedErrorOptions extends SpruceErrors.SprucebotLlm.StateUpdateFailed, ISpruceErrorOptions {
	code: 'STATE_UPDATE_FAILED'
}
export interface NoBotInstanceSetErrorOptions extends SpruceErrors.SprucebotLlm.NoBotInstanceSet, ISpruceErrorOptions {
	code: 'NO_BOT_INSTANCE_SET'
}
export interface InvalidLlmAdapterErrorOptions extends SpruceErrors.SprucebotLlm.InvalidLlmAdapter, ISpruceErrorOptions {
	code: 'INVALID_LLM_ADAPTER'
}
export interface InvalidCallbackErrorOptions extends SpruceErrors.SprucebotLlm.InvalidCallback, ISpruceErrorOptions {
	code: 'INVALID_CALLBACK'
}
export interface CallbackErrorErrorOptions extends SpruceErrors.SprucebotLlm.CallbackError, ISpruceErrorOptions {
	code: 'CALLBACK_ERROR'
}

type ErrorOptions =  | StateUpdateFailedErrorOptions  | NoBotInstanceSetErrorOptions  | InvalidLlmAdapterErrorOptions  | InvalidCallbackErrorOptions  | CallbackErrorErrorOptions 

export default ErrorOptions
