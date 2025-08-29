import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SkeletonLoader from '../SkeletonLoader'

describe('SkeletonLoader', () => {
  it('should render default skeleton', () => {
    render(<SkeletonLoader />)
    
    const skeleton = screen.getByTestId('skeleton-loader')
    expect(skeleton).toBeInTheDocument()
    expect(skeleton).toHaveClass('animate-pulse')
  })

  it('should render with custom width and height', () => {
    render(<SkeletonLoader width="200px" height="100px" />)
    
    const skeleton = screen.getByTestId('skeleton-loader')
    expect(skeleton).toHaveStyle({
      width: '200px',
      height: '100px'
    })
  })

  it('should render with custom className', () => {
    render(<SkeletonLoader className="custom-skeleton" />)
    
    const skeleton = screen.getByTestId('skeleton-loader')
    expect(skeleton).toHaveClass('custom-skeleton')
  })

  it('should render text skeleton variant', () => {
    render(<SkeletonLoader variant="text" />)
    
    const skeleton = screen.getByTestId('skeleton-loader')
    expect(skeleton).toHaveClass('h-4', 'rounded')
  })

  it('should render circular skeleton variant', () => {
    render(<SkeletonLoader variant="circular" />)
    
    const skeleton = screen.getByTestId('skeleton-loader')
    expect(skeleton).toHaveClass('rounded-full')
  })

  it('should render rectangular skeleton variant', () => {
    render(<SkeletonLoader variant="rectangular" />)
    
    const skeleton = screen.getByTestId('skeleton-loader')
    expect(skeleton).toHaveClass('rounded-md')
  })

  it('should render multiple skeleton lines', () => {
    render(<SkeletonLoader lines={3} />)
    
    const skeletons = screen.getAllByTestId('skeleton-loader')
    expect(skeletons).toHaveLength(3)
  })

  it('should render with different line widths', () => {
    render(<SkeletonLoader lines={3} variant="text" />)
    
    const skeletons = screen.getAllByTestId('skeleton-loader')
    expect(skeletons).toHaveLength(3)
    
    // Check that lines have different widths (randomized)
    const widths = skeletons.map(skeleton => skeleton.style.width)
    expect(widths.some(width => width !== widths[0])).toBe(true)
  })

  it('should not animate when animation is disabled', () => {
    render(<SkeletonLoader animation={false} />)
    
    const skeleton = screen.getByTestId('skeleton-loader')
    expect(skeleton).not.toHaveClass('animate-pulse')
  })

  it('should render with custom border radius', () => {
    render(<SkeletonLoader borderRadius="lg" />)
    
    const skeleton = screen.getByTestId('skeleton-loader')
    expect(skeleton).toHaveClass('rounded-lg')
  })

  it('should render card skeleton layout', () => {
    render(
      <SkeletonLoader variant="card">
        <SkeletonLoader variant="rectangular" height="200px" />
        <div className="p-4 space-y-2">
          <SkeletonLoader variant="text" />
          <SkeletonLoader variant="text" width="60%" />
        </div>
      </SkeletonLoader>
    )
    
    const cardSkeleton = screen.getByTestId('skeleton-loader')
    expect(cardSkeleton).toHaveClass('border', 'rounded-lg')
  })

  it('should render list skeleton layout', () => {
    render(<SkeletonLoader variant="list" count={3} />)
    
    const listItems = screen.getAllByTestId('skeleton-list-item')
    expect(listItems).toHaveLength(3)
    
    listItems.forEach(item => {
      expect(item).toHaveClass('flex', 'items-center', 'space-x-3')
    })
  })

  it('should render table skeleton layout', () => {
    render(<SkeletonLoader variant="table" rows={3} columns={4} />)
    
    const tableRows = screen.getAllByTestId('skeleton-table-row')
    expect(tableRows).toHaveLength(3)
    
    tableRows.forEach(row => {
      const cells = row.querySelectorAll('[data-testid="skeleton-table-cell"]')
      expect(cells).toHaveLength(4)
    })
  })

  it('should render with custom colors', () => {
    render(
      <SkeletonLoader 
        baseColor="bg-red-200" 
        highlightColor="bg-red-300" 
      />
    )
    
    const skeleton = screen.getByTestId('skeleton-loader')
    expect(skeleton).toHaveClass('bg-red-200')
  })

  it('should handle responsive props', () => {
    render(
      <SkeletonLoader 
        width={{ base: '100%', md: '50%', lg: '25%' }}
        height={{ base: '20px', md: '30px', lg: '40px' }}
      />
    )
    
    const skeleton = screen.getByTestId('skeleton-loader')
    expect(skeleton).toHaveClass('w-full', 'md:w-1/2', 'lg:w-1/4')
    expect(skeleton).toHaveClass('h-5', 'md:h-7', 'lg:h-10')
  })
})