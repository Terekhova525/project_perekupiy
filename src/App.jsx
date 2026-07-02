import React, { useState, useEffect } from 'react'
import * as GameEngine from './GameEngine'
import Board from './components/Board'
import PlayerInfo from './components/PlayerInfo'
import ActionLog from './components/ActionLog'
import Controls from './components/Controls'
import Modal from './components/Modal'
import CarCard from './components/CarCard'

function App() {
  const [game, setGame] = useState(null)
  const [players, setPlayers] = useState(['Игрок 1', 'Игрок 2']) // можно изменить через стартовое меню
  const [modal, setModal] = useState(null) // { type, data, onAction }

  useEffect(() => {
    // Инициализация игры при загрузке
    const initialGame = GameEngine.initGame(players)
    setGame(initialGame)
  }, [])

  // Обёртка для обновления состояния
  const updateGame = (newGame) => {
    if (newGame && !newGame.error) {
      setGame(newGame)
    } else if (newGame && newGame.error) {
      alert(newGame.error)
    }
  }

  // Обработчики действий
  const handleSelectSteps = (steps) => {
    if (!game) return
    const result = GameEngine.selectSteps(game, steps)
    updateGame(result)
  }

  const handlePayPenalty = () => {
    if (!game) return
    const result = GameEngine.payPenalty(game)
    if (result && result.error) {
      // Недостаточно денег – предложить заём
      setModal({
        type: 'loan',
        data: { amount: game.penalty - getCurrentPlayer().money },
        onAction: (loanAmount) => {
          // Запрашиваем заём у другого игрока (выбор в модалке)
          // Упростим: просто добавим деньги (заём от банка?) – но по правилам только между игроками.
          // Реализуем выбор игрока в модалке.
        }
      })
    } else {
      updateGame(result)
    }
  }

  const handleMove = () => {
    if (!game) return
    const result = GameEngine.movePlayer(game)
    updateGame(result)
  }

  const handleAction = () => {
    if (!game) return
    const result = GameEngine.performAction(game)
    if (result && result.phase === 'selectRepair') {
      // Открыть модалку выбора машины для ремонта
      const player = GameEngine.getCurrentPlayer(result)
      if (player.hand.length === 0) {
        alert('Нет машин для ремонта')
        // Переходим в endTurn
        const newState = { ...result, phase: 'endTurn' }
        updateGame(newState)
        return
      }
      setModal({
        type: 'selectRepair',
        data: { player },
        onAction: (carIndex) => {
          const repairResult = GameEngine.repairCar(result, carIndex)
          updateGame(repairResult)
          setModal(null)
        }
      })
    } else {
      updateGame(result)
    }
  }

  const handleEndTurn = () => {
    if (!game) return
    const result = GameEngine.endTurn(game)
    updateGame(result)
  }

  const getCurrentPlayer = () => {
    if (!game) return null
    return GameEngine.getCurrentPlayer(game)
  }

  const handleSellCar = (carIndex) => {
    if (!game) return
    const result = GameEngine.sellCar(game, carIndex)
    updateGame(result)
  }

  // Модалка для продажи (выбор машины)
  const openSellModal = () => {
    const player = getCurrentPlayer()
    if (!player || player.hand.length === 0) {
      alert('Нет машин для продажи')
      return
    }
    setModal({
      type: 'sell',
      data: { player },
      onAction: (carIndex) => {
        handleSellCar(carIndex)
        setModal(null)
      }
    })
  }

  // Модалка для займа
  const openLoanModal = () => {
    setModal({
      type: 'loanRequest',
      data: { players: game.players, currentPlayer: getCurrentPlayer() },
      onAction: (targetId, amount) => {
        const result = GameEngine.requestLoan(game, targetId, amount)
        if (result && result.error) {
          alert(result.error)
        } else {
          updateGame(result)
          // Теперь нужно принять заём (для упрощения, автоматически принимаем)
          const acceptResult = GameEngine.acceptLoan(result, true)
          updateGame(acceptResult)
        }
        setModal(null)
      }
    })
  }

  if (!game) return <div>Загрузка...</div>

  const currentPlayer = getCurrentPlayer()
  const isGameOver = game.gameOver

  return (
    <div className="app">
      <header>
        <h1>🔧 AUTO-PUNK</h1>
        <div className="game-status">
          {isGameOver ? (
            <span className="winner">🏆 Победитель: {game.winner !== null ? game.players[game.winner].name : 'Ничья'}</span>
          ) : (
            <span>Ход: {currentPlayer.name}</span>
          )}
        </div>
      </header>

      <main>
        <div className="game-area">
          <div className="left-panel">
            <PlayerInfo player={currentPlayer} />
            <Board board={game.board} currentPosition={currentPlayer.position} />
            <Controls
              phase={game.phase}
              onSelectSteps={handleSelectSteps}
              onPayPenalty={handlePayPenalty}
              onMove={handleMove}
              onAction={handleAction}
              onEndTurn={handleEndTurn}
              onOpenSell={openSellModal}
              onOpenLoan={openLoanModal}
              isGameOver={isGameOver}
              penalty={game.penalty}
            />
          </div>
          <div className="right-panel">
            <ActionLog logs={game.actionLog} />
            <div className="player-hands">
              <h3>Рука игрока</h3>
              {currentPlayer.hand.length === 0 ? (
                <p>Нет машин</p>
              ) : (
                <div className="hand-cards">
                  {currentPlayer.hand.map((car, idx) => (
                    <CarCard key={car.id || idx} car={car} index={idx} onSell={() => handleSellCar(idx)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Модалки */}
      {modal && modal.type === 'selectRepair' && (
        <Modal title="Выберите машину для ремонта" onClose={() => setModal(null)}>
          <div className="car-select">
            {modal.data.player.hand.map((car, idx) => (
              <div key={idx} className="car-option" onClick={() => modal.onAction(idx)}>
                {car.brand} {car.model} - дефектов: {car.defects.length}
              </div>
            ))}
          </div>
        </Modal>
      )}

      {modal && modal.type === 'sell' && (
        <Modal title="Выберите машину для продажи" onClose={() => setModal(null)}>
          <div className="car-select">
            {modal.data.player.hand.map((car, idx) => {
              const canSell = car.repaired || car.defects.some(d => !d.repairable)
              return (
                <div key={idx} className={`car-option ${canSell ? '' : 'disabled'}`} onClick={() => canSell && modal.onAction(idx)}>
                  {car.brand} {car.model} {canSell ? '(можно продать)' : '(нельзя продать)'}
                </div>
              )
            })}
          </div>
        </Modal>
      )}

      {modal && modal.type === 'loanRequest' && (
        <Modal title="Запрос займа" onClose={() => setModal(null)}>
          <div>
            <p>Выберите игрока и сумму:</p>
            {/* Упрощённо: поле ввода суммы и выбор из списка */}
            <select id="loan-target">
              {modal.data.players.filter(p => p.id !== modal.data.currentPlayer.id).map(p => (
                <option key={p.id} value={p.id}>{p.name} (деньги: {p.money})</option>
              ))}
            </select>
            <input type="number" id="loan-amount" placeholder="Сумма" defaultValue={100000} />
            <button onClick={() => {
              const targetId = parseInt(document.getElementById('loan-target').value)
              const amount = parseInt(document.getElementById('loan-amount').value)
              modal.onAction(targetId, amount)
            }}>Запросить</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default App
