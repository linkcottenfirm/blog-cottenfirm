'use client'

export function LogoutButton() {
  async function logout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    window.location.href = '/admin/login'
  }
  return (
    <button
      type="button"
      onClick={logout}
      className="text-gray-500 hover:text-red-600"
    >
      Logout
    </button>
  )
}
