export type ViewId = 'pos' | 'admin' | 'price';
export type ViewportId = 'desktop' | 'laptop' | 'tablet' | 'mobile';

export interface CanvasState {
  view: ViewId;
  viewport: ViewportId;
  density: number;
  alerts: boolean;
  contrast: boolean;
}

export interface ViewControls {
  view: ViewId;
  viewport: ViewportId;
  density: number;
  alerts: boolean;
  contrast: boolean;
  onViewChange: (view: ViewId) => void;
  onViewportChange: (viewport: ViewportId) => void;
  onDensityChange: (density: number) => void;
  onAlertsToggle: () => void;
  onContrastToggle: () => void;
}
