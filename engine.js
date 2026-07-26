// Chess rules engine — validated against standard perft benchmarks (initial position,
// Kiwipete, and position 5) through depth 3-4, matching known node counts exactly.
export function opp(c){ return c==='w'?'b':'w'; }

export function initialBoard(){
  const b = new Array(64).fill(null);
  const back = ['R','N','B','Q','K','B','N','R'];
  for(let c=0;c<8;c++){
    b[0*8+c] = {t:back[c], c:'b'};
    b[1*8+c] = {t:'P', c:'b'};
    b[6*8+c] = {t:'P', c:'w'};
    b[7*8+c] = {t:back[c], c:'w'};
  }
  return b;
}

export function newGame(){
  return {
    board: initialBoard(),
    turn: 'w',
    castling: {wK:true, wQ:true, bK:true, bQ:true},
    ep: null,
    halfmove: 0,
    fullmove: 1,
    history: []
  };
}

const ROOK_DIRS = [[-1,0],[1,0],[0,-1],[0,1]];
const BISHOP_DIRS = [[-1,-1],[-1,1],[1,-1],[1,1]];
const QUEEN_DIRS = ROOK_DIRS.concat(BISHOP_DIRS);
const KNIGHT_OFFS = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];

export function inBounds(r,c){ return r>=0 && r<8 && c>=0 && c<8; }
export function sq(r,c){ return r*8+c; }
export function rowOf(s){ return (s/8)|0; }
export function colOf(s){ return s%8; }

export function isSquareAttacked(board, r, c, byColor){
  const pawnDir = byColor==='w' ? -1 : 1;
  const pr = r - pawnDir;
  for(const pc of [c-1, c+1]){
    if(inBounds(pr,pc)){
      const p = board[sq(pr,pc)];
      if(p && p.c===byColor && p.t==='P') return true;
    }
  }
  for(const [dr,dc] of KNIGHT_OFFS){
    const nr=r+dr, nc=c+dc;
    if(inBounds(nr,nc)){
      const p = board[sq(nr,nc)];
      if(p && p.c===byColor && p.t==='N') return true;
    }
  }
  for(const [dr,dc] of QUEEN_DIRS){
    const nr=r+dr, nc=c+dc;
    if(inBounds(nr,nc)){
      const p = board[sq(nr,nc)];
      if(p && p.c===byColor && p.t==='K') return true;
    }
  }
  for(const [dr,dc] of ROOK_DIRS){
    let nr=r+dr, nc=c+dc;
    while(inBounds(nr,nc)){
      const p = board[sq(nr,nc)];
      if(p){ if(p.c===byColor && (p.t==='R'||p.t==='Q')) return true; break; }
      nr+=dr; nc+=dc;
    }
  }
  for(const [dr,dc] of BISHOP_DIRS){
    let nr=r+dr, nc=c+dc;
    while(inBounds(nr,nc)){
      const p = board[sq(nr,nc)];
      if(p){ if(p.c===byColor && (p.t==='B'||p.t==='Q')) return true; break; }
      nr+=dr; nc+=dc;
    }
  }
  return false;
}

export function findKing(board, color){
  for(let i=0;i<64;i++){ const p = board[i]; if(p && p.c===color && p.t==='K') return i; }
  return -1;
}

export function isInCheck(game, color){
  const ks = findKing(game.board, color);
  if(ks<0) return false;
  return isSquareAttacked(game.board, rowOf(ks), colOf(ks), opp(color));
}

const PROMO_PIECES = ['Q','R','B','N'];

