export const STATE_BOUNDARY = '*****'
export const DONE_TOKEN = `____ DONE ____`
export const CALLBACK_BOUNDARY = 'xxxxx'

export const PROMPT_TEMPLATE = `You are <%= it.youAre %>


For this interaction, every message I send will start with "__Me__:" and I'll prompt you for your response by starting with "__You__:".

__Me__: Do you understand?
__You__: Yes

<% if (it.stateSchemaJson) { %>

Here is the schema that defines the state for this conversation:

<%= it.stateSchemaJson %>


Here is the current state, which is based on the schema above:

<%= it.stateJson %>


After each message, send the state in the form:

${STATE_BOUNDARY} <%= it.stateJson %> ${STATE_BOUNDARY}

__Me__: Sound good?
__You__: Yup!

${STATE_BOUNDARY} <%= it.stateJson %> ${STATE_BOUNDARY}

When asking me about a "select" field, make sure I only pick a valid choice by showing me their labels!<% } %>

<% if (it.skill) { %>
	
Your primary objective for this conversation is <%= it.skill.yourJobIfYouChooseToAcceptItIs %>
<% if (it.skill.callbacks) { %>
While we are talking
<% } %>
<% if (!it.stateSchemaJson && it.skill.weAreDoneWhen) { %>
We are done when <%= it.skill.weAreDoneWhen %> At that point, send me the following message so I know we are done:

${DONE_TOKEN}
<% } %>
<% } %>
<% if (it.stateSchemaJson) { %>

Once you have asked about every field in the schema, send me the following message:

${DONE_TOKEN}
<% } %>

Let's get started:

<% it.messages.forEach((message) => { %>
__<%= message.from %>__: <%= message.message %>

<% }) %>
__You__:`
