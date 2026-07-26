# Ink & Ivory

A local chess app where Claude actually plays the moves (not a classical search engine). This is a separate, local-only companion to the shareable "Ink & Ivory" chess artifact — it needs your own Anthropic API access and can't be published as a web link.

Repo: [github.com/dryleaftrace/Ink-and-Ivory](https://github.com/dryleaftrace/Ink-and-Ivory)

## How it works

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
