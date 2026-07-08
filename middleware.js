export const config = {
  matcher: ['/admin', '/admin/:path*'],
};

export default function middleware(req) {
  const auth = req.headers.get('authorization');

  if (auth && auth.startsWith('Basic ')) {
    const [user, pass] = atob(auth.slice(6)).split(':');
    if (user === (process.env.ADMIN_USER || 'admin') && pass === process.env.ADMIN_PASSWORD) {
      return;
    }
  }

  return new Response('Neautorizováno', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
  });
}
