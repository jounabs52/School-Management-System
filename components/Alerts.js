'use client'

export function showAlert(message = '✅ Done!') {
  // Remove existing alert if one is already visible
  const existing = document.getElementById('centerAlert')
  if (existing) existing.remove()

  // Create alert box
  const alertBox = document.createElement('div')
  alertBox.id = 'centerAlert'
  alertBox.textContent = message
  Object.assign(alertBox.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'white',
    color: '#333',
    padding: '20px 40px',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    fontSize: '18px',
    fontWeight: '500',
    textAlign: 'center',
    zIndex: '9999',
    opacity: '0',
    transition: 'opacity 0.3s ease',
  })

  document.body.appendChild(alertBox)

  // Fade in
  requestAnimationFrame(() => {
    alertBox.style.opacity = '1'
  })

  // Fade out + remove after 2 seconds
  setTimeout(() => {
    alertBox.style.opacity = '0'
    setTimeout(() => alertBox.remove(), 300)
  }, 2000)
}
