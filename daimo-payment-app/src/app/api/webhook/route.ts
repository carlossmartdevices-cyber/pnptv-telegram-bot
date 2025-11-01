// Simple placeholder - webhooks are handled by main bot
export async function POST(request: Request) {
  return Response.json({ message: 'Webhook handled by main bot' }, { status: 200 });
}