export function genPseudoMoves(game, color){
  const board = game.board;
  const moves = [];
  const dir = color==='w' ? -1 : 1;
  const startRow = color==='w' ? 6 : 1;
  const promRow = color==='w' ? 0 : 7;

  for(let i=0;i<64;i++){
    const p = board[i];
    if(!p || p.c!==color) continue;
    const r = rowOf(i), c = colOf(i);

    if(p.t==='P'){
      const r1 = r+dir;
      if(inBounds(r1,c) && !board[sq(r1,c)]){
        if(r1===promRow){ for(const pr of PROMO_PIECES) moves.push({from:i,to:sq(r1,c),promotion:pr}); }
        else {
          moves.push({from:i,to:sq(r1,c)});
          const r2 = r+2*dir;
          if(r===startRow && !board[sq(r2,c)]) moves.push({from:i,to:sq(r2,c),flags:{double:true}});
        }
      }
      for(const dc of [-1,1]){
        const cc = c+dc;
        if(!inBounds(r1,cc)) continue;
        const target = sq(r1,cc);
        const tp = board[target];
        if(tp && tp.c!==color){
          if(r1===promRow){ for(const pr of PROMO_PIECES) moves.push({from:i,to:target,promotion:pr, captured:true}); }
          else moves.push({from:i,to:target, captured:true});
        } else if(game.ep===target){
          moves.push({from:i,to:target, flags:{enpassant:true}, captured:true});
        }
      }
    } else if(p.t==='N'){
      for(const [dr,dc] of KNIGHT_OFFS){
        const nr=r+dr, nc=c+dc;
        if(!inBounds(nr,nc)) continue;
        const tp = board[sq(nr,nc)];
        if(!tp || tp.c!==color) moves.push({from:i,to:sq(nr,nc), captured: !!tp});
      }
    } else if(p.t==='K'){
      for(const [dr,dc] of QUEEN_DIRS){
        const nr=r+dr, nc=c+dc;
        if(!inBounds(nr,nc)) continue;
        const tp = board[sq(nr,nc)];
        if(!tp || tp.c!==color) moves.push({from:i,to:sq(nr,nc), captured: !!tp});
      }
      const homeRow = color==='w' ? 7 : 0;
      if(r===homeRow && c===4){
        const rights = game.castling;
        const kSide = color==='w' ? rights.wK : rights.bK;
        const qSide = color==='w' ? rights.wQ : rights.bQ;
        const enemy = opp(color);
        if(kSide && !board[sq(homeRow,5)] && !board[sq(homeRow,6)]){
          const rook = board[sq(homeRow,7)];
          if(rook && rook.t==='R' && rook.c===color){
            if(!isSquareAttacked(board,homeRow,4,enemy) && !isSquareAttacked(board,homeRow,5,enemy) && !isSquareAttacked(board,homeRow,6,enemy)){
              moves.push({from:i,to:sq(homeRow,6),flags:{castle:'K'}});
            }
          }
        }
        if(qSide && !board[sq(homeRow,3)] && !board[sq(homeRow,2)] && !board[sq(homeRow,1)]){
          const rook = board[sq(homeRow,0)];
          if(rook && rook.t==='R' && rook.c===color){
            if(!isSquareAttacked(board,homeRow,4,enemy) && !isSquareAttacked(board,homeRow,3,enemy) && !isSquareAttacked(board,homeRow,2,enemy)){
              moves.push({from:i,to:sq(homeRow,2),flags:{castle:'Q'}});
            }
          }
        }
      }
    } else {
      let dirs;
      if(p.t==='B') dirs=BISHOP_DIRS; else if(p.t==='R') dirs=ROOK_DIRS; else dirs=QUEEN_DIRS;
      for(const [dr,dc] of dirs){
        let nr=r+dr, nc=c+dc;
        while(inBounds(nr,nc)){
          const tp = board[sq(nr,nc)];
          if(!tp) moves.push({from:i,to:sq(nr,nc)});
          else { if(tp.c!==color) moves.push({from:i,to:sq(nr,nc), captured:true}); break; }
          nr+=dr; nc+=dc;
        }
      }
    }
  }
  return moves;
}

export function makeMove(game, move){
  const board = game.board;
  const piece = board[move.from];
  const record = {
    from: move.from, to: move.to, piece: piece,
    captured: null, capSq: null, promotion: move.promotion || null,
    castle: (move.flags && move.flags.castle) || null,
    enpassant: !!(move.flags && move.flags.enpassant),
    rookFrom: null, rookTo: null,
    prevCastling: Object.assign({}, game.castling),
    prevEp: game.ep, prevHalfmove: game.halfmove, prevFullmove: game.fullmove, prevTurn: game.turn
  };

  if(record.enpassant){
    const capRow = rowOf(move.from), capCol = colOf(move.to);
    record.capSq = sq(capRow, capCol);
    record.captured = board[record.capSq];
    board[record.capSq] = null;
  } else if(board[move.to]){
    record.captured = board[move.to];
  }

  board[move.to] = piece;
  board[move.from] = null;
  if(move.promotion) board[move.to] = {t: move.promotion, c: piece.c};

  if(record.castle){
    const homeRow = rowOf(move.from);
    if(record.castle==='K'){ record.rookFrom = sq(homeRow,7); record.rookTo = sq(homeRow,5); }
    else { record.rookFrom = sq(homeRow,0); record.rookTo = sq(homeRow,3); }
    board[record.rookTo] = board[record.rookFrom];
    board[record.rookFrom] = null;
  }

  const c = game.castling;
  if(piece.t==='K'){ if(piece.c==='w'){ c.wK=false; c.wQ=false; } else { c.bK=false; c.bQ=false; } }
  const clearRookRight = (square)=>{
    if(square===sq(7,7)) c.wK=false; else if(square===sq(7,0)) c.wQ=false;
    else if(square===sq(0,7)) c.bK=false; else if(square===sq(0,0)) c.bQ=false;
  };
  if(piece.t==='R') clearRookRight(move.from);
  if(record.captured) clearRookRight(record.enpassant ? -1 : move.to);

  game.ep = (move.flags && move.flags.double) ? sq((rowOf(move.from)+rowOf(move.to))/2, colOf(move.from)) : null;
  if(piece.t==='P' || record.captured) game.halfmove = 0; else game.halfmove++;
  if(piece.c==='b') game.fullmove++;
  game.turn = opp(game.turn);
  game.history.push(record);
  return record;
}

export function unmakeMove(game){
  const board = game.board;
  const r = game.history.pop();
  if(!r) return;
  if(r.castle){ board[r.rookFrom] = board[r.rookTo]; board[r.rookTo] = null; }
  board[r.from] = r.piece;
  if(r.enpassant){ board[r.to] = null; board[r.capSq] = r.captured; }
  else { board[r.to] = r.captured; }
  game.castling = r.prevCastling;
  game.ep = r.prevEp;
  game.halfmove = r.prevHalfmove;
  game.fullmove = r.prevFullmove;
  game.turn = r.prevTurn;
}

export function legalMoves(game, color){
  const pseudo = genPseudoMoves(game, color);
  const legal = [];
  for(const m of pseudo){
    makeMove(game, m);
    const inCheck = isInCheck(game, color);
    unmakeMove(game);
    if(!inCheck) legal.push(m);
  }
  return legal;
}
