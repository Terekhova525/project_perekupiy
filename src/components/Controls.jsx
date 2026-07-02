import React from 'react'

export default function Controls({
  phase,
  onSelectSteps,
  onPayPenalty,
  onMove,
  onAction,
  onEndTurn,
  onOpenSell,
  onOpenLoan,
  isGameOver,
  penalty,
}) {
  if (isGameOver) {
    return <div className="controls">Игра окончена</div>
  }

  switch (phase) {
    case 'selectSteps':
      return (
        <div className="controls">
          <p>Выберите количество шагов (1-7):</p>
          <div className="step-buttons">
            {[1,2,3,4,5,6,7].map(s => (
              <button key={s} onClick={() => onSelectSteps(s)}>
                {s} {s > 2 ? `(${penaltyForStep(s)} ₽)` : ''}
              </button>
            ))}
          </div>
          <div className="extra-actions">
            <button onClick={onOpenSell}>Продать машину</button>
            <button onClick={onOpenLoan}>Взять заём</button>
          </div>
        </div>
      )
    case 'payPenalty':
      return (
        <div className="controls">
          <p>Штраф: {penalty} ₽</p>
          <button onClick={onPayPenalty}>Оплатить</button>
          <button onClick={onOpenLoan}>Взять заём</button>
        </div>
      )
    case 'move':
      return (
        <div className="controls">
          <button onClick={onMove}>Переместиться</button>
        </div>
      )
    case 'action':
      return (
        <div className="controls">
          <button onClick={onAction}>Выполнить действие</button>
        </div>
      )
    case 'selectRepair':
      return (
        <div className="controls">
          <p>Выберите машину для ремонта в модалке</p>
        </div>
      )
    case 'endTurn':
      return (
        <div className="controls">
          <button onClick={onEndTurn}>Завершить ход</button>
          <button onClick={onOpenSell}>Продать машину</button>
          <button onClick={onOpenLoan}>Взять заём</button>
        </div>
      )
    default:
      return null
  }
}

function penaltyForStep(step) {
  const map = { 1:0, 2:0, 3:30000, 4:60000, 5:100000, 6:300000, 7:1000000 }
  return map[step] || 0
}
