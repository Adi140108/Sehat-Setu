import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

let initializeAppFn: any = null;
let certFn: any = null;
let getAppsFn: any = null;
let getAuthFn: any = null;

export function apiPlugin(): Plugin {
  return {
    name: 'sehat-setu-api-server',
    async configureServer(server) {
      // Lazily load firebase-admin modular ESM sub-packages
      try {
        const appMod = await import('firebase-admin/app');
        initializeAppFn = appMod.initializeApp;
        certFn = appMod.cert;
        getAppsFn = appMod.getApps;

        const authMod = await import('firebase-admin/auth');
        getAuthFn = authMod.getAuth;
      } catch (e) {
        console.error('Firebase Admin: Failed to load modular firebase-admin SDK:', e);
      }
      // Load environment variables using process.env (Vite loads .env files in dev)
      const minimothApiKey = process.env.MINIMOTH_API_KEY || '';

      // Initialize Firebase Admin SDK
      let firebaseAdminInitialized = false;
      const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');
      
      let serviceAccount: any = null;
      if (fs.existsSync(serviceAccountPath)) {
        try {
          serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
          console.log('Firebase Admin: Loaded real service account key from firebase-service-account.json');
        } catch (e) {
          console.error('Firebase Admin: Error parsing firebase-service-account.json:', e);
        }
      }

      if (!serviceAccount) {
        // Fallback dummy service account for local Firebase Emulator testing
        serviceAccount = {
          type: "service_account",
          project_id: "sehat-setu-7cff7",
          private_key_id: "mock_id",
          // Standard dummy RS256 private key to satisfy Admin SDK validation
          private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDFVut5ACDf5mMW\n26EX4iMGUSTU6sU8b3WX887scVsfuvfFvylabs4K3DgrIg1Hy4VDHOLYJJib1FqE\nzoR+pHNMHVg+KEokfvQ+1i7wuP1Z9W0sxVqT5DYPn8SfwoeLfs+mmxmR2cwpOaeh\no+jiKpF8VPqtS/psO8+kNJLUr9JAfZp97b6NLGQytBB4dTiXyzbISbg6koEyjzZp\nWXoUgNjRbCDXOAeor75BanhC8GdTa0MgZiUZyqx1wreRtaciypd3+EajwwmO//9i\nr4ra81Na9MkCCIW9gV7J92bZLkp1gawUW7AunFgwCWoS+cxdkWqXX6TfkqNaOOVZ\nSOKQov6nAgMBAAECggEALbubDoutErZ9uEpl5vcNTuV3N7DAzOS3x+NEzR7oE05t\nJXLLzp1nOrUWf0iA82aDF66WE6lHhLWN1MFXi1HpNnaGgMEtjY+uYvGYJ0l3zWVH\nS9zgxO1aafyIwM2ARB+7V80R++8RlWw7IQavbdqXpMy823SEMJkb4d4dORUWEMOi\nLDWcd4kRXv6QnmFIU/vrsaDU1ZKIu7OT7AJwo6yJL9iGwogfXGkAKYLGF8hh3bpu\niUNdxdAkQ5BdTAI4k+TVKZuFhTpT4qpQIJ3xTiWfZ4r2Wxvu01Tvj1dO6gmQk2WR\nsR6PJoTxrEN5ETTS8fzwuPd2HV2an3ZQX1B6W/jkQQKBgQD8dJHAkt1THVDx6dZr\nNE9OET9mHr576Wfe2dJm21saIEWIOJ0GoLIOQaOIRn79BQ1PfjkKbp8th1BICdDE\n+FwKwa3qzsGUaebb6EICOmqlTNeEedlsDlH5nIVxm8nKeQxHc3EwULNZus15T1XN\nD2AWVv7HQPAJroSVQ61E2axBPwKBgQDIHD21WGdSwE1ZQ/PXwAy8ddWwumohOmIS\nmGMyIlbQNxa1SiUefEmG9uU3aPM91vVPD/lXMYJMxlIPC06XOYKw4FmcV4lcYmoz\nI1oENZ8JqVizm6FY8C8CZm9+JodQGcA2d4PPz4w38sECJcZP9jWZMRIQthpGHgkh\nzkLtq1AAmQKBgQCoDkV0h4/UI2DeGYcGSIU+d9bXeUHepOrje+dHV2DXDIKdAurt\nHY5KVUGylxM0Beftch4wpqFKIpi7y+TxKk/DTVkkRUyyKqlm3L8MUqzpqzSQ2Lh2\n6TWCz8I5dbaoFVqqOdwwiJhL9EGSLtD0N/cECBeEtuLT3xwdbTbr7Wdw6wKBgDrI\nsQf4tEGG5DH42ETk0dj69I8587tXH0A/K8Sqeb4osK8I3OabtC3FkYg5eFsOLnnP\nQ3vtu006ZRiuRaP+7PlwrmJTBLLy5ienluXtqo54BOqeKUOrKuQVm2L/hnhtWB2n\n9jyxx4sX8MLkveD3fr9FvvzRwd4fLKeVo+uVi6bhAoGAXR0rl/ivtlrep8EBZMto\nOD7GVBItCkR4ePwIW8vCCxv357QM7y0yaTbhca1kqrMHWF+RVaUkMtwUCeH0E4Ps\ni+vP/nE3YQh+Nh3T9Tqs1Br9WPsDn4Swjny3U0n9axbG+LizFIKSJOcMJ4DwY7KV\nrNuVGBlcx3p1qqLurmRLc2Y=\n-----END PRIVATE KEY-----\n",
          client_email: "firebase-adminsdk-mock@sehat-setu-7cff7.iam.gserviceaccount.com"
        };
        console.warn('Firebase Admin: firebase-service-account.json not found. Using local mock key (valid for Firebase Emulator testing).');
      }

      if (initializeAppFn && certFn && getAppsFn) {
        try {
          if (getAppsFn().length === 0) {
            initializeAppFn({
              credential: certFn(serviceAccount)
            });
          }
          firebaseAdminInitialized = true;
          console.log('Firebase Admin: Successfully initialized.');
        } catch (err: any) {
          console.error('Firebase Admin Initialization Failed:', err);
        }
      }

      // Intercept dev server requests
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();

        // Helper to parse JSON body
        const getBody = (): Promise<any> => {
          return new Promise((resolve) => {
            let data = '';
            req.on('data', chunk => data += chunk);
            req.on('end', () => {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                resolve({});
              }
            });
          });
        };

        // Helper to write JSON response
        const sendJSON = (status: number, body: any) => {
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(body));
        };

        // 1. Send OTP Endpoint
        if (req.url === '/api/auth/send' && req.method === 'POST') {
          try {
            const { phone } = await getBody();
            if (!phone || !/^\+91[6-9]\d{9}$/.test(phone)) {
              return sendJSON(422, { error: 'Invalid Indian mobile number. Format: +91XXXXXXXXXX', code: 'INVALID_PHONE' });
            }

            console.log(`MiniMoth API: Requesting OTP send for ${phone}`);
            
            const mmRes = await fetch('https://api.minimoth.dev/v1/otp/send', {
              method: 'POST',
              headers: {
                'X-Api-Key': minimothApiKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ phone })
            });

            const data = (await mmRes.json()) as any;
            if (!mmRes.ok) {
              console.error('MiniMoth OTP Send error:', data);
              return sendJSON(mmRes.status, data);
            }

            console.log(`MiniMoth API: OTP successfully sent, id: ${data.otp_id}`);
            return sendJSON(200, data);
          } catch (err: any) {
            console.error('API Send OTP Server Error:', err);
            return sendJSON(500, { error: 'Internal server error requesting OTP', code: 'SERVER_ERROR' });
          }
        }

        // 2. Verify OTP Endpoint (and mint custom token)
        if (req.url === '/api/auth/verify' && req.method === 'POST') {
          try {
            const { phone, code } = await getBody();
            if (!phone || !code || code.length !== 6) {
              return sendJSON(422, { error: 'Invalid parameters. Need phone and 6-digit code.', code: 'INVALID_PARAMS' });
            }

            console.log(`MiniMoth API: Requesting verification for ${phone}`);

            const mmRes = await fetch('https://api.minimoth.dev/v1/otp/verify', {
              method: 'POST',
              headers: {
                'X-Api-Key': minimothApiKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ phone, code })
            });

            const data = (await mmRes.json()) as any;
            if (!mmRes.ok) {
              console.error('MiniMoth OTP Verify error:', data);
              return sendJSON(mmRes.status, data);
            }

            console.log(`MiniMoth API: Phone ${phone} verified successfully!`);

            // Mint Firebase Custom Token
            if (!firebaseAdminInitialized) {
              console.error('Firebase Admin SDK is not initialized. Cannot mint Custom Token.');
              return sendJSON(500, { error: 'Firebase Admin not initialized', code: 'FIREBASE_ERROR' });
            }

            const uid = `phone:${phone}`;
            const customToken = await getAuthFn().createCustomToken(uid, {
              phoneNumber: phone,
              role: 'citizen'
            });

            console.log(`Firebase Admin: Minted custom token for uid ${uid}`);
            return sendJSON(200, {
              success: true,
              customToken,
              phone
            });
          } catch (err: any) {
            console.error('API Verify OTP Server Error:', err);
            return sendJSON(500, { error: 'Internal server error verifying OTP', code: 'SERVER_ERROR' });
          }
        }

        // 3. Reverse Geocode Proxy Endpoint
        if (req.url?.startsWith('/api/location/reverse') && req.method === 'GET') {
          try {
            const urlObj = new URL(req.url, `http://${req.headers.host}`);
            const lat = urlObj.searchParams.get('lat');
            const lon = urlObj.searchParams.get('lon');

            if (!lat || !lon) {
              return sendJSON(422, { error: 'Missing coordinates', code: 'INVALID_PARAMS' });
            }

            console.log(`Nominatim Proxy: Reverse geocoding for lat=${lat}, lon=${lon}`);
            const resNominatim = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
              {
                headers: {
                  'User-Agent': 'SehatSetu/1.0 (contact@sehatsetu.gov.in)'
                }
              }
            );

            const data = await resNominatim.json();
            return sendJSON(200, data);
          } catch (err) {
            console.error('Nominatim Proxy Error:', err);
            return sendJSON(500, { error: 'Failed to reverse geocode coordinate.', code: 'SERVER_ERROR' });
          }
        }

        next();
      });
    }
  };
}
