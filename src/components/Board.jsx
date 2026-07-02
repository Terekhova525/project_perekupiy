import React from 'react'

export default function Board({ board, currentPosition }) {
  return (
    <div className="board">
      <div className="board-track">
        {board.map((cell, idx) => (
          <div
            key={idx}
            className={`board-cell ${idx === currentPosition ? 'active' : ''}`}
            title={`Клетка ${idx}: ${cell.type}`}
          >
            <span className="cell-index">{idx}</span>
            <span className="cell-type">{cell.type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
