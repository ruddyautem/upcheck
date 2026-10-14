import confetti from 'canvas-confetti';

export function triggerCelebration() {
  if (typeof window === 'undefined') return;

  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'],
  });
}
