import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { authService } from '../auth'

// Mock axios
vi.mock('axios')
const mockAxios = axios as any

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAxios.create.mockReturnValue(mockAxios)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('should login successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      }

      const mockResponse = {
        data: {
          success: true,
          data: {
            user: {
              id: '1',
              email: 'test@example.com',
              username: 'testuser'
            },
            tokens: {
              accessToken: 'access-token',
              refreshToken: 'refresh-token'
            }
          }
        }
      }

      mockAxios.post.mockResolvedValue(mockResponse)

      const result = await authService.login(loginData)

      expect(mockAxios.post).toHaveBeenCalledWith('/auth/login', loginData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle login error', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      }

      const mockError = {
        response: {
          data: {
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: '邮箱或密码错误'
            }
          }
        }
      }

      mockAxios.post.mockRejectedValue(mockError)

      await expect(authService.login(loginData)).rejects.toEqual(mockError)
    })
  })

  describe('register', () => {
    it('should register successfully', async () => {
      const registerData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      }

      const mockResponse = {
        data: {
          success: true,
          data: {
            user: {
              id: '1',
              username: 'testuser',
              email: 'test@example.com'
            },
            tokens: {
              accessToken: 'access-token',
              refreshToken: 'refresh-token'
            }
          }
        }
      }

      mockAxios.post.mockResolvedValue(mockResponse)

      const result = await authService.register(registerData)

      expect(mockAxios.post).toHaveBeenCalledWith('/auth/register', registerData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle registration error', async () => {
      const registerData = {
        username: 'existinguser',
        email: 'test@example.com',
        password: 'password123'
      }

      const mockError = {
        response: {
          data: {
            success: false,
            error: {
              code: 'USER_EXISTS',
              message: '用户名已存在'
            }
          }
        }
      }

      mockAxios.post.mockRejectedValue(mockError)

      await expect(authService.register(registerData)).rejects.toEqual(mockError)
    })
  })

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshToken = 'valid-refresh-token'

      const mockResponse = {
        data: {
          success: true,
          data: {
            tokens: {
              accessToken: 'new-access-token',
              refreshToken: 'new-refresh-token'
            }
          }
        }
      }

      mockAxios.post.mockResolvedValue(mockResponse)

      const result = await authService.refreshToken(refreshToken)

      expect(mockAxios.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken
      })
      expect(result).toEqual(mockResponse)
    })

    it('should handle refresh token error', async () => {
      const refreshToken = 'invalid-refresh-token'

      const mockError = {
        response: {
          data: {
            success: false,
            error: {
              code: 'INVALID_TOKEN',
              message: '无效的刷新令牌'
            }
          }
        }
      }

      mockAxios.post.mockRejectedValue(mockError)

      await expect(authService.refreshToken(refreshToken)).rejects.toEqual(mockError)
    })
  })

  describe('logout', () => {
    it('should logout successfully', async () => {
      const refreshToken = 'valid-refresh-token'

      const mockResponse = {
        data: {
          success: true,
          message: '退出登录成功'
        }
      }

      mockAxios.post.mockResolvedValue(mockResponse)

      const result = await authService.logout(refreshToken)

      expect(mockAxios.post).toHaveBeenCalledWith('/auth/logout', {
        refreshToken
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getCurrentUser', () => {
    it('should get current user successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: '1',
            username: 'testuser',
            email: 'test@example.com'
          }
        }
      }

      mockAxios.get.mockResolvedValue(mockResponse)

      const result = await authService.getCurrentUser()

      expect(mockAxios.get).toHaveBeenCalledWith('/auth/me')
      expect(result).toEqual(mockResponse)
    })

    it('should handle unauthorized error', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: '未授权访问'
            }
          }
        }
      }

      mockAxios.get.mockRejectedValue(mockError)

      await expect(authService.getCurrentUser()).rejects.toEqual(mockError)
    })
  })

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const profileData = {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Software Developer'
      }

      const mockResponse = {
        data: {
          success: true,
          data: {
            id: '1',
            username: 'testuser',
            email: 'test@example.com',
            ...profileData
          }
        }
      }

      mockAxios.put.mockResolvedValue(mockResponse)

      const result = await authService.updateProfile(profileData)

      expect(mockAxios.put).toHaveBeenCalledWith('/auth/profile', profileData)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const passwordData = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123'
      }

      const mockResponse = {
        data: {
          success: true,
          message: '密码修改成功'
        }
      }

      mockAxios.put.mockResolvedValue(mockResponse)

      const result = await authService.changePassword(passwordData)

      expect(mockAxios.put).toHaveBeenCalledWith('/auth/password', passwordData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle incorrect current password', async () => {
      const passwordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123'
      }

      const mockError = {
        response: {
          data: {
            success: false,
            error: {
              code: 'INVALID_PASSWORD',
              message: '当前密码不正确'
            }
          }
        }
      }

      mockAxios.put.mockRejectedValue(mockError)

      await expect(authService.changePassword(passwordData)).rejects.toEqual(mockError)
    })
  })

  describe('forgotPassword', () => {
    it('should send forgot password email successfully', async () => {
      const email = 'test@example.com'

      const mockResponse = {
        data: {
          success: true,
          message: '重置密码邮件已发送'
        }
      }

      mockAxios.post.mockResolvedValue(mockResponse)

      const result = await authService.forgotPassword(email)

      expect(mockAxios.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const resetData = {
        token: 'reset-token',
        newPassword: 'newpassword123'
      }

      const mockResponse = {
        data: {
          success: true,
          message: '密码重置成功'
        }
      }

      mockAxios.post.mockResolvedValue(mockResponse)

      const result = await authService.resetPassword(resetData)

      expect(mockAxios.post).toHaveBeenCalledWith('/auth/reset-password', resetData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle invalid reset token', async () => {
      const resetData = {
        token: 'invalid-token',
        newPassword: 'newpassword123'
      }

      const mockError = {
        response: {
          data: {
            success: false,
            error: {
              code: 'INVALID_TOKEN',
              message: '重置令牌无效或已过期'
            }
          }
        }
      }

      mockAxios.post.mockRejectedValue(mockError)

      await expect(authService.resetPassword(resetData)).rejects.toEqual(mockError)
    })
  })
})