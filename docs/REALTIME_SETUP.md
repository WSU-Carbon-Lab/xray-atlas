# Real-Time Upvotes Setup Guide

## Overview

Real-time upvote updates have been implemented using Supabase Realtime. When any user upvotes or removes an upvote from a molecule, all connected clients will see the update automatically without page refresh.

## Implementation Details

### 1. Environment Variables

Add these to your `.env` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://lqwpwaakfhqvgzzveafi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxxd3B3YWFrZmhxdmd6enZlYWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNjMzNTcsImV4cCI6MjA3NjczOTM1N30.3hoWOfVG2V2LJRRElg4p9kcC2FONWUbesjXGvXZrlBQ
```

**Note**: The anon key is safe to expose in client-side code. It's designed for public use with RLS policies protecting your data.

### 2. Database Configuration

Realtime has been enabled for:
- `moleculeupvotes` table - Tracks individual upvotes
- `molecules` table - Contains the upvote counter

The migration `enable_realtime_upvotes` has been applied to add these tables to the Supabase Realtime publication.

### 3. Code Structure

**Client Setup** (`src/lib/supabase-client.ts`):
- Creates a Supabase client configured for Realtime
- Uses the anon key for client-side subscriptions

**React Hook** (`src/hooks/useRealtimeUpvotes.ts`):
- Subscribes to changes on `moleculeupvotes` and `molecules` tables
- Automatically updates upvote count and user upvote status
- Handles connection state and cleanup

**Component Integration** (`src/app/components/MoleculeDisplay.tsx`):
- Uses the `useRealtimeUpvotes` hook
- Displays real-time upvote counts
- Updates UI automatically when upvotes change

### 4. How It Works

1. **User clicks upvote** → tRPC mutation updates database
2. **Database change** → Supabase Realtime broadcasts change
3. **All connected clients** → Receive update via WebSocket
4. **UI updates** → Hook updates state, component re-renders
5. **No page refresh needed** → Instant updates for all users

### 5. Security

- RLS policies protect data access
- Anon key only allows read access (with RLS)
- Write operations still go through tRPC with authentication
- Realtime subscriptions respect RLS policies

### 6. Performance

- WebSocket connection is shared across all subscriptions
- Automatic reconnection on connection loss
- Efficient filtering by molecule ID
- Rate limiting: 10 events per second (configurable)

## Testing

1. Open two browser windows/tabs
2. Navigate to the same molecule page in both
3. Upvote in one window
4. Watch the upvote count update in real-time in the other window

## Troubleshooting

### Updates Not Appearing

1. **Check environment variables**: Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
2. **Check browser console**: Look for subscription status messages
3. **Verify Realtime is enabled**: Check Supabase dashboard → Database → Replication
4. **Check RLS policies**: Ensure public read access is allowed

### Connection Issues

- Realtime automatically reconnects on connection loss
- Check network connectivity
- Verify Supabase service status

## Future Enhancements

- Add real-time updates for experiment upvotes (when implemented)
- Add optimistic updates for better UX
- Add connection status indicator
- Add error recovery UI
