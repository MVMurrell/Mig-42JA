import { Express } from "express";

/**
 * MOBILE AUTHENTICATION ENDPOINTS
 * 
 * This module provides specialized authentication endpoints for mobile devices
 * that bypass sessionStorage limitations in PWA environments.
 */

export function setupMobileAuth(app: Express) {
  console.log('📱 Setting up mobile authentication endpoints...');

  // Mobile-specific login endpoint with enhanced error handling
  app.get("/api/auth/mobile-login", (req, res) => {
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|Opera Mini|IEMobile|WPDesktop/i.test(userAgent);
    
    console.log('📱 MOBILE LOGIN: Request from device:', {
      isMobile,
      userAgent: userAgent.substring(0, 100) + '...',
      sessionID: req.sessionID,
      hasSession: !!req.session
    });

    if (!isMobile) {
      return res.redirect('/api/auth/login');
    }

    // For mobile devices, redirect to regular login with mobile flag
    res.redirect('/api/auth/login?mobile=true&source=mobile_help');
  });

  // Mobile authentication status and debugging endpoint
  app.get("/api/auth/mobile-status", (req, res) => {
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|Opera Mini|IEMobile|WPDesktop/i.test(userAgent);
    const isPWA = req.headers['x-requested-with'] === 'PWA' || 
                  userAgent.includes('wv') || // WebView indicator
                  userAgent.includes('Version/') && userAgent.includes('Mobile/');

    const authInfo = {
      mobile_detected: isMobile,
      pwa_detected: isPWA,
      user_agent: userAgent,
      is_authenticated: !!req.user,
      session_id: req.sessionID,
      session_exists: !!req.session,
      session_keys: req.session ? Object.keys(req.session) : [],
      cookies_present: Object.keys(req.cookies || {}),
      secure_cookie: !!req.cookies?.jemzy_auth,
      oauth_state_present: !!req.session?.oauth_state,
      timestamp: new Date().toISOString()
    };

    console.log('📱 MOBILE STATUS: Authentication debugging info:', authInfo);

    // Return HTML page for mobile debugging
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Mobile Authentication Status - Jemzy</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background: #1a1a2e; color: #eee; }
          .container { max-width: 600px; margin: 0 auto; }
          .status-card { background: #16213e; border: 1px solid #0f4c75; border-radius: 8px; padding: 20px; margin: 10px 0; }
          .status-good { border-color: #27ae60; }
          .status-warning { border-color: #f39c12; }
          .status-error { border-color: #e74c3c; }
          .btn { display: inline-block; padding: 10px 20px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; margin: 5px; }
          .btn:hover { background: #2980b9; }
          .detail { font-family: monospace; font-size: 12px; color: #bdc3c7; margin-top: 10px; }
          h1 { color: #3498db; text-align: center; }
          h2 { color: #e67e22; border-bottom: 1px solid #34495e; padding-bottom: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔍 Mobile Authentication Status</h1>
          
          <div class="status-card ${authInfo.is_authenticated ? 'status-good' : 'status-error'}">
            <h2>Authentication Status</h2>
            <p><strong>Authenticated:</strong> ${authInfo.is_authenticated ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Session Valid:</strong> ${authInfo.session_exists ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Secure Cookie:</strong> ${authInfo.secure_cookie ? '✅ Yes' : '❌ No'}</p>
          </div>

          <div class="status-card ${authInfo.mobile_detected ? 'status-good' : 'status-warning'}">
            <h2>Device Detection</h2>
            <p><strong>Mobile Device:</strong> ${authInfo.mobile_detected ? '📱 Yes' : '🖥️ No'}</p>
            <p><strong>PWA Mode:</strong> ${authInfo.pwa_detected ? '📲 Yes' : '🌐 No'}</p>
          </div>

          <div class="status-card">
            <h2>Quick Actions</h2>
            <a href="/api/auth/login?mobile=true" class="btn">Try Mobile Login</a>
            <a href="/api/auth/logout" class="btn">Logout</a>
            <a href="/" class="btn">Return to App</a>
          </div>

          <div class="status-card">
            <h2>Technical Details</h2>
            <div class="detail">
              <p><strong>Session ID:</strong> ${authInfo.session_id}</p>
              <p><strong>Cookies:</strong> ${authInfo.cookies_present.join(', ') || 'None'}</p>
              <p><strong>OAuth State:</strong> ${authInfo.oauth_state_present ? 'Present' : 'Not present'}</p>
              <p><strong>Timestamp:</strong> ${authInfo.timestamp}</p>
            </div>
          </div>

          <div class="status-card">
            <h2>Browser Information</h2>
            <div class="detail">
              <p><strong>User Agent:</strong></p>
              <p style="word-break: break-all; margin-top: 5px;">${authInfo.user_agent}</p>
            </div>
          </div>

          ${!authInfo.is_authenticated ? `
          <div class="status-card status-warning">
            <h2>🚨 Authentication Issue Detected</h2>
            <p>Your mobile browser appears to be blocking authentication due to storage partitioning security policies.</p>
            <p><strong>Solutions:</strong></p>
            <ul>
              <li>Try using a desktop/laptop browser</li>
              <li>Clear browser cache and cookies</li>
              <li>Try incognito/private browsing mode</li>
              <li>Switch to a different mobile browser</li>
            </ul>
          </div>
          ` : ''}

        </div>
      </body>
      </html>
    `);
  });

  // Mobile authentication error handler
  app.get("/api/auth/mobile-error", (req, res) => {
    const errorType = req.query.error || 'unknown';
    const errorDescription = req.query.error_description || '';
    
    console.log('📱 MOBILE ERROR: Authentication error occurred:', {
      errorType,
      errorDescription,
      userAgent: req.headers['user-agent']?.substring(0, 100)
    });

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Error - Jemzy</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background: #1a1a2e; color: #eee; text-align: center; }
          .container { max-width: 500px; margin: 0 auto; }
          .error-card { background: #16213e; border: 2px solid #e74c3c; border-radius: 8px; padding: 30px; }
          .btn { display: inline-block; padding: 12px 24px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; margin: 10px; }
          .btn:hover { background: #2980b9; }
          h1 { color: #e74c3c; }
          h2 { color: #f39c12; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-card">
            <h1>🚨 Authentication Failed</h1>
            <h2>Mobile Browser Issue</h2>
            <p>Your mobile browser is blocking authentication due to security policies that prevent sessionStorage access in PWA environments.</p>
            
            <p><strong>Error:</strong> ${errorType}</p>
            ${errorDescription ? `<p><strong>Details:</strong> ${errorDescription}</p>` : ''}
            
            <div style="margin-top: 30px;">
              <a href="/api/auth/mobile-status" class="btn">View Detailed Status</a>
              <a href="/" class="btn">Try Again</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  });

  console.log('📱 Mobile authentication endpoints registered successfully');
}