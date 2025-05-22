import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface LoaderState {
  text: string;
  minDisplayTime: number;
  visible: boolean;
}

@Injectable({ providedIn: 'root' })
export class LoaderService {
  private state$ = new BehaviorSubject<LoaderState>({
    text: 'Loading...',
    minDisplayTime: 0,
    visible: false,
  });
  private showTimestamp: number = 0;
  private hideTimeout: any;

  get loaderState$() {
    return this.state$.asObservable();
  }

  show(text: string = 'Loading...', minDisplayTime: number = 0) {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    this.showTimestamp = Date.now();
    this.state$.next({ text, minDisplayTime, visible: true });
  }

  hide() {
    const current = this.state$.getValue();
    const elapsed = Date.now() - this.showTimestamp;
    const minTime = current.minDisplayTime || 0;
    if (elapsed >= minTime) {
      this.state$.next({ ...current, visible: false });
    } else {
      this.hideTimeout = setTimeout(() => {
        this.state$.next({ ...current, visible: false });
        this.hideTimeout = null;
      }, minTime - elapsed);
    }
  }
}
