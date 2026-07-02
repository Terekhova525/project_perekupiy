import carsData from './data/cars.json'
import defectsData from './data/defects.json'

// Начальная доска (40 клеток)
const BOARD_SIZE = 40
const boardTypes = [
  'start', 'buy', 'repair', 'defect', 'auction', 'free', 'buy', 'repair',
  'defect', 'buy', 'auction', 'free', 'buy', 'repair', 'defect', 'buy',
  'repair', 'auction', 'free', 'buy', 'defect', 'buy', 'repair', 'auction',
  'free', 'buy', 'defect', 'repair', 'buy', 'auction', 'free', 'buy',
  'repair', 'defect', 'buy', 'auction', 'free', 'repair', 'buy', 'finish'
]

// Стоимость шагов
const STEP_COSTS = {
  1: 0,
  2: 0,
  3: 30000,
  4: 60000,
  5: 100000,
  6: 300000,
  7: 1000000
}

// Стоимость ремонта (фиксированная)
const REPAIR_COST = 50000

// Цена покупки машины (фикс)
const BUY_PRICE = 100000

// Инициализация игры
export function initGame(playerNames) {
  // Перемешиваем колоду машин
  const shuffledCars = shuffleArray([...carsData])
  const shuffledDefects = shuffleArray([...defectsData])

  const players = playerNames.map((name, idx) => ({
    id: idx,
    name,
    money: 500000, // стартовый капитал
    hand: [], // массив id машин (объектов с дефектами)
    position: 0,
    loans: [], // { from, amount, interest }
    isAlive: true,
  }))

  return {
    players,
    currentPlayerIndex: 0,
    board: boardTypes.map((type, idx) => ({ type, index: idx })),
    carDeck: shuffledCars,
    defectDeck: shuffledDefects,
    phase: 'selectSteps', // selectSteps | payPenalty | move | action | endTurn
    steps: 0,
    penalty: 0,
    actionLog: [],
    gameOver: false,
    winner: null,
    selectedCarId: null, // для действий с конкретной машиной
    loanRequest: null, // { from, to, amount }
  }
}

// Вспомогательные функции
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Получить текущего игрока
export function getCurrentPlayer(gameState) {
  return gameState.players[gameState.currentPlayerIndex]
}

// Установить шаги
export function selectSteps(gameState, steps) {
  if (gameState.phase !== 'selectSteps') return null
  const penalty = STEP_COSTS[steps] || 0
  const newState = { ...gameState, steps, penalty, phase: penalty > 0 ? 'payPenalty' : 'move' }
  addLog(newState, `Выбрано ${steps} шагов, штраф: ${penalty} ₽`)
  return newState
}

// Оплатить штраф (вызывается из UI)
export function payPenalty(gameState) {
  const player = getCurrentPlayer(gameState)
  if (gameState.phase !== 'payPenalty') return null
  if (player.money < gameState.penalty) {
    // Недостаточно денег – нужно взять заём, но мы это обрабатываем в UI
    // Здесь просто возвращаем ошибку
    return { error: 'Недостаточно денег для штрафа' }
  }
  const newState = { ...gameState }
  const p = newState.players[newState.currentPlayerIndex]
  p.money -= newState.penalty
  addLog(newState, `Штраф ${newState.penalty} ₽ оплачен`)
  newState.phase = 'move'
  return newState
}

// Переместить игрока
export function movePlayer(gameState) {
  if (gameState.phase !== 'move') return null
  const newState = { ...gameState }
  const player = newState.players[newState.currentPlayerIndex]
  const newPos = (player.position + newState.steps) % BOARD_SIZE
  player.position = newPos
  addLog(newState, `${player.name} переместился на клетку ${newPos}`)
  newState.phase = 'action'
  return newState
}

