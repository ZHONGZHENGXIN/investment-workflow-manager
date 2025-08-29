import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, mockApiResponse, mockApiError } from '../../../test/utils'
import LoginForm from '../LoginForm'
import * as authService from '../../../services/auth'

// Mock the auth service
vi.mock('../../../services/auth')
const mockAuthService = authService as any

describe('LoginForm', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render login form correctly', () => {
    renderWithProviders(<LoginForm />)
    
    expect(screen.getByLabelText(/邮箱/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/密码/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /登录/i })).toBeInTheDocument()
    expect(screen.getByText(/还没有账户/i)).toBeInTheDocument()
  })

  it('should show validation errors for empty fields', async () => {
    renderWithProviders(<LoginForm />)
    
    const submitButton = screen.getByRole('button', { name: /登录/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/邮箱是必需的/i)).toBeInTheDocument()
      expect(screen.getByText(/密码是必需的/i)).toBeInTheDocument()
    })
  })

  it('should show validation error for invalid email', async () => {
    renderWithProviders(<LoginForm />)
    
    const emailInput = screen.getByLabelText(/邮箱/i)
    const submitButton = screen.getByRole('button', { name: /登录/i })
    
    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/邮箱格式不正确/i)).toBeInTheDocument()
    })
  })

  it('should show validation error for short password', async () => {
    renderWithProviders(<LoginForm />)
    
    const passwordInput = screen.getByLabelText(/密码/i)
    const submitButton = screen.getByRole('button', { name: /登录/i })
    
    await user.type(passwordInput, '123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/密码长度至少为6位/i)).toBeInTheDocument()
    })
  })

  it('should submit form with valid data', async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      data: {
        user: { id: '1', email: 'test@example.com', username: 'testuser' },
        tokens: { accessToken: 'token', refreshToken: 'refresh' }
      }
    })
    mockAuthService.login = mockLogin

    renderWithProviders(<LoginForm />)
    
    const emailInput = screen.getByLabelText(/邮箱/i)
    const passwordInput = screen.getByLabelText(/密码/i)
    const submitButton = screen.getByRole('button', { name: /登录/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
    })
  })

  it('should show loading state during submission', async () => {
    const mockLogin = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    )
    mockAuthService.login = mockLogin

    renderWithProviders(<LoginForm />)
    
    const emailInput = screen.getByLabelText(/邮箱/i)
    const passwordInput = screen.getByLabelText(/密码/i)
    const submitButton = screen.getByRole('button', { name: /登录/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    expect(screen.getByText(/登录中/i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('should show error message on login failure', async () => {
    const mockLogin = vi.fn().mockRejectedValue({
      response: {
        data: {
          error: {
            message: '邮箱或密码错误'
          }
        }
      }
    })
    mockAuthService.login = mockLogin

    renderWithProviders(<LoginForm />)
    
    const emailInput = screen.getByLabelText(/邮箱/i)
    const passwordInput = screen.getByLabelText(/密码/i)
    const submitButton = screen.getByRole('button', { name: /登录/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/邮箱或密码错误/i)).toBeInTheDocument()
    })
  })

  it('should toggle password visibility', async () => {
    renderWithProviders(<LoginForm />)
    
    const passwordInput = screen.getByLabelText(/密码/i) as HTMLInputElement
    const toggleButton = screen.getByRole('button', { name: /显示密码/i })
    
    expect(passwordInput.type).toBe('password')
    
    await user.click(toggleButton)
    expect(passwordInput.type).toBe('text')
    
    await user.click(toggleButton)
    expect(passwordInput.type).toBe('password')
  })

  it('should navigate to register page when clicking register link', async () => {
    renderWithProviders(<LoginForm />)
    
    const registerLink = screen.getByText(/立即注册/i)
    expect(registerLink).toHaveAttribute('href', '/register')
  })

  it('should handle remember me checkbox', async () => {
    renderWithProviders(<LoginForm />)
    
    const rememberCheckbox = screen.getByLabelText(/记住我/i) as HTMLInputElement
    
    expect(rememberCheckbox.checked).toBe(false)
    
    await user.click(rememberCheckbox)
    expect(rememberCheckbox.checked).toBe(true)
  })
})