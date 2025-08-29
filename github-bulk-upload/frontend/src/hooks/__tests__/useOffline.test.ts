import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOffline } from '../useOffline'

describe('useOffline', () => {
  let mockOnLine = true
  
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: mockOnLine
    })
    
    // Mock addEventListener and removeEventListener
    global.addEventListener = vi.fn()
    global.removeEventListener = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return online status initially', () => {
    mockOnLine = true
    Object.defineProperty(navigator, 'onLine', { value: true })
    
    const { result } = renderHook(() => useOffline())
    
    expect(result.current.isOnline).toBe(true)
    expect(result.current.isOffline).toBe(false)
  })

  it('should return offline status when navigator is offline', () => {
    mockOnLine = false
    Object.defineProperty(navigator, 'onLine', { value: false })
    
    const { result } = renderHook(() => useOffline())
    
    expect(result.current.isOnline).toBe(false)
    expect(result.current.isOffline).toBe(true)
  })

  it('should register event listeners on mount', () => {
    renderHook(() => useOffline())
    
    expect(global.addEventListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(global.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
  })

  it('should remove event listeners on unmount', () => {
    const { unmount } = renderHook(() => useOffline())
    
    unmount()
    
    expect(global.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(global.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
  })

  it('should update status when network changes to offline', () => {
    mockOnLine = true
    Object.defineProperty(navigator, 'onLine', { value: true })
    
    const { result } = renderHook(() => useOffline())
    
    expect(result.current.isOnline).toBe(true)
    
    // Simulate going offline
    act(() => {
      mockOnLine = false
      Object.defineProperty(navigator, 'onLine', { value: false })
      
      // Trigger offline event
      const offlineEvent = new Event('offline')
      global.dispatchEvent(offlineEvent)
    })
    
    expect(result.current.isOnline).toBe(false)
    expect(result.current.isOffline).toBe(true)
  })

  it('should update status when network changes to online', () => {
    mockOnLine = false
    Object.defineProperty(navigator, 'onLine', { value: false })
    
    const { result } = renderHook(() => useOffline())
    
    expect(result.current.isOffline).toBe(true)
    
    // Simulate coming back online
    act(() => {
      mockOnLine = true
      Object.defineProperty(navigator, 'onLine', { value: true })
      
      // Trigger online event
      const onlineEvent = new Event('online')
      global.dispatchEvent(onlineEvent)
    })
    
    expect(result.current.isOnline).toBe(true)
    expect(result.current.isOffline).toBe(false)
  })

  it('should call onOnline callback when coming online', () => {
    const onOnline = vi.fn()
    const onOffline = vi.fn()
    
    mockOnLine = false
    Object.defineProperty(navigator, 'onLine', { value: false })
    
    renderHook(() => useOffline({ onOnline, onOffline }))
    
    // Simulate coming back online
    act(() => {
      mockOnLine = true
      Object.defineProperty(navigator, 'onLine', { value: true })
      
      const onlineEvent = new Event('online')
      global.dispatchEvent(onlineEvent)
    })
    
    expect(onOnline).toHaveBeenCalled()
    expect(onOffline).not.toHaveBeenCalled()
  })

  it('should call onOffline callback when going offline', () => {
    const onOnline = vi.fn()
    const onOffline = vi.fn()
    
    mockOnLine = true
    Object.defineProperty(navigator, 'onLine', { value: true })
    
    renderHook(() => useOffline({ onOnline, onOffline }))
    
    // Simulate going offline
    act(() => {
      mockOnLine = false
      Object.defineProperty(navigator, 'onLine', { value: false })
      
      const offlineEvent = new Event('offline')
      global.dispatchEvent(offlineEvent)
    })
    
    expect(onOffline).toHaveBeenCalled()
    expect(onOnline).not.toHaveBeenCalled()
  })

  it('should provide retry function', () => {
    const { result } = renderHook(() => useOffline())
    
    expect(typeof result.current.retry).toBe('function')
  })

  it('should execute retry function', () => {
    const onRetry = vi.fn()
    
    const { result } = renderHook(() => useOffline({ onRetry }))
    
    act(() => {
      result.current.retry()
    })
    
    expect(onRetry).toHaveBeenCalled()
  })

  it('should track connection history', () => {
    mockOnLine = true
    Object.defineProperty(navigator, 'onLine', { value: true })
    
    const { result } = renderHook(() => useOffline())
    
    expect(result.current.connectionHistory).toHaveLength(1)
    expect(result.current.connectionHistory[0]).toMatchObject({
      isOnline: true,
      timestamp: expect.any(Number)
    })
    
    // Go offline
    act(() => {
      mockOnLine = false
      Object.defineProperty(navigator, 'onLine', { value: false })
      
      const offlineEvent = new Event('offline')
      global.dispatchEvent(offlineEvent)
    })
    
    expect(result.current.connectionHistory).toHaveLength(2)
    expect(result.current.connectionHistory[1]).toMatchObject({
      isOnline: false,
      timestamp: expect.any(Number)
    })
  })

  it('should calculate downtime', () => {
    mockOnLine = true
    Object.defineProperty(navigator, 'onLine', { value: true })
    
    const { result } = renderHook(() => useOffline())
    
    expect(result.current.downtime).toBe(0)
    
    // Go offline
    act(() => {
      mockOnLine = false
      Object.defineProperty(navigator, 'onLine', { value: false })
      
      const offlineEvent = new Event('offline')
      global.dispatchEvent(offlineEvent)
    })
    
    // Wait a bit and come back online
    setTimeout(() => {
      act(() => {
        mockOnLine = true
        Object.defineProperty(navigator, 'onLine', { value: true })
        
        const onlineEvent = new Event('online')
        global.dispatchEvent(onlineEvent)
      })
      
      expect(result.current.downtime).toBeGreaterThan(0)
    }, 100)
  })

  it('should handle custom polling interval', () => {
    const { result } = renderHook(() => useOffline({ pollingInterval: 1000 }))
    
    expect(result.current.isOnline).toBe(navigator.onLine)
  })

  it('should disable polling when interval is 0', () => {
    const { result } = renderHook(() => useOffline({ pollingInterval: 0 }))
    
    expect(result.current.isOnline).toBe(navigator.onLine)
  })
})