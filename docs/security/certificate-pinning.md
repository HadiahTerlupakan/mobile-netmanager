# Certificate Pinning

## Setup

Certificate pinning is configured via Android's Network Security Config.

### Generating Pin Hashes

Run this command to get the SHA-256 pin for radpro.id:

```bash
openssl s_client -connect radpro.id:443 -servername radpro.id 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

### Updating Pins

1. Generate new pin hash using the command above
2. Update `android/app/src/main/res/xml/network_security_config.xml`
3. Always keep at least 2 pins (primary + backup from different CA)
4. Set expiration date to give time for rotation
5. Rebuild the app

### iOS

iOS certificate pinning requires a native module or third-party library.
For now, iOS relies on ATS (App Transport Security) which enforces HTTPS.
Consider adding TrustKit for iOS pinning in a future iteration.

### Testing

- Test with production domain to verify pinning works
- Test with a proxy (Charles/mitmproxy) to verify pinning blocks MITM
- Ensure development builds can still connect to local servers
