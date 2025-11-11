// src/components/ChessGame/ChessBoard.jsx
import React from 'react';
import Piece from './Piece';
import styles from './ChessGame.module.css';

const ChessBoard = ({ board, onSquareClick, playerColor, selectedSquare, possibleMoves }) => {
  const isFlipped = playerColor === 'b';

  const renderSquares = () => {
    const squares = [];
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const rowIndex = isFlipped ? 7 - i : i;
        const colIndex = isFlipped ? 7 - j : j;
        const piece = board[rowIndex][colIndex];
        const squareName = String.fromCharCode('a'.charCodeAt(0) + colIndex) + (8 - rowIndex);
        
        const classNames = [
          styles.square,
          (rowIndex + colIndex) % 2 === 0 ? styles.white : styles.black,
          selectedSquare === squareName ? styles.selected : '',
          possibleMoves.includes(squareName) ? styles.possibleMove : ''
        ].join(' ');

        squares.push(
          <div key={squareName} className={classNames} onClick={() => onSquareClick(squareName)}>
            <Piece piece={piece} />
            {possibleMoves.includes(squareName) && <div className={styles.moveIndicator}></div>}
          </div>
        );
      }
    }
    return squares;
  };

  return <div className={styles.chessboard}>{renderSquares()}</div>;
};

export default ChessBoard;