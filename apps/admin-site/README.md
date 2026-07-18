# Admin Site

This workspace is reserved for the Codex Sites staff dashboard.

Do not build dashboard behavior ahead of the API authorization model. The first dashboard slice will consume tested endpoints for IT Support ticket listing, ticket details, assignment, and staff replies.

## Prototype

`index.html` is a standalone visual prototype for the Luca support workspace. It
uses local mock data only: chat replies, agent activity, and ticket escalation
are simulated in the browser and do not call the API, Supabase, Messenger, or an
AI provider.

Open `index.html` in a browser to preview it. The implementation lives in
`styles.css` and `app.js`; replace the simulated interactions only after the
corresponding API authorization and audit paths are implemented and tested.
