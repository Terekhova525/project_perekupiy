import React, { useRef, useEffect } from 'react'

export default function ActionLog({ logs }) {
  const logRef = useRef(null)
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])
  return (
    <div className="action-log" ref={logRef}>
      <h3>📋 Лог действий</h3>
      <ul>
        {logs.map((log, idx) => (
          <li key={idx}>{log}</li>
        ))}
      </ul>
    </div>
  )
}
