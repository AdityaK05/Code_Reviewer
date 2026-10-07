import { render, screen, waitFor } from '@testing-library/react'
import App from '../../src/renderer/src/App'
import { describe, it, expect } from 'vitest'

describe('App Component', () => {
  it('renders application shell and navigation', () => {
    render(<App />)
    expect(screen.getByText('Code_Reviewer')).toBeInTheDocument()
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    expect(screen.getByText('Code Review')).toBeInTheDocument()
  })

  it('checks and displays native engine health status', async () => {
    render(<App />)
    
    // Initially checking
    expect(screen.getByText('Checking connection...')).toBeInTheDocument()
    
    // Should resolve to connected via our mock
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })
    
    // Check if payload rendered
    expect(screen.getByText(/Code_Reviewer Native Engine v0.1.0/i)).toBeInTheDocument()
  })
})
