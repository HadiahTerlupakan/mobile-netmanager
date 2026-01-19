// Custom entry point for expo-router
// This ensures LocationTrackingService is loaded at app cold start
// so that TaskManager.defineTask() is registered before any navigation

// Import the background task first - this registers the task
import "./src/services/LocationTrackingService";

// Then import the expo-router entry
import "expo-router/entry";