// Выполнить действие на клетке
export function performAction(gameState) {
  if (gameState.phase !== 'action') return null
  const newState = { ...gameState }
  const player = getCurrentPlayer(newState)
  const cell = newState.board[player.position]
  let actionDone = false

  switch (cell.type) {
    case 'buy':
      // Купить машину вслепую
      if (player.money < BUY_PRICE) {
        addLog(newState, 'Недостаточно денег для покупки')
        newState.phase = 'endTurn'
        return newState
      }
      if (newState.carDeck.length === 0) {
        addLog(newState, 'Колода машин пуста')
        newState.phase = 'endTurn'
        return newState
      }
      const car = newState.carDeck.pop()
      // Назначаем случайный дефект (1-3)
      const defects = []
      const numDefects = Math.floor(Math.random() * 3) + 1
      for (let i = 0; i < numDefects; i++) {
        if (newState.defectDeck.length === 0) break
        const defect = newState.defectDeck.pop()
        defects.push(defect)
      }
      const carWithDefects = { ...car, defects, repaired: false }
      player.hand.push(carWithDefects)
      player.money -= BUY_PRICE
      addLog(newState, `${player.name} купил ${car.brand} ${car.model} за ${BUY_PRICE} ₽ (слепая покупка)`)
      actionDone = true
      break

    case 'repair':
      // Починить одну машину (выбор в UI)
      // Здесь мы просто открываем модалку выбора, поэтому действие откладываем
      // В этом методе мы не ремонтируем, а переводим в состояние выбора
      newState.phase = 'selectRepair'
      return newState

    case 'defect':
      // Получить случайный дефект на одну из машин
      if (player.hand.length === 0) {
        addLog(newState, 'Нет машин для получения дефекта')
        break
      }
      if (newState.defectDeck.length === 0) {
        addLog(newState, 'Колода дефектов пуста')
        break
      }
      const defect = newState.defectDeck.pop()
      // Выбираем случайную машину
      const targetCar = player.hand[Math.floor(Math.random() * player.hand.length)]
      targetCar.defects.push(defect)
      addLog(newState, `${player.name} получил дефект "${defect.name}" на ${targetCar.brand} ${targetCar.model}`)
      actionDone = true
      break

    case 'auction':
      // Аукцион: продать машину с нечинимым дефектом по аукционной цене
      // Находим машину с нечинимым дефектом
      const unrepairableCars = player.hand.filter(car => car.defects.some(d => !d.repairable))
      if (unrepairableCars.length === 0) {
        addLog(newState, 'Нет машин с нечинимым дефектом для аукциона')
        break
      }
      // Продаём первую такую машину
      const carToAuction = unrepairableCars[0]
      const auctionPrice = carToAuction.auctionPrice || Math.floor(carToAuction.basePrice * 0.4)
      player.money += auctionPrice
      player.hand = player.hand.filter(c => c.id !== carToAuction.id)
      addLog(newState, `${player.name} продал ${carToAuction.brand} ${carToAuction.model} на аукционе за ${auctionPrice} ₽`)
      actionDone = true
      break

    case 'free':
      addLog(newState, 'Бесплатная клетка, отдых')
      actionDone = true
      break

    case 'start':
      addLog(newState, 'Старт – получите бонус 50 000 ₽')
      player.money += 50000
      actionDone = true
      break

    case 'finish':
      // Проверка победы (достигнута последняя клетка)
      addLog(newState, `${player.name} достиг финиша!`)
      newState.gameOver = true
      newState.winner = player.id
      newState.phase = 'endTurn'
      return newState

    default:
      addLog(newState, 'Ничего не произошло')
      actionDone = true
  }

  if (actionDone) {
    newState.phase = 'endTurn'
    // Проверка победы по деньгам (если > 2 000 000)
    if (player.money >= 2000000) {
      newState.gameOver = true
      newState.winner = player.id
      addLog(newState, `${player.name} набрал 2 000 000 ₽ и победил!`)
    }
  }
  return newState
}

// Ремонт машины (вызывается из UI после выбора)
export function repairCar(gameState, carIndex) {
  if (gameState.phase !== 'selectRepair') return null
  const newState = { ...gameState }
  const player = getCurrentPlayer(newState)
  const car = player.hand[carIndex]
  if (!car) return { error: 'Машина не найдена' }
  if (player.money < REPAIR_COST) {
    return { error: 'Недостаточно денег для ремонта' }
  }
  // Находим первый ремонтопригодный дефект
  const repairableDefectIndex = car.defects.findIndex(d => d.repairable)
  if (repairableDefectIndex === -1) {
    return { error: 'Нет ремонтопригодных дефектов' }
  }
  const defect = car.defects[repairableDefectIndex]
  car.defects.splice(repairableDefectIndex, 1)
  player.money -= REPAIR_COST
  // Если дефектов не осталось, считаем отремонтированной
  if (car.defects.length === 0) {
    car.repaired = true
  }
  addLog(newState, `${player.name} отремонтировал дефект "${defect.name}" на ${car.brand} ${car.model} за ${REPAIR_COST} ₽`)
  newState.phase = 'action' // возвращаемся к действию (может быть ещё)
  // Но мы уже выполнили действие, можно перейти в endTurn
  newState.phase = 'endTurn'
  return newState
}

