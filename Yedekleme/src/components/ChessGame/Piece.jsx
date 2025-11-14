// src/components/ChessGame/Piece.jsx
import React from 'react';

// Bu SVG'leri projenizdeki bir `assets` klasöründen de import edebilirsiniz.
// Örnek olması için doğrudan JSX içinde tanımlıyorum.
const pieces = {
  wP: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/images/pieces/merida/wP.svg',
  wR: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/images/pieces/merida/wR.svg',
  wN: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/images/pieces/merida/wN.svg',
  wB: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/images/pieces/merida/wB.svg',
  wQ: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/images/pieces/merida/wQ.svg',
  wK: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/images/pieces/merida/wK.svg',
  bP: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/images/pieces/merida/bP.svg',
  bR: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/images/pieces/merida/bR.svg',
  bN: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/images/pieces/merida/bN.svg',
  bB: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/images/pieces/merida/bB.svg',
  bQ: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/images/pieces/merida/bQ.svg',
  bK: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/images/pieces/merida/bK.svg',
};

const Piece = ({ piece }) => {
  if (!piece) return null;
  const pieceKey = `${piece.color}${piece.type.toUpperCase()}`;
  const pieceUrl = pieces[pieceKey];

  return <img src={pieceUrl} alt={pieceKey} style={{ width: '100%', height: '100%' }} />;
};

export default Piece;