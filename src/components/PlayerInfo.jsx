import React from 'react'

export default function PlayerInfo({ player }) {
  if (!player) return null
  return (
    <div className="player-info">
      <h2>{player.name}</h2>
      <div className="money">💰 {player.money.toLocaleString()} ₽</div>
      <div className="car-count">🚗 Машин: {player.hand.length}</div>
      <div className="loans">
        Долги: {player.loans.length > 0 ? player.loans.map(l => `${l.amount} ₽`).join(', ') : 'нет'}
      </div>
    </div>
  )
}
