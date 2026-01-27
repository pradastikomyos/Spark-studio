# Fix: Flexible Session Booking Logic - Remove 30-Minute Buffer

## Business Context
**Location**: Bandung, Indonesia (WIB/UTC+7)  
**Date**: January 27, 2026

## Problem Statement

### Current System (Restrictive)
- **30-minute buffer rule**: Customers CANNOT book if current time is within 30 minutes of session start
- **Example**: 
  - Session: 18:00-20:30 (Evening)
  - Current time: 17:46
  - Result: ❌ BLOCKED (within 30-min buffer)
  
### Issues with Current System
1. **Lost Revenue**: Customers turned away even though session hasn't started
2. **Midtrans Timeout**: 30-min buffer + payment time = frequent failures
3. **Poor UX**: Artificial restriction frustrates customers
4. **Not Industry Standard**: Major platforms (Google, Slack, Notion) allow booking during active sessions

## New Business Logic (Flexible)

### Core Principle
**Allow booking as long as current time hasn't passed the END of the session**

### New Session Times (2.5 hours each)
```
Morning:    09:00 - 11:30 (was 09:00-12:00)
Afternoon:  12:00 - 14:30 (new)
Afternoon:  15:00 - 17:30 (new)
Evening:    18:00 - 20:30 (was 18:00-21:00)
```

### Booking Rules
| Current Time | Session | Old System | New System |
|--------------|---------|------------|------------|
| 17:46 | 18:00-20:30 | ❌ Blocked | ✅ Allowed |
| 18:10 | 18:00-20:30 | ❌ Blocked | ✅ Allowed |
| 20:35 | 18:00-20:30 | ❌ Blocked | ❌ Blocked (session ended) |
| 11:00 | 09:00-11:30 | ✅ Allowed | ✅ Allowed |
| 11:35 | 09:00-11:30 | ❌ Blocked | ❌ Blocked (session ended) |

### Benefits
1. **More Booking Opportunities**: Customers can book even after session starts
2. **Solves Midtrans Issues**: More time to complete payment
3. **Better UX**: Flexible, customer-friendly
4. **Industry Standard**: Matches Google Calendar, Slack, Notion patterns

## Technical Implementation

### Files to Modify

#### 1. `src/utils/timezone.ts`
**Changes**:
- Update `isTimeSlotBookable()` to check against session END time instead of START time
- Remove 30-minute buffer logic
- Add session duration constant (2.5 hours = 150 minutes)

**New Logic**:
```typescript
// OLD: Check if slot start time > current time + 30 min buffer
// NEW: Check if slot end time > current time (no buffer)

export function isTimeSlotBookable(
  dateString: string,
  timeSlot: string
): boolean {
  const SESSION_DURATION_MINUTES = 150; // 2.5 hours
  const slotStartTime = createWIBDate(dateString, timeSlot);
  const slotEndTime = addMinutes(slotStartTime, SESSION_DURATION_MINUTES);
  const currentTime = nowWIB();
  
  // Allow booking if session hasn't ended yet
  return slotEndTime > currentTime;
}
```

#### 2. `src/pages/BookingPage.tsx`
**Changes**:
- Update `availableTimeSlots` useMemo to remove buffer parameter
- Update `getMinutesUntilClose()` to calculate time until session END
- Update urgency warnings to reflect new logic
- Update UI text to clarify booking is allowed during session

**Key Updates**:
```typescript
// Remove buffer from validation
const isBookable = isTimeSlotBookable(dateString, avail.time_slot);

// Calculate time until session END (not start)
const getMinutesUntilClose = (timeSlot: string): number | null => {
  const SESSION_DURATION_MINUTES = 150;
  const slotStartTime = createWIBDate(dateString, timeSlot);
  const slotEndTime = addMinutes(slotStartTime, SESSION_DURATION_MINUTES);
  const diffMs = slotEndTime.getTime() - nowWIB().getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
};
```

