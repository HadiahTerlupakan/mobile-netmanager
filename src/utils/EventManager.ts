type EventHandler = (...args: any[]) => void;
type CleanupFunction = () => void;

interface ListenerEntry {
  handler: EventHandler | null; // Handler might be null if we only track cleanup
  cleanup: CleanupFunction;
}

class EventManager {
  private listeners: Map<string, ListenerEntry[]> = new Map();

  /**
   * Add a listener to be tracked.
   * @param key A unique key to group listeners (e.g., "notifications", "socket")
   * @param handler The event handler function (optional, for reference)
   * @param cleanup The cleanup function returned by the subscription
   */
  addListener(key: string, handler: EventHandler | null, cleanup: CleanupFunction): void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key)!.push({ handler, cleanup });
  }

  /**
   * Remove a specific listener if handler reference is provided.
   */
  removeListener(key: string, handler: EventHandler): void {
    const listeners = this.listeners.get(key);
    if (listeners) {
      const index = listeners.findIndex((l) => l.handler === handler);
      if (index !== -1) {
        listeners[index].cleanup();
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Remove all listeners associated with a key.
   * Useful for cleaning up when a component unmounts.
   */
  removeAllListeners(key?: string): void {
    if (key) {
      const listeners = this.listeners.get(key);
      if (listeners) {
        listeners.forEach((l) => {
            try {
                l.cleanup();
            } catch (e) {
                console.warn(`[EventManager] Failed to cleanup listener for key ${key}`, e);
            }
        });
        this.listeners.delete(key);
      }
    } else {
      // Remove all listeners globally
      this.listeners.forEach((listeners, k) => {
        listeners.forEach((l) => {
            try {
                l.cleanup();
            } catch (e) {
                console.warn(`[EventManager] Failed to cleanup listener for key ${k}`, e);
            }
        });
      });
      this.listeners.clear();
    }
  }
}

export const eventManager = new EventManager();
