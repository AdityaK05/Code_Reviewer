import { render, screen, waitFor } from '@testing-library/react'
import App from '../../src/renderer/src/App'
import { describe, it, expect } from 'vitest'

describe('App Component', () => {
  it('renders application shell and navigation', async () => {
    render(<App />)
    expect(screen.getByText('Code_Reviewer')).toBeInTheDocument()
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    expect(screen.getByText('Code Review')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getAllByText('Connected').length).toBeGreaterThan(0)
    })
  })

  it('checks and displays native engine health status', async () => {
    render(<App />)
    
    // Initially checking
    expect(screen.getByText('Checking connection...')).toBeInTheDocument()
    
    // Should resolve to connected via our mock
    await waitFor(() => {
      expect(screen.getAllByText('Connected').length).toBeGreaterThan(0)
    })
    
    // Check if payload rendered
    expect(screen.getAllByText(/Code_Reviewer Native Engine v0.1.0/i).length).toBeGreaterThan(0)
  })
})
