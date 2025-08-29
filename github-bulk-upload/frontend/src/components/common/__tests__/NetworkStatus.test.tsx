import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NetworkStatus from '../NetworkStatus'

describe('NetworkStatus', () => {
  const user = userEvent.setup()
  
  // Mock navigator.onLine
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

  it('should not render when online', () => {
    mockOnLine = true
    Object.defineProperty(navigator, 'onLine', { value: true })
    
    render(<NetworkStatus />)
    
    expect(screen.queryByText(/网络连接已断开/i)).not.toBeInTheDocument()
  })

  it('should render offline message when offline', () => {
    mockOnLine = false
    Object.defineProperty(navigator, 'onLine', { value: false })
    
    render(<NetworkStatus />)
    
    expect(screen.getByText(/网络连接已断开/i)).toBeInTheDocument()
    expect(screen.getByText(/请检查您的网络连接/i)).toBeInTheDocument()
  })

  it('should show retry button when offline', () => {
    mockOnLine = false
    Object.defineProperty(navigator, 'onLine', { value: false })
    
    render(<NetworkStatus />)
    
    expect(screen.getByText(/重试/i)).toBeInTheDocument()
  })

  it('should handle retry button click', async () => {
    mockOnLine = false
    Object.defineProperty(navigator, 'onLine', { value: false })
    
    const onRetry = vi.fn()
    render(<NetworkStatus onRetry={onRetry} />)
    
    const retryButton = screen.getByText(/重试/i)
    await user.click(retryButton)
    
    expect(onRetry).toHaveBeenCalled()
  })

  it('should register event listeners on mount', () => {
    render(<NetworkStatus />)
    
    expect(global.addEventListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(global.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
  })

  it('should remove event listeners on unmount', () => {
    const { unmount } = render(<NetworkStatus />)
    
    unmount()
    
    expect(global.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(global.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
  })

  it('should update status when network changes', async () => {
    mockOnLine = true
    Object.defineProperty(navigator, 'onLine', { value: true })
    
    const { rerender } = render(<NetworkStatus />)
    
    expect(screen.queryByText(/网络连接已断开/i)).not.toBeInTheDocument()
    
    // Simulate going offline
    mockOnLine = false
    Object.defineProperty(navigator, 'onLine', { value: false })
    
    // Trigger offline event
    const offlineEvent = new Event('offline')
    global.dispatchEvent(offlineEvent)
    
    rerender(<NetworkStatus />)
    
    await waitFor(() => {
      expect(screen.getByText(/网络连接已断开/i)).toBeInTheDocument()
    })
  })

  it('should show reconnected message when coming back online', async () => {
    mockOnLine = false
    Object.defineProperty(navigator, 'onLine', { value: false })
    
    const { rerender } = render(<NetworkStatus />)
    
    expect(screen.getByText(/网络连接已断开/i)).toBeInTheDocument()
    
    // Simulate coming back online
    mockOnLine = true
    Object.defineProperty(navigator, 'onLine', { value: true })
    
    // Trigger online event
    const onlineEvent = new Event('online')
    global.dispatchEvent(onlineEvent)
    
    rerender(<NetworkStatus />)
    
    await waitFor(() => {
      expect(screen.getByText(/网络连接已恢复/i)).toBeInTheDocument()
    })
    
    // Message should disappear after a few seconds
    await waitFor(() => {
      expect(screen.queryByText(/网络连接已恢复/i)).not.toBeInTheDocument()
    }, { timeout: 4000 })
  })

  it('should render with custom offline message', () => {
    mockOnLine = false
    Object.defineProperty(navigator, 'onLine', { value: false })
    
    render(<NetworkStatus offlineMessage="自定义离线消息" />)
    
    expect(screen.getByText('自定义离线消息')).toBeInTheDocument()
  })

  it('should render with custom online message', async () => {
    mockOnLine = false
    Object.defineProperty(navigator, 'onLine', { value: false })
    
    const { rerender } = render(<NetworkStatus onlineMessage="自定义在线消息" />)
    
    // Simulate coming back online
    mockOnLine = true
    Object.defineProperty(navigator, 'onLine', { value: true })
    
    const onlineEvent = new Event('online')
    global.dispatchEvent(onlineEvent)
    
    rerender(<NetworkStatus onlineMessage="自定义在线消息" />)
    
    await waitFor(() => {
      expect(screen.getByText('自定义在线消息')).toBeInTheDocument()
    })
  })

  it('should apply custom className', () => {
    mockOnLine = false
    Object.defineProperty(navigator, 'onLine', { value: false })
    
    render(<NetworkStatus className="custom-network-status" />)
    
    const networkStatus = screen.getByText(/网络连接已断开/i).closest('div')
    expect(networkStatus).toHaveClass('custom-network-status')
  })

  it('should show different styles for offline and online states', async () => {
    mockOnLine = false
    Object.defineProperty(navigator, 'onLine', { value: false })
    
    const { rerender } = render(<NetworkStatus />)
    
    let networkStatus = screen.getByText(/网络连接已断开/i).closest('div')
    expect(networkStatus).toHaveClass('bg-red-500')
    
    // Simulate coming back online
    mockOnLine = true
    Object.defineProperty(navigator, 'onLine', { value: true })
    
    const onlineEvent = new Event('online')
    global.dispatchEvent(onlineEvent)
    
    rerender(<NetworkStatus />)
    
    await waitFor(() => {
      networkStatus = screen.getByText(/网络连接已恢复/i).closest('div')
      expect(networkStatus).toHaveClass('bg-green-500')
    })
  })

  it('should handle position prop', () => {
    mockOnLine = false
    Object.defineProperty(navigator, 'onLine', { value: false })
    
    render(<NetworkStatus position="bottom" />)
    
    const networkStatus = screen.getByText(/网络连接已断开/i).closest('div')
    expect(networkStatus).toHaveClass('bottom-0')
  })
})