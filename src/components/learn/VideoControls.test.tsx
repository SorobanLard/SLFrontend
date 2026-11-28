import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoControls } from './VideoControls';
import type { VideoQualityLevel, VideoQualities } from '@/types';

// ── Helpers ────────────────────────────────────────────────────────────────
function makeProps(overrides: Partial<React.ComponentProps<typeof VideoControls>> = {}) {
  return {
    playing: false,
    currentTime: 0,
    duration: 120,
    volume: 1,
    muted: false,
    speed: 1,
    subtitlesOn: false,
    isFullscreen: false,
    hasCaptions: false,
    autoplay: false,
    onAutoplayChange: vi.fn(),
    quality: 'auto' as VideoQualityLevel,
    videoQualities: undefined as VideoQualities | undefined,
    onQualityChange: vi.fn(),
    onPlayPause: vi.fn(),
    onSeek: vi.fn(),
    onVolume: vi.fn(),
    onMute: vi.fn(),
    onSpeed: vi.fn(),
    onSubtitles: vi.fn(),
    onFullscreen: vi.fn(),
    ...overrides,
  };
}

describe('VideoControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the time display for the current position and duration', () => {
    render(<VideoControls {...makeProps({ currentTime: 65, duration: 300 })} />);
    expect(screen.getByText(/1:05 \/ 5:00/)).toBeInTheDocument();
  });

  it('shows the Play button when paused and Pause when playing', () => {
    const { rerender } = render(<VideoControls {...makeProps({ playing: false })} />);
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();

    rerender(<VideoControls {...makeProps({ playing: true })} />);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('calls onPlayPause when the play button is clicked', () => {
    const onPlayPause = vi.fn();
    render(<VideoControls {...makeProps({ onPlayPause })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(onPlayPause).toHaveBeenCalledTimes(1);
  });

  it('calls onSeek when the seek bar changes', () => {
    const onSeek = vi.fn();
    render(<VideoControls {...makeProps({ onSeek })} />);
    fireEvent.change(screen.getByLabelText('Seek'), { target: { value: '42' } });
    expect(onSeek).toHaveBeenCalledWith(42);
  });

  it('calls onMute when the mute button is clicked', () => {
    const onMute = vi.fn();
    render(<VideoControls {...makeProps({ onMute })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mute' }));
    expect(onMute).toHaveBeenCalledTimes(1);
  });

  it('shows Unmute label when muted', () => {
    render(<VideoControls {...makeProps({ muted: true })} />);
    expect(screen.getByRole('button', { name: 'Unmute' })).toBeInTheDocument();
  });

  it('calls onVolume when the volume slider changes', () => {
    const onVolume = vi.fn();
    render(<VideoControls {...makeProps({ onVolume })} />);
    fireEvent.change(screen.getByLabelText('Volume'), { target: { value: '0.5' } });
    expect(onVolume).toHaveBeenCalledWith(0.5);
  });

  it('calls onSpeed when the playback speed changes', () => {
    const onSpeed = vi.fn();
    render(<VideoControls {...makeProps({ onSpeed })} />);
    fireEvent.change(screen.getByLabelText('Playback speed'), { target: { value: '1.5' } });
    expect(onSpeed).toHaveBeenCalledWith(1.5);
  });

  it('does not render the quality selector when only auto is available', () => {
    render(<VideoControls {...makeProps()} />);
    expect(screen.queryByRole('button', { name: 'Video quality' })).not.toBeInTheDocument();
  });

  it('renders the quality selector and lists available qualities when populated', () => {
    const videoQualities: VideoQualities = {
      '1080p': 'https://example.com/1080.mp4',
      '720p': 'https://example.com/720.mp4',
    };
    render(<VideoControls {...makeProps({ videoQualities })} />);

    const qualityBtn = screen.getByRole('button', { name: 'Video quality' });
    expect(qualityBtn).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(qualityBtn);
    expect(qualityBtn).toHaveAttribute('aria-expanded', 'true');

    const listbox = screen.getByRole('listbox', { name: 'Select video quality' });
    expect(listbox).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Auto/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /1080p/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /720p/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /480p/ })).not.toBeInTheDocument();
  });

  it('calls onQualityChange and closes the dropdown when a quality is picked', () => {
    const onQualityChange = vi.fn();
    const videoQualities: VideoQualities = {
      '1080p': 'https://example.com/1080.mp4',
      '720p': 'https://example.com/720.mp4',
    };
    render(<VideoControls {...makeProps({ videoQualities, onQualityChange })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Video quality' }));
    fireEvent.click(screen.getByRole('option', { name: /720p/ }));

    expect(onQualityChange).toHaveBeenCalledWith('720p');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows the active quality label when a non-auto quality is selected', () => {
    const videoQualities: VideoQualities = {
      '1080p': 'https://example.com/1080.mp4',
      '720p': 'https://example.com/720.mp4',
    };
    render(<VideoControls {...makeProps({ videoQualities, quality: '1080p' })} />);
    expect(screen.getByRole('button', { name: 'Video quality' })).toHaveTextContent('1080p');
  });

  it('does not render the captions button when there are no captions', () => {
    render(<VideoControls {...makeProps({ hasCaptions: false })} />);
    expect(screen.queryByRole('button', { name: /captions/i })).not.toBeInTheDocument();
  });

  it('renders the captions button and calls onSubtitles when captions exist', () => {
    const onSubtitles = vi.fn();
    render(<VideoControls {...makeProps({ hasCaptions: true, onSubtitles })} />);
    const btn = screen.getByRole('button', { name: /captions/i });
    fireEvent.click(btn);
    expect(onSubtitles).toHaveBeenCalledTimes(1);
  });

  it('calls onFullscreen when the fullscreen button is clicked', () => {
    const onFullscreen = vi.fn();
    render(<VideoControls {...makeProps({ onFullscreen })} />);
    fireEvent.click(screen.getByRole('button', { name: /fullscreen/i }));
    expect(onFullscreen).toHaveBeenCalledTimes(1);
  });
});
