import { CALLBACK_BOUNDARY } from '../bots/templates'

export default function renderPlaceholder(key: string): string {
	return `${CALLBACK_BOUNDARY} ${key} ${CALLBACK_BOUNDARY}`
}