// Продажа отремонтированной машины
export function sellCar(gameState, carIndex) {
  const newState = { ...gameState }
  const player = getCurrentPlayer(newState)
  const car = player.hand[carIndex]
  if (!car) return { error: 'Машина не найдена' }
  if (!car.repaired && !car.defects.some(d => !d.repairable)) {
    return { error: 'Машина не отремонтирована и не имеет нечинимых дефектов' }
  }
  // Если есть нечинимый дефект, продажа идёт по аукционной цене
  let price = car.basePrice
  if (car.defects.some(d => !d.repairable)) {
    price = car.auctionPrice || Math.floor(car.basePrice * 0.4)
  }
  player.money += price
  player.hand = player.hand.filter(c => c.id !== car.id)
  addLog(newState, `${player.name} продал ${car.brand} ${car.model} за ${price} ₽`)
  newState.phase = 'endTurn'
  return newState
}

// Запрос займа
export function requestLoan(gameState, targetPlayerId, amount) {
  const newState = { ...gameState }
  const player = getCurrentPlayer(newState)
  const target = newState.players[targetPlayerId]
  if (!target) return { error: 'Игрок не найден' }
  if (target.id === player.id) return { error: 'Нельзя взять заём у себя' }
  if (target.money < amount) return { error: 'У игрока недостаточно денег' }
  newState.loanRequest = { from: player.id, to: target.id, amount }
  addLog(newState, `${player.name} запросил заём ${amount} ₽ у ${target.name}`)
  return newState
}

// Принять заём
export function acceptLoan(gameState, accept) {
  const newState = { ...gameState }
  if (!newState.loanRequest) return { error: 'Нет активного запроса' }
  const { from, to, amount } = newState.loanRequest
  if (accept) {
    const lender = newState.players[to]
    const borrower = newState.players[from]
    if (lender.money < amount) return { error: 'У кредитора недостаточно денег' }
    lender.money -= amount
    borrower.money += amount
    // Записываем долг (процент 10%)
    const interest = Math.floor(amount * 0.1)
    borrower.loans.push({ from: to, amount: amount + interest, original: amount })
    addLog(newState, `${borrower.name} взял заём ${amount} ₽ у ${lender.name} (с %: ${interest} ₽)` )
  } else {
    addLog(newState, `Запрос займа отклонён`)
  }
  newState.loanRequest = null
  return newState
}

// Вернуть долг (вызывается по желанию)
export function repayLoan(gameState, loanIndex) {
  const newState = { ...gameState }
  const player = getCurrentPlayer(newState)
  const loan = player.loans[loanIndex]
  if (!loan) return { error: 'Заём не найден' }
  if (player.money < loan.amount) return { error: 'Недостаточно денег для возврата' }
  const creditor = newState.players[loan.from]
  player.money -= loan.amount
  creditor.money += loan.amount
  player.loans.splice(loanIndex, 1)
  addLog(newState, `${player.name} вернул долг ${loan.amount} ₽ игроку ${creditor.name}`)
  return newState
}

// Переход к следующему игроку
export function endTurn(gameState) {
  if (gameState.phase !== 'endTurn' && gameState.phase !== 'selectRepair') {
    return { error: 'Нельзя завершить ход сейчас' }
  }
  const newState = { ...gameState }
  // Проверяем, есть ли ещё игроки с деньгами
  const alive = newState.players.filter(p => p.money >= 0)
  if (alive.length === 0) {
    newState.gameOver = true
    newState.winner = null
    addLog(newState, 'Все игроки обанкротились! Игра окончена.')
    return newState
  }
  // Переход к следующему
  let next = (newState.currentPlayerIndex + 1) % newState.players.length
  // Пропускаем мёртвых? Но мы не убиваем игроков, просто если денег нет, они не могут ходить.
  // Для простоты, если у игрока 0 денег, он всё равно может ходить? Лучше пропустить.
  while (newState.players[next].money < 0) {
    next = (next + 1) % newState.players.length
  }
  newState.currentPlayerIndex = next
  newState.phase = 'selectSteps'
  newState.steps = 0
  newState.penalty = 0
  newState.selectedCarId = null
  addLog(newState, `Ход перешёл к ${newState.players[next].name}`)
  return newState
}

// Добавить запись в лог
function addLog(state, msg) {
  state.actionLog.push(msg)
  if (state.actionLog.length > 50) state.actionLog.shift()
}
