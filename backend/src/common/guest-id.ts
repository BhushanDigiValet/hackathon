export function guestId(req: any): number {
  return Number(req.headers['x-guest-id']) || 1;
}
