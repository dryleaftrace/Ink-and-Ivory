import Anthropic from '@anthropic-ai/sdk';
import { legalMoves, rowOf, colOf, sq } from './engine.js';

const client = new Anthropic();
const MODEL = 'claude-opus-5';

export function squareName(idx){
  const files = 'abcdefgh';
  return files[colOf(idx)] + (8 - rowOf(idx));
}

export function moveToCoord(m){
  let s = squareName(m.from) + squareName(m.to);
  if(m.promotion) s += m.promotion.toLowerCase();
  return s;
}

export function generateFEN(game){
  const { board } = game;
  const letterFor = {P:'p', N:'n', B:'b', R:'r', Q:'q', K:'k'};
  const rows = [];
  for(let r = 0; r < 8; r++){
    let row = '';
    let empty = 0;
    for(let c = 0; c < 8; c++){
      const p = board[sq(r, c)];
      if(!p){ empty++; continue; }
      if(empty){ row += empty; empty = 0; }
      const letter = letterFor[p.t];
      row += p.c === 'w' ? letter.toUpperCase() : letter;
    }
    if(empty) row += empty;
    rows.push(row);
  }
  const castling = (game.castling.wK ? 'K' : '') + (game.castling.wQ ? 'Q' : '') +
    (game.castling.bK ? 'k' : '') + (game.castling.bQ ? 'q' : '');
  const epPart = game.ep === null ? '-' : squareName(game.ep);
  return `${rows.join('/')} ${game.turn} ${castling || '-'} ${epPart} ${game.halfmove} ${game.fullmove}`;
}

export function buildPrompt(game, coordList, sanHistory){
  const fen = generateFEN(game);
  const colorName = game.turn === 'w' ? 'White' : 'Black';
  const historyText = (sanHistory || []).join(' ') || '(no moves yet)';
  return `You are playing a friendly, casual game of chess as ${colorName}. You are not a chess engine — play like a thoughtful human opponent with a bit of personality.

Current position (FEN): ${fen}
Moves played so far: ${historyText}

It is your move. Choose ONE move from this exact list of legal moves, given in coordinate notation (from-square + to-square, promotions suffixed with the piece letter, e.g. "e2e4", "e7e8q"):
${coordList.join(', ')}

Respond with ONLY a JSON object — no markdown, no code fences, no other text:
{"move": "<one exact entry from the list above>", "note": "<one short, friendly, first-person sentence about your move or the position>"}`;
}

export async function pickMove(body){
  const game = {
    board: body.board,
    turn: body.turn,
    castling: body.castling,
    ep: body.ep,
    halfmove: body.halfmove,
    fullmove: body.fullmove,
    history: []
  };
  const legal = legalMoves(game, game.turn);
  if(legal.length === 0) return null;

  const coordList = legal.map(moveToCoord);
  const messages = [{ role: 'user', content: buildPrompt(game, coordList, body.sanHistory) }];

  for(let attempt = 0; attempt < 3; attempt++){
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      output_config: { effort: 'medium' },
      messages,
    });
    const textBlock = response.content.find(b => b.type === 'text');
    const raw = textBlock ? textBlock.text : '';
    const cleaned = raw.trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    let parsed = null;
    try { parsed = JSON.parse(cleaned); } catch { /* fall through to retry */ }

    if(parsed && typeof parsed.move === 'string'){
      const idx = coordList.indexOf(parsed.move.trim());
      if(idx !== -1){
        return { move: legal[idx], note: typeof parsed.note === 'string' ? parsed.note : '' };
      }
    }

    messages.push({ role: 'assistant', content: raw });
    messages.push({
      role: 'user',
      content: `That was not one of the exact legal moves listed. Choose exactly one string from this list: ${coordList.join(', ')}. Respond with only the JSON object.`
    });
  }

  console.warn('Claude did not return a valid move after 3 attempts; falling back to a random legal move.');
  const fallback = legal[Math.floor(Math.random() * legal.length)];
  return { move: fallback, note: "Let's keep the game moving." };
}
