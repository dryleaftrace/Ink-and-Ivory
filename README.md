# Ink & Ivory

Two chess apps in one repo:

- **`docs/`** — a self-contained, single-file board. Play a friend locally, or against an alpha-beta search AI up to a Grandmaster tier. No server, no API key. **[Play it here](https://dryleaftrace.github.io/Ink-and-Ivory/)**.
- **Everything else** (`server.js`, `engine.js`, `claude-move.js`, `public/`) — a local Node app where Claude actually plays the moves instead of a search engine. Needs your own Anthropic API key and a running server, so it isn't hosted — see Setup below.

## How the Claude-powered version works

The board, rules, and legality checking are the same validated engine from the shareable artifact. On Claude's turn, the server sends Claude the current position and the exact list of legal moves, and asks it to pick one and add a short comment. Claude's choice is checked against that list — if it ever returns something that isn't an exact match, the server asks again (up to 3 tries) and falls back to a random legal move rather than getting stuck, so Claude can never make an illegal move or break the game.

## Setup

1. Clone the repo and install dependencies:
   ```
   git clone https://github.com/dryleaftrace/Ink-and-Ivory.git
   cd Ink-and-Ivory
   npm install
   ```

2. Provide Anthropic credentials, either:
   - Run `ant auth login` (recommended, if you have the Anthropic CLI), or
   - Set an API key: `export ANTHROPIC_API_KEY=sk-ant-...`

3. Start the server:
   ```
   npm start
   ```

4. Open http://localhost:4173 in your browser.

## Notes

- Each of Claude's moves is a real API call (model: `claude-opus-5`), so it costs a small amount and takes a couple of seconds — there's a "Claude is thinking..." indicator while it responds.
- Claude plays more like a thoughtful human than a chess engine — expect occasional blunders and personality, not engine-strength play.
- If the request fails (bad/missing API key, no network), you'll see a "Couldn't reach Claude" pill — check the terminal running `npm start` for the actual error.
