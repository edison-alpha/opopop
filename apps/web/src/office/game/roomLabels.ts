/**
 * Sistem Label Ruangan OPPERA.
 * Visual rendering (corner brackets, dark hover pill, zoom overview badges)
 * ditangani secara HD & anti-aliased oleh React DOM overlay (`GameUIOverlay.tsx`).
 */
import * as Phaser from "phaser"

export class RoomLabelSystem {
  constructor(private scene: Phaser.Scene) {}

  public buildOverviewBadges() {}
  public onPointerMove(_p: Phaser.Input.Pointer) {}
  public onGameOut() {}
  public update(_currentZoom: number) {}
  public destroy() {}
}
