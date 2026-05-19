import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory storage for rate limiting.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Clean up expired keys periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key)
      }
    }
  }, 60000)
}

type RateLimitConfig = {
  limit: number;
  windowMs: number;
}

const ROUTE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/leads': { limit: 5, windowMs: 60000 },
  '/api/webhook': { limit: 15, windowMs: 60000 },
  'default': { limit: 60, windowMs: 60000 }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = pathname.startsWith('/api') 
    ? handleApiRateLimit(request)
    : NextResponse.next()

  // Apply Industry Standard Security Headers to all responses
  applySecurityHeaders(response, request)

  return response
}

function handleApiRateLimit(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl
  const ip = (request as any).ip || request.headers.get('x-forwarded-for') || '127.0.0.1'
  
  let config = ROUTE_LIMITS['default']
  for (const route in ROUTE_LIMITS) {
    if (pathname.startsWith(route)) {
      config = ROUTE_LIMITS[route]
      break
    }
  }

  const key = `${ip}:${pathname}`
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    })

    const response = NextResponse.next()
    setRateLimitHeaders(response, config.limit, config.limit - 1, now + config.windowMs)
    return response
  }

  if (record.count >= config.limit) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000)
    console.warn(`[RATE LIMIT] Request blocked from IP ${ip} for ${pathname}. Retry in ${retryAfter}s.`)

    const errorResponse = new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds: retryAfter
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString()
        }
      }
    )

    setRateLimitHeaders(errorResponse, config.limit, 0, record.resetTime)
    return errorResponse
  }

  record.count += 1
  rateLimitMap.set(key, record)

  const response = NextResponse.next()
  setRateLimitHeaders(response, config.limit, config.limit - record.count, record.resetTime)
  return response
}

function setRateLimitHeaders(response: NextResponse, limit: number, remaining: number, resetTime: number) {
  response.headers.set('X-RateLimit-Limit', limit.toString())
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString())
}

/**
 * Applies security headers based on OWASP secure header recommendations.
 */
function applySecurityHeaders(response: NextResponse, request: NextRequest) {
  // 1. Prevent Clickjacking: deny framing
  response.headers.set('X-Frame-Options', 'DENY')

  // 2. Prevent MIME Sniffing: force declared content-types
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // 3. Control Referrer Information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // 4. Force HTTPS (HSTS) in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  // 5. Restrict browser features (Permissions Policy)
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')

  // 6. Cross-Origin Policies
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // 7. CORS Protection for APIs: only allow same-origin requests by default
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  const protocol = request.nextUrl.protocol
  const sameOrigin = origin ? origin === `${protocol}//${host}` : true

  if (request.nextUrl.pathname.startsWith('/api') && !sameOrigin) {
    // For general APIs, block external cross-origin requests unless specifically allowed
    // Webhooks might need specific origin configuration or authentication signature checks instead
    response.headers.set('Access-Control-Allow-Origin', `${protocol}//${host}`)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Test-Tool')
  }
}

export const config = {
  matcher: '/:path*', // Match both API routes and frontend pages to apply security headers globally
}
