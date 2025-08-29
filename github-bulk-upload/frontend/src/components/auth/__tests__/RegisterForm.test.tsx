import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/utils'
import RegisterForm from '../RegisterForm'
import * as authService from '../../../services/auth'

// Mock the auth service
vi.mock('../../../services/auth')
const mockAuthService = authService as any

describe('RegisterForm', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render register form correctly', () => {
    renderWithProviders(<RegisterForm />)
    
    expect(screen.getByLabelText(/用户名/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/邮箱/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^密码/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/确认密码/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /注册/i })).toBeInTheDocument()
    expect(screen.getByText(/已有账户/i)).toBeInTheDocument()
  })

  it('should show validation errors for empty fields', async () => {
    renderWithProviders(<RegisterForm />)
    
    const submitButton = screen.getByRole('button', { name: /注册/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/用户名是必需的/i)).toBeInTheDocument()
      expect(screen.getByText(/邮箱是必需的/i)).toBeInTheDocument()
      expect(screen.getByText(/密码是必需的/i)).toBeInTheDocument()
    })
  })

  it('should show validation error for invalid email', async () => {
    renderWithProviders(<RegisterForm />)
    
    const emailInput = screen.getByLabelText(/邮箱/i)
    const submitButton = screen.getByRole('button', { name: /注册/i })
    
    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/邮箱格式不正确/i)).toBeInTheDocument()
    })
  })

  it('should show validation error for short password', async () => {
    renderWithProviders(<RegisterForm />)
    
    const passwordInput = screen.getByLabelText(/^密码/i)
    const submitButton = screen.getByRole('button', { name: /注册/i })
    
    await user.type(passwordInput, '123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/密码长度至少为6位/i)).toBeInTheDocument()
    })
  })

  it('should show validation error for password mismatch', async () => {
    renderWithProviders(<RegisterForm />)
    
    const passwordInput = screen.getByLabelText(/^密码/i)
    const confirmPasswordInput = screen.getByLabelText(/确认密码/i)
    const submitButton = screen.getByRole('button', { name: /注册/i })
    
    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'password456')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/密码不匹配/i)).toBeInTheDocument()
    })
  })

  it('should show validation error for short username', async () => {
    renderWithProviders(<RegisterForm />)
    
    const usernameInput = screen.getByLabelText(/用户名/i)
    const submitButton = screen.getByRole('button', { name: /注册/i })
    
    await user.type(usernameInput, 'ab')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/用户名长度至少为3位/i)).toBeInTheDocument()
    })
  })

  it('should submit form with valid data', async () => {
    const mockRegister = vi.fn().mockResolvedValue({
      data: {
        user: { id: '1', email: 'test@example.com', username: 'testuser' },
        tokens: { accessToken: 'token', refreshToken: 'refresh' }
      }
    })
    mockAuthService.register = mockRegister

    renderWithProviders(<RegisterForm />)
    
    const usernameInput = screen.getByLabelText(/用户名/i)
    const emailInput = screen.getByLabelText(/邮箱/i)
    const passwordInput = screen.getByLabelText(/^密码/i)
    const confirmPasswordInput = screen.getByLabelText(/确认密码/i)
    const submitButton = screen.getByRole('button', { name: /注册/i })
    
    await user.type(usernameInput, 'testuser')
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'password123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      })
    })
  })

  it('should show loading state during submission', async () => {
    const mockRegister = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    )
    mockAuthService.register = mockRegister

    renderWithProviders(<RegisterForm />)
    
    const usernameInput = screen.getByLabelText(/用户名/i)
    const emailInput = screen.getByLabelText(/邮箱/i)
    const passwordInput = screen.getByLabelText(/^密码/i)
    const confirmPasswordInput = screen.getByLabelText(/确认密码/i)
    const submitButton = screen.getByRole('button', { name: /注册/i })
    
    await user.type(usernameInput, 'testuser')
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'password123')
    await user.click(submitButton)
    
    expect(screen.getByText(/注册中/i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('should show error message on registration failure', async () => {
    const mockRegister = vi.fn().mockRejectedValue({
      response: {
        data: {
          error: {
            message: '用户名已存在'
          }
        }
      }
    })
    mockAuthService.register = mockRegister

    renderWithProviders(<RegisterForm />)
    
    const usernameInput = screen.getByLabelText(/用户名/i)
    const emailInput = screen.getByLabelText(/邮箱/i)
    const passwordInput = screen.getByLabelText(/^密码/i)
    const confirmPasswordInput = screen.getByLabelText(/确认密码/i)
    const submitButton = screen.getByRole('button', { name: /注册/i })
    
    await user.type(usernameInput, 'existinguser')
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'password123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/用户名已存在/i)).toBeInTheDocument()
    })
  })

  it('should toggle password visibility', async () => {
    renderWithProviders(<RegisterForm />)
    
    const passwordInput = screen.getByLabelText(/^密码/i) as HTMLInputElement
    const confirmPasswordInput = screen.getByLabelText(/确认密码/i) as HTMLInputElement
    const toggleButtons = screen.getAllByRole('button', { name: /显示密码/i })
    
    expect(passwordInput.type).toBe('password')
    expect(confirmPasswordInput.type).toBe('password')
    
    await user.click(toggleButtons[0])
    expect(passwordInput.type).toBe('text')
    
    await user.click(toggleButtons[1])
    expect(confirmPasswordInput.type).toBe('text')
  })

  it('should navigate to login page when clicking login link', async () => {
    renderWithProviders(<RegisterForm />)
    
    const loginLink = screen.getByText(/立即登录/i)
    expect(loginLink).toHaveAttribute('href', '/login')
  })

  it('should show password strength indicator', async () => {
    renderWithProviders(<RegisterForm />)
    
    const passwordInput = screen.getByLabelText(/^密码/i)
    
    await user.type(passwordInput, 'weak')
    expect(screen.getByText(/弱/i)).toBeInTheDocument()
    
    await user.clear(passwordInput)
    await user.type(passwordInput, 'StrongPass123!')
    expect(screen.getByText(/强/i)).toBeInTheDocument()
  })
})