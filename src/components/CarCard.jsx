import React from 'react'

export default function CarCard({ car, index, onSell }) {
  const hasUnrepairable = car.defects.some(d => !d.repairable)
  const isRepaired = car.repaired
  const canSell = isRepaired || hasUnrepairable

  return (
    <div className="car-card">
      <div className="car-name">{car.brand} {car.model}</div>
      <div className="car-price">База: {car.basePrice} ₽</div>
      <div className="car-defects">
        {car.defects.length > 0 ? (
          <ul>
            {car.defects.map((d, i) => (
              <li key={i} className={d.repairable ? 'repairable' : 'unrepairable'}>
                {d.name} {d.repairable ? '🔧' : '❌'}
              </li>
            ))}
          </ul>
        ) : (
          <span>✅ Исправна</span>
        )}
      </div>
      <div className="car-status">
        {isRepaired ? 'Отремонтирована' : hasUnrepairable ? 'Нечинимый дефект' : 'Требует ремонта'}
      </div>
      {onSell && canSell && (
        <button className="sell-btn" onClick={() => onSell(index)}>Продать</button>
      )}
    </div>
  )
}