#### 3. Frontend Display Updates
**Session Labels**:
```typescript
const groupedSlots = useMemo(() => {
  const morning: typeof availableTimeSlots = [];
  const afternoon1: typeof availableTimeSlots = [];
  const afternoon2: typeof availableTimeSlots = [];
  const evening: typeof availableTimeSlots = [];

  availableTimeSlots.forEach((slot) => {
    const hour = parseInt(slot.time.split(':')[0]);
    if (hour >= 9 && hour < 12) morning.push(slot);
    else if (hour >= 12 && hour < 15) afternoon1.push(slot);
    else if (hour >= 15 && hour < 18) afternoon2.push(slot);
    else if (hour >= 18) evening.push(slot);
  });

  return { morning, afternoon1, afternoon2, evening };
}, [availableTimeSlots]);
```

**Display Names**:
- Morning Sessions: 09:00 - 11:30
- Afternoon Sessions (Early): 12:00 - 14:30
- Afternoon Sessions (Late): 15:00 - 17:30
- Evening Sessions: 18:00 - 20:30

### Backend Validation (Edge Functions)

#### 4. `supabase/functions/create-midtrans-token/index.ts`
**Add server-side validation**:
```typescript
// Validate booking is still within session time
const SESSION_DURATION_MINUTES = 150;
const slotStartTime = new Date(`${bookingDate}T${bookingTime}+07:00`);
const slotEndTime = new Date(slotStartTime.getTime() + SESSION_DURATION_MINUTES * 60000);
const now = new Date();

if (now > slotEndTime) {
  return new Response(
    JSON.stringify({ error: 'Session has ended. Please select a different time slot.' }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}
```

## Testing Scenarios

### Test Case 1: Booking During Active Session
```
Current Time: 18:15 WIB
Selected Slot: 18:00-20:30
Expected: ✅ Allowed (session ends at 20:30)
```

### Test Case 2: Booking Just Before Session Ends
```
Current Time: 20:25 WIB
Selected Slot: 18:00-20:30
Expected: ✅ Allowed (5 minutes remaining)
```

### Test Case 3: Booking After Session Ended
```
Current Time: 20:35 WIB
Selected Slot: 18:00-20:30
Expected: ❌ Blocked (session ended at 20:30)
```

### Test Case 4: Morning Session
```
Current Time: 10:00 WIB
Selected Slot: 09:00-11:30
Expected: ✅ Allowed (session ends at 11:30)
```

## Production-Grade Considerations

### 1. Timezone Consistency
- ✅ All calculations use WIB (UTC+7)
- ✅ Use `nowWIB()` instead of `new Date()`
- ✅ Server and client use same timezone utilities

### 2. Real-Time Updates
- ✅ Current time updates every 60 seconds
- ✅ Availability polls every 30 seconds
- ✅ Refresh on tab visibility change

### 3. User Experience
- ✅ Clear urgency warnings for slots ending soon
- ✅ Confirmation modal for high-urgency bookings
- ✅ Real-time countdown badges

### 4. Error Handling
- ✅ Server-side validation matches client-side
- ✅ Graceful handling of edge cases
- ✅ Clear error messages

## Migration Notes

### Breaking Changes
- **None**: This is a relaxation of restrictions, not a tightening
- Existing bookings remain valid
- No database schema changes required

### Deployment Steps
1. Deploy updated edge functions first (backend validation)
2. Deploy frontend changes
3. Monitor for any timezone-related issues
4. Verify Midtrans payment completion rates improve

## Success Metrics

### Expected Improvements
1. **Booking Conversion**: +15-25% (more opportunities to book)
2. **Midtrans Success Rate**: +10-20% (more time to complete payment)
3. **Customer Satisfaction**: Fewer "slot unavailable" complaints
4. **Revenue**: Increased bookings during active sessions

### Monitoring
- Track booking attempts vs completions
- Monitor Midtrans timeout rates
- Collect customer feedback on new flexibility

## References

### Industry Standards
- **Google Calendar**: Allows joining meetings after start time
- **Slack**: Allows booking resources during active usage
- **Notion**: Flexible session management
- **GitHub**: No artificial time buffers for actions

### Related Documents
- `Fix Auto-Refresh Booking Slots.md`
- `Fix Past Time Slot Booking Edge Case.md`
- `Time-Slot-Validation-Strategy.md`
