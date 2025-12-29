# Maestro E2E Testing for Mobile App

This directory contains Maestro flows for automated E2E testing of the SBL KARYAWAN mobile app.

## Prerequisites

1. Install Maestro CLI:

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

2. Verify installation:

```bash
maestro --version
```

3. Start Android emulator or connect physical device

## Running Tests

```bash
# Run all flows
maestro test .maestro/

# Run specific flow
maestro test .maestro/work-order-flow.yaml

# Run with studio mode (visual debugger)
maestro studio
```

## Flows

| Flow                   | Description           |
| ---------------------- | --------------------- |
| `login.yaml`           | Employee login flow   |
| `work-order-flow.yaml` | Complete WO lifecycle |
| `attendance-flow.yaml` | Check-in/out flow     |

## Configuration

The app should be built with development client:

```bash
npx expo run:android
```

Or use EAS Build:

```bash
eas build --profile development --platform android
```